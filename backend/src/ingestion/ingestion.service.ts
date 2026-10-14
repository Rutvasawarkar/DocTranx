import {
  Injectable,
  Logger,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EventsService } from '../events/events.service';
import { EventTopics } from '../events/event-topics';
import { UploadDocumentDto } from './dto/upload-document.dto';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MIME_TYPE_LABELS,
} from './constants/allowed-mime-types';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: EventsService,
  ) {}

  /**
   * Process an uploaded document:
   * 1. Validate MIME type and file size
   * 2. Compute SHA-256 checksum
   * 3. Upload to S3/MinIO
   * 4. Create document record in DB
   * 5. Create initial metadata entries
   * 6. Publish doc.ingested event
   */
  async ingestDocument(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    userId: string,
    tenantId: string,
  ) {
    this.logger.log(
      `Ingesting document: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`,
    );

    // ── 1. Validate ─────────────────────────────────────────
    this.validateFile(file);

    // ── 2. Compute checksum ─────────────────────────────────
    const checksum = this.computeChecksum(file.buffer);
    this.logger.debug(`Checksum: ${checksum}`);

    // ── 3. Upload to local storage ────────────────────────
    const documentId = uuidv4();
    const fileExtension = this.getFileExtension(file.originalname);
    const filePath = `uploads/${tenantId}/${documentId}/${file.originalname}`;

    await this.storage.uploadFile(filePath, file.buffer, file.mimetype, {
      'x-document-id': documentId,
      'x-tenant-id': tenantId,
      'x-checksum': checksum,
    });

    // ── 4. Create document record ───────────────────────────
    const document = await this.prisma.document.create({
      data: {
        id: documentId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        checksum,
        filePath,
        status: 'UPLOADED',
        tenantId,
        uploadedBy: userId,
      },
    });

    // ── 5. Create initial metadata ──────────────────────────
    const metadataEntries: Array<{ documentId: string; key: string; value: string }> = [];

    if (dto.title) {
      metadataEntries.push({ documentId, key: 'title', value: dto.title });
    }
    if (dto.description) {
      metadataEntries.push({ documentId, key: 'description', value: dto.description });
    }
    if (dto.tags && dto.tags.length > 0) {
      metadataEntries.push({ documentId, key: 'tags', value: JSON.stringify(dto.tags) });
    }

    // Always store format label
    const formatLabel = MIME_TYPE_LABELS[file.mimetype] || 'UNKNOWN';
    metadataEntries.push({ documentId, key: 'format', value: formatLabel });

    if (metadataEntries.length > 0) {
      await this.prisma.documentMetadata.createMany({
        data: metadataEntries,
      });
    }

    // ── 6. Create audit log entry ───────────────────────────
    await this.prisma.auditLog.create({
      data: {
        action: 'document.uploaded',
        userId,
        documentId,
        tenantId,
        details: {
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          checksum,
        },
      },
    });

    // ── 7. Publish event ────────────────────────────────────
    await this.events.publish(EventTopics.DOC_INGESTED, documentId, {
      documentId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      filePath,
      tenantId,
      uploadedBy: userId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Document ingested successfully: ${documentId}`);

    return {
      id: document.id,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: Number(document.sizeBytes),
      checksum: document.checksum,
      status: document.status,
      format: formatLabel,
      createdAt: document.createdAt,
    };
  }

  /**
   * Get the processing status of a document.
   */
  async getDocumentStatus(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        fileName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!document) {
      throw new BadRequestException(`Document not found: ${documentId}`);
    }

    return document;
  }

  // ── Private helpers ─────────────────────────────────────────

  private validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. ` +
          `Supported types: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        `File size ${file.size} bytes exceeds maximum of ${MAX_FILE_SIZE_BYTES} bytes (500MB)`,
      );
    }
  }

  private computeChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }
}
