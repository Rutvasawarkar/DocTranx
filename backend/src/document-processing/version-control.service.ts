import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { StructuredDocument } from './structured-document.service';

/**
 * Manages document version history with persistence to the
 * DocumentVersion table. Supports version creation, rollback,
 * and comparison.
 */
@Injectable()
export class VersionControlService {
  private readonly logger = new Logger(VersionControlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Create a new version snapshot for a document.
   * Stores the structured JSON at the point-in-time and an
   * optional diff snapshot describing what changed.
   */
  async createVersion(
    documentId: string,
    modifiedBy: string,
    structuredDoc?: StructuredDocument,
    diffSnapshot?: Record<string, any>,
    description?: string,
  ): Promise<{ versionId: string; versionNumber: number }> {
    // Determine next version number
    const latest = await this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const nextVersion = (latest?.versionNumber || 0) + 1;

    // Save structured JSON to storage
    const filePath = `documents/${documentId}/versions/v${nextVersion}.json`;
    if (structuredDoc) {
      const jsonBuffer = Buffer.from(
        JSON.stringify(structuredDoc, null, 2),
      );
      await this.storage.uploadFile(filePath, jsonBuffer, 'application/json');
    }

    // Create version record
    const version = await this.prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: nextVersion,
        filePath,
        structuredJson: structuredDoc as any,
        diffSnapshot: diffSnapshot as any,
        modifiedBy,
        description,
      },
    });

    this.logger.log(
      `Created version ${nextVersion} for document ${documentId}`,
    );

    return {
      versionId: version.id,
      versionNumber: version.versionNumber,
    };
  }

  /**
   * Rollback a document to a specific version.
   * Creates a new version with the content of the target version.
   */
  async rollback(
    documentId: string,
    targetVersionId: string,
    userId: string,
  ): Promise<{
    newVersionId: string;
    newVersionNumber: number;
    rolledBackTo: number;
  }> {
    const targetVersion = await this.prisma.documentVersion.findUniqueOrThrow({
      where: { id: targetVersionId },
    });

    // Create a new version with the old content
    const result = await this.createVersion(
      documentId,
      userId,
      targetVersion.structuredJson as unknown as StructuredDocument,
      {
        action: 'rollback',
        rolledBackToVersion: targetVersion.versionNumber,
      },
      `Rolled back to version ${targetVersion.versionNumber}`,
    );

    this.logger.log(
      `Rolled back document ${documentId} to version ${targetVersion.versionNumber}`,
    );

    return {
      newVersionId: result.versionId,
      newVersionNumber: result.versionNumber,
      rolledBackTo: targetVersion.versionNumber,
    };
  }

  /**
   * Compare two versions by returning their structured JSON
   * for client-side diffing.
   */
  async compareVersions(
    version1Id: string,
    version2Id: string,
  ): Promise<{
    version1: { versionNumber: number; structuredJson: any };
    version2: { versionNumber: number; structuredJson: any };
  }> {
    const [v1, v2] = await Promise.all([
      this.prisma.documentVersion.findUniqueOrThrow({
        where: { id: version1Id },
        select: { versionNumber: true, structuredJson: true },
      }),
      this.prisma.documentVersion.findUniqueOrThrow({
        where: { id: version2Id },
        select: { versionNumber: true, structuredJson: true },
      }),
    ]);

    return {
      version1: {
        versionNumber: v1.versionNumber,
        structuredJson: v1.structuredJson,
      },
      version2: {
        versionNumber: v2.versionNumber,
        structuredJson: v2.structuredJson,
      },
    };
  }

  /**
   * Get all versions for a document.
   */
  async getVersionHistory(documentId: string) {
    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        modifiedBy: true,
        description: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get the latest structured JSON for a document.
   */
  async getLatestStructuredDoc(
    documentId: string,
  ): Promise<StructuredDocument | null> {
    const latest = await this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: { structuredJson: true },
    });

    return (latest?.structuredJson as unknown as StructuredDocument) || null;
  }
}
