import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EventsService } from '../events/events.service';
import { EventTopics } from '../events/event-topics';
import {
  IDocProcessingClient,
  DOC_PROCESSING_CLIENT,
} from '../integrations/interfaces/doc-processing.client';
import { RequestExportDto } from './dto/request-export.dto';
import { ExportFormat, ExportStatus } from '@prisma/client';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: EventsService,
    @Inject(DOC_PROCESSING_CLIENT)
    private readonly docProcessing: IDocProcessingClient,
  ) {}

  /**
   * Request an export of a document.
   * 1. Validate document exists
   * 2. Create export job record
   * 3. Call Document Processing service for reconstruction
   * 4. Generate signed download URL
   * 5. Update export job with results
   * 6. Publish event
   */
  async requestExport(
    documentId: string,
    dto: RequestExportDto,
    userId: string,
    tenantId: string,
  ) {
    this.logger.log(
      `Export requested: doc=${documentId} format=${dto.targetFormat}`,
    );

    // Validate document
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    // Create export job
    const exportJob = await this.prisma.exportJob.create({
      data: {
        documentId,
        format: dto.targetFormat as ExportFormat,
        status: 'PENDING',
        watermark: dto.watermark || false,
        requestedBy: userId,
      },
    });

    // Publish export requested event
    await this.events.publish(EventTopics.DOC_EXPORT_REQUESTED, documentId, {
      documentId,
      exportJobId: exportJob.id,
      targetFormat: dto.targetFormat,
      requestedBy: userId,
    });

    // Call Document Processing for reconstruction
    try {
      // Update status to processing
      await this.prisma.exportJob.update({
        where: { id: exportJob.id },
        data: { status: 'PROCESSING' },
      });

      const result = await this.docProcessing.reconstruct(
        documentId,
        dto.targetFormat,
        {
          resolution: dto.resolution as 'screen' | 'print' | 'archive' | undefined,
          watermark: dto.watermark,
          password: dto.password,
        },
      );

      // Generate signed download URL (24-hour TTL)
      const ttlSeconds = 24 * 60 * 60;
      const downloadUrl = await this.storage.getDownloadPath(
        result.outputFilePath,
        ttlSeconds,
      );

      const urlExpiresAt = new Date(Date.now() + ttlSeconds * 1000);

      // Update export job with success
      const updatedJob = await this.prisma.exportJob.update({
        where: { id: exportJob.id },
        data: {
          status: 'COMPLETED',
          outputFilePath: result.outputFilePath,
          downloadUrl,
          urlExpiresAt,
          completedAt: new Date(),
        },
      });

      // Update document status
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'EXPORTED' },
      });

      // Audit log
      await this.prisma.auditLog.create({
        data: {
          action: 'document.exported',
          userId,
          documentId,
          tenantId,
          details: {
            exportJobId: exportJob.id,
            format: dto.targetFormat,
            fidelityScore: result.fidelityScore,
          },
        },
      });

      // Publish export completed event
      await this.events.publish(EventTopics.DOC_EXPORTED, documentId, {
        documentId,
        exportJobId: exportJob.id,
        outputFilePath: result.outputFilePath,
        format: dto.targetFormat,
        fidelityScore: result.fidelityScore,
      });

      this.logger.log(`Export completed: jobId=${exportJob.id}`);

      return {
        id: updatedJob.id,
        documentId,
        format: updatedJob.format,
        status: updatedJob.status,
        downloadUrl: updatedJob.downloadUrl,
        urlExpiresAt: updatedJob.urlExpiresAt,
        createdAt: updatedJob.createdAt,
        completedAt: updatedJob.completedAt,
      };
    } catch (error) {
      // Update export job with failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.exportJob.update({
        where: { id: exportJob.id },
        data: {
          status: 'FAILED',
          errorMessage,
        },
      });

      this.logger.error(
        `Export failed: jobId=${exportJob.id} error=${errorMessage}`,
      );

      return {
        id: exportJob.id,
        documentId,
        format: exportJob.format,
        status: 'FAILED' as ExportStatus,
        errorMessage,
        createdAt: exportJob.createdAt,
      };
    }
  }

  /**
   * Get export job status and download URL.
   */
  async getExportStatus(exportId: string) {
    const exportJob = await this.prisma.exportJob.findUnique({
      where: { id: exportId },
      include: {
        document: {
          select: { id: true, fileName: true },
        },
      },
    });

    if (!exportJob) {
      throw new NotFoundException(`Export job not found: ${exportId}`);
    }

    // Check if download URL has expired and regenerate if needed
    if (
      exportJob.status === 'COMPLETED' &&
      exportJob.outputFilePath &&
      exportJob.urlExpiresAt &&
      exportJob.urlExpiresAt < new Date()
    ) {
      const ttlSeconds = 24 * 60 * 60;
      const newUrl = await this.storage.getDownloadPath(
        exportJob.outputFilePath,
        ttlSeconds,
      );
      const newExpiresAt = new Date(Date.now() + ttlSeconds * 1000);

      await this.prisma.exportJob.update({
        where: { id: exportId },
        data: {
          downloadUrl: newUrl,
          urlExpiresAt: newExpiresAt,
        },
      });

      return {
        id: exportJob.id,
        documentId: exportJob.documentId,
        documentName: exportJob.document.fileName,
        format: exportJob.format,
        status: exportJob.status,
        downloadUrl: newUrl,
        urlExpiresAt: newExpiresAt,
        createdAt: exportJob.createdAt,
        completedAt: exportJob.completedAt,
      };
    }

    return {
      id: exportJob.id,
      documentId: exportJob.documentId,
      documentName: exportJob.document.fileName,
      format: exportJob.format,
      status: exportJob.status,
      downloadUrl: exportJob.downloadUrl,
      urlExpiresAt: exportJob.urlExpiresAt,
      errorMessage: exportJob.errorMessage,
      createdAt: exportJob.createdAt,
      completedAt: exportJob.completedAt,
    };
  }
}
