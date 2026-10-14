import { Injectable, Logger } from '@nestjs/common';
import {
  StructuredDocument,
  StructuredSection,
} from './structured-document.service';
import { DetectedTable } from './table-detection.service';

export interface EditOperation {
  type:
    | 'replace-text'
    | 'edit-section'
    | 'delete-section'
    | 'add-section'
    | 'reorder-sections'
    | 'edit-table-cell'
    | 'add-table-row'
    | 'delete-table-row'
    | 'replace-image';
  payload: Record<string, any>;
}

/**
 * Applies structured editing operations on the intermediate
 * JSON document representation.
 */
@Injectable()
export class DocumentEditingService {
  private readonly logger = new Logger(DocumentEditingService.name);

  /**
   * Apply an edit operation to a structured document.
   * Returns the modified document and a diff describing the change.
   */
  applyEdit(
    doc: StructuredDocument,
    operation: EditOperation,
  ): {
    document: StructuredDocument;
    diff: Record<string, any>;
  } {
    this.logger.log(
      `Applying ${operation.type} edit to document ${doc.documentId}`,
    );

    // Deep clone to avoid mutation
    const updated: StructuredDocument = JSON.parse(JSON.stringify(doc));

    let diff: Record<string, any> = {
      operation: operation.type,
      timestamp: new Date().toISOString(),
    };

    switch (operation.type) {
      case 'replace-text':
        diff = this.applyReplaceText(updated, operation.payload);
        break;

      case 'edit-section':
        diff = this.applyEditSection(updated, operation.payload);
        break;

      case 'delete-section':
        diff = this.applyDeleteSection(updated, operation.payload);
        break;

      case 'add-section':
        diff = this.applyAddSection(updated, operation.payload);
        break;

      case 'reorder-sections':
        diff = this.applyReorderSections(updated, operation.payload);
        break;

      case 'edit-table-cell':
        diff = this.applyEditTableCell(updated, operation.payload);
        break;

      case 'add-table-row':
        diff = this.applyAddTableRow(updated, operation.payload);
        break;

      case 'delete-table-row':
        diff = this.applyDeleteTableRow(updated, operation.payload);
        break;

      default:
        this.logger.warn(`Unknown operation type: ${operation.type}`);
    }

    return { document: updated, diff };
  }

  /**
   * Find and replace text across all sections.
   */
  private applyReplaceText(
    doc: StructuredDocument,
    payload: Record<string, any>,
  ): Record<string, any> {
    const { searchText, replaceText } = payload;
    let replacements = 0;

    for (const section of doc.sections) {
      if (section.content.includes(searchText)) {
        section.content = section.content.replaceAll(
          searchText,
          replaceText,
        );
        replacements++;
      }
    }

    return {
      operation: 'replace-text',
      searchText,
      replaceText,
      replacements,
    };
  }

  /**
   * Edit a specific section by ID.
   */
  private applyEditSection(
    doc: StructuredDocument,
    payload: Record<string, any>,
  ): Record<string, any> {
    const { sectionId, content, style, level } = payload;

    const section = doc.sections.find((s) => s.id === sectionId);
    if (!section) {
      return { operation: 'edit-section', error: 'Section not found' };
    }

    const before = { ...section };

    if (content !== undefined) section.content = content;
    if (style !== undefined) section.style = style;
    if (level !== undefined) section.level = level;

    return {
      operation: 'edit-section',
      sectionId,
      before: { content: before.content, style: before.style },
      after: { content: section.content, style: section.style },
    };
  }

  /**
   * Delete a section by ID.
   */
  private applyDeleteSection(
    doc: StructuredDocument,
    payload: Record<string, any>,
  ): Record<string, any> {
    const { sectionId } = payload;
    const index = doc.sections.findIndex((s) => s.id === sectionId);

    if (index === -1) {
      return { operation: 'delete-section', error: 'Section not found' };
    }

    const deleted = doc.sections.splice(index, 1)[0];
    return {
      operation: 'delete-section',
      sectionId,
      deletedContent: deleted.content,
      deletedAt: index,
    };
  }

  /**
   * Add a new section at a specific position.
   */
  private applyAddSection(
    doc: StructuredDocument,
    payload: Record<string, any>,
  ): Record<string, any> {
    const { type, content, style, level, afterSectionId } = payload;

    const newSection: StructuredSection = {
      id: `sec-${Date.now()}`,
      type: type || 'paragraph',
      content: content || '',
      style,
      level,
    };

    if (afterSectionId) {
      const index = doc.sections.findIndex(
        (s) => s.id === afterSectionId,
      );
      if (index !== -1) {
        doc.sections.splice(index + 1, 0, newSection);
      } else {
        doc.sections.push(newSection);
      }
    } else {
      doc.sections.push(newSection);
    }

    return {
      operation: 'add-section',
      newSectionId: newSection.id,
      type: newSection.type,
    };
  }

  /**
   * Reorder sections by providing a new order of section IDs.
   */
  private applyReorderSections(
    doc: StructuredDocument,
    payload: Record<string, any>,
  ): Record<string, any> {
    const { sectionIds } = payload;

    if (!Array.isArray(sectionIds)) {
      return { operation: 'reorder-sections', error: 'Invalid section IDs' };
    }

    const sectionMap = new Map(doc.sections.map((s) => [s.id, s]));
    const reordered: StructuredSection[] = [];

    for (const id of sectionIds) {
      const section = sectionMap.get(id);
      if (section) {
        reordered.push(section);
        sectionMap.delete(id);
      }
    }

    // Append any sections not in the reorder list
    for (const remaining of sectionMap.values()) {
      reordered.push(remaining);
    }

    doc.sections = reordered;
    return { operation: 'reorder-sections', newOrder: sectionIds };
  }

  /**
   * Edit a table cell value.
   */
  private applyEditTableCell(
    doc: StructuredDocument,
    payload: Record<string, any>,
  ): Record<string, any> {
    const { tableIndex, rowIndex, colIndex, value } = payload;

    if (
      tableIndex < 0 ||
      tableIndex >= doc.tables.length
    ) {
      return { operation: 'edit-table-cell', error: 'Table not found' };
    }

    const table = doc.tables[tableIndex];
    const targetRow =
      rowIndex === -1 ? table.headers : table.rows[rowIndex];

    if (!targetRow || colIndex >= targetRow.length) {
      return {
        operation: 'edit-table-cell',
        error: 'Cell not found',
      };
    }

    const before = targetRow[colIndex];
    targetRow[colIndex] = value;

    return {
      operation: 'edit-table-cell',
      tableIndex,
      rowIndex,
      colIndex,
      before,
      after: value,
    };
  }

  /**
   * Add a row to a table.
   */
  private applyAddTableRow(
    doc: StructuredDocument,
    payload: Record<string, any>,
  ): Record<string, any> {
    const { tableIndex, rowData } = payload;

    if (tableIndex >= doc.tables.length) {
      return { operation: 'add-table-row', error: 'Table not found' };
    }

    const table = doc.tables[tableIndex];
    table.rows.push(rowData);
    table.rowCount = table.rows.length;

    return {
      operation: 'add-table-row',
      tableIndex,
      newRowIndex: table.rows.length - 1,
    };
  }

  /**
   * Delete a row from a table.
   */
  private applyDeleteTableRow(
    doc: StructuredDocument,
    payload: Record<string, any>,
  ): Record<string, any> {
    const { tableIndex, rowIndex } = payload;

    if (tableIndex >= doc.tables.length) {
      return { operation: 'delete-table-row', error: 'Table not found' };
    }

    const table = doc.tables[tableIndex];
    if (rowIndex >= table.rows.length) {
      return { operation: 'delete-table-row', error: 'Row not found' };
    }

    const deleted = table.rows.splice(rowIndex, 1)[0];
    table.rowCount = table.rows.length;

    return {
      operation: 'delete-table-row',
      tableIndex,
      rowIndex,
      deletedRow: deleted,
    };
  }
}
