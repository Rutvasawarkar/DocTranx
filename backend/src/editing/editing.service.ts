import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { EventTopics } from '../events/event-topics';
import {
  IVersionControlClient,
  VERSION_CONTROL_CLIENT,
} from '../integrations/interfaces/version-control.client';
import { ApplyEditDto } from './dto/apply-edit.dto';
import { EditType } from '@prisma/client';

@Injectable()
export class EditingService {
  private readonly logger = new Logger(EditingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    @Inject(VERSION_CONTROL_CLIENT)
    private readonly versionControl: IVersionControlClient,
  ) {}

  /**
   * Apply an edit to a document.
   * 1. Validate the document exists
   * 2. Create edit record with diff payload
   * 3. Create version snapshot via Version Control service
   * 4. Publish edit event
   */
  async applyEdit(
    documentId: string,
    dto: ApplyEditDto,
    userId: string,
    tenantId: string,
  ) {
    this.logger.log(
      `Applying ${dto.editType} edit to document ${documentId}`,
    );

    // Validate document exists
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    // Create version snapshot
    const { versionId } = await this.versionControl.createSnapshot(
      documentId,
      'editing',
      {
        editType: dto.editType,
        diffPayload: dto.diffPayload,
        editedBy: userId,
      },
    );

    // Create edit record
    const edit = await this.prisma.documentEdit.create({
      data: {
        documentId,
        editType: dto.editType as EditType,
        diffPayload: dto.diffPayload as unknown as import('@prisma/client').Prisma.InputJsonValue,
        description: dto.description,
        editedBy: userId,
        versionId,
      },
    });

    // Update document status if needed
    if (document.status === 'READY' || document.status === 'UPLOADED') {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'READY' },
      });
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'document.edited',
        userId,
        documentId,
        tenantId,
        details: {
          editType: dto.editType,
          editId: edit.id,
          versionId,
          description: dto.description,
        },
      },
    });

    // Publish event
    await this.events.publish(EventTopics.DOC_EDIT_APPLIED, documentId, {
      documentId,
      editId: edit.id,
      editType: dto.editType,
      versionId,
      editedBy: userId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Edit applied: editId=${edit.id} versionId=${versionId}`);

    return {
      id: edit.id,
      documentId,
      editType: edit.editType,
      description: edit.description,
      versionId: edit.versionId,
      createdAt: edit.createdAt,
    };
  }

  /**
   * List edit history for a document.
   */
  async listEdits(documentId: string, tenantId: string) {
    // Verify document belongs to tenant
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    const edits = await this.prisma.documentEdit.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        editType: true,
        description: true,
        editedBy: true,
        versionId: true,
        createdAt: true,
      },
    });

    return {
      documentId,
      totalEdits: edits.length,
      edits,
    };
  }

  /**
   * Undo the last edit by rolling back to the previous version.
   */
  async undoLastEdit(documentId: string, userId: string, tenantId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    // Get the last two edits
    const lastEdits = await this.prisma.documentEdit.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    if (lastEdits.length === 0) {
      throw new NotFoundException('No edits to undo');
    }

    const lastEdit = lastEdits[0];

    // Rollback via Version Control
    let rollbackVersionId: string | undefined;
    if (lastEdits.length > 1 && lastEdits[1].versionId) {
      const { newVersionId } = await this.versionControl.rollback(
        documentId,
        lastEdits[1].versionId,
      );
      rollbackVersionId = newVersionId;
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'document.edit.undone',
        userId,
        documentId,
        tenantId,
        details: {
          undoneEditId: lastEdit.id,
          rollbackVersionId,
        },
      },
    });

    this.logger.log(
      `Undo: removed edit ${lastEdit.id} from document ${documentId}`,
    );

    return {
      undoneEditId: lastEdit.id,
      rollbackVersionId,
      message: 'Last edit undone successfully',
    };
  }
}
