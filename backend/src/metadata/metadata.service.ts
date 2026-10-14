import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateMetadataDto } from './dto/update-metadata.dto';

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List documents with filtering, pagination, and sorting.
   */
  async listDocuments(query: QueryDocumentsDto, tenantId: string) {
    const where: Prisma.DocumentWhereInput = {
      tenantId,
      deletedAt: null, // Exclude soft-deleted
    };

    // Apply filters
    if (query.mimeType) {
      where.mimeType = query.mimeType;
    }

    if (query.status) {
      where.status = query.status as Prisma.EnumDocumentStatusFilter;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.createdAt.lte = new Date(query.dateTo);
      }
    }

    if (query.search) {
      where.OR = [
        { fileName: { contains: query.search, mode: 'insensitive' } },
        {
          metadata: {
            some: {
              value: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    if (query.tag) {
      where.metadata = {
        some: {
          key: 'tags',
          value: { contains: query.tag, mode: 'insensitive' },
        },
      };
    }

    // Build sort
    const orderBy: Prisma.DocumentOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'createdAt';
    if (['createdAt', 'updatedAt', 'fileName', 'mimeType', 'sizeBytes', 'status'].includes(sortField)) {
      (orderBy as Record<string, string>)[sortField] = query.sortOrder || 'desc';
    } else {
      orderBy.createdAt = query.sortOrder || 'desc';
    }

    // Execute query with count
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.take,
        include: {
          metadata: true,
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        sizeBytes: Number(doc.sizeBytes),
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        metadata: doc.metadata.reduce(
          (acc, m) => {
            acc[m.key] = m.value;
            return acc;
          },
          {} as Record<string, string>,
        ),
      })),
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        total,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  /**
   * Get a single document with all metadata.
   */
  async getDocument(documentId: string, tenantId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        deletedAt: null,
      },
      include: {
        metadata: true,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    return {
      id: document.id,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: Number(document.sizeBytes),
      checksum: document.checksum,
      filePath: document.filePath,
      status: document.status,
      uploadedBy: document.uploadedBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      metadata: document.metadata.reduce(
        (acc, m) => {
          acc[m.key] = m.value;
          return acc;
        },
        {} as Record<string, string>,
      ),
    };
  }

  /**
   * Update (upsert) metadata key-value pairs for a document.
   */
  async updateMetadata(
    documentId: string,
    dto: UpdateMetadataDto,
    tenantId: string,
    userId: string,
  ) {
    // Verify document exists and belongs to tenant
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    // Upsert each metadata entry
    const results = await Promise.all(
      dto.entries.map((entry) =>
        this.prisma.documentMetadata.upsert({
          where: {
            documentId_key: {
              documentId,
              key: entry.key,
            },
          },
          update: { value: entry.value },
          create: {
            documentId,
            key: entry.key,
            value: entry.value,
          },
        }),
      ),
    );

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'document.metadata.updated',
        userId,
        documentId,
        tenantId,
        details: { updatedKeys: dto.entries.map((e) => e.key) },
      },
    });

    this.logger.log(
      `Metadata updated for doc=${documentId}: ${results.length} entries`,
    );

    return {
      documentId,
      updatedEntries: results.length,
      metadata: results.reduce(
        (acc, m) => {
          acc[m.key] = m.value;
          return acc;
        },
        {} as Record<string, string>,
      ),
    };
  }

  /**
   * Soft-delete a document.
   */
  async deleteDocument(documentId: string, tenantId: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'document.deleted',
        userId,
        documentId,
        tenantId,
      },
    });

    this.logger.log(`Document soft-deleted: ${documentId}`);

    return { id: documentId, status: 'DELETED' };
  }
}
