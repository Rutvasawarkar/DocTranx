import { Injectable, Logger } from '@nestjs/common';

export interface DetectedTable {
  headers: string[];
  rows: string[][];
  rowCount: number;
  colCount: number;
}

/**
 * Detects and extracts tabular structures from document content.
 * Supports structured extraction from DOCX XML tables and
 * heuristic detection from plain text (PDF).
 */
@Injectable()
export class TableDetectionService {
  private readonly logger = new Logger(TableDetectionService.name);

  /**
   * Extract tables from already-parsed DOCX table data.
   * Takes the raw rows from the DOCX XML parser and structures them
   * with proper header detection.
   */
  extractFromDocxRows(
    tables: Array<{ rows: string[][] }>,
  ): DetectedTable[] {
    return tables.map((table) => {
      const rows = table.rows;
      if (rows.length === 0) {
        return { headers: [], rows: [], rowCount: 0, colCount: 0 };
      }

      // First row is treated as headers
      const headers = rows[0];
      const dataRows = rows.slice(1);

      return {
        headers,
        rows: dataRows,
        rowCount: dataRows.length,
        colCount: headers.length,
      };
    });
  }

  /**
   * Detect tables from plain text content using heuristics.
   * Looks for patterns of consistent delimiters (pipes, tabs)
   * or aligned columns across multiple lines.
   */
  detectFromText(text: string): DetectedTable[] {
    const tables: DetectedTable[] = [];

    // Strategy 1: Pipe-delimited tables (Markdown-style)
    const pipeTable = this.detectPipeDelimitedTable(text);
    if (pipeTable.length > 0) {
      tables.push(...pipeTable);
    }

    // Strategy 2: Tab-delimited tables
    const tabTable = this.detectTabDelimitedTable(text);
    if (tabTable.length > 0) {
      tables.push(...tabTable);
    }

    this.logger.log(`Detected ${tables.length} tables from text`);
    return tables;
  }

  /**
   * Detect pipe-delimited tables (|col1|col2|col3|).
   */
  private detectPipeDelimitedTable(text: string): DetectedTable[] {
    const tables: DetectedTable[] = [];
    const lines = text.split('\n');
    let tableRows: string[][] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes('|') && trimmed.split('|').length >= 3) {
        // Skip separator lines (e.g., |---|---|---|)
        if (/^\|?[\s\-:]+(\|[\s\-:]+)+\|?$/.test(trimmed)) {
          continue;
        }

        const cells = trimmed
          .split('|')
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        if (cells.length >= 2) {
          tableRows.push(cells);
        }
      } else {
        // End of potential table
        if (tableRows.length >= 2) {
          tables.push(this.buildTable(tableRows));
        }
        tableRows = [];
      }
    }

    // Handle table at end of text
    if (tableRows.length >= 2) {
      tables.push(this.buildTable(tableRows));
    }

    return tables;
  }

  /**
   * Detect tab-delimited tables.
   */
  private detectTabDelimitedTable(text: string): DetectedTable[] {
    const tables: DetectedTable[] = [];
    const lines = text.split('\n');
    let tableRows: string[][] = [];
    let expectedCols = 0;

    for (const line of lines) {
      if (line.includes('\t')) {
        const cells = line.split('\t').map((c) => c.trim());

        if (expectedCols === 0) {
          expectedCols = cells.length;
        }

        // Allow some column count variation
        if (
          cells.length >= 2 &&
          Math.abs(cells.length - expectedCols) <= 1
        ) {
          tableRows.push(cells);
        } else {
          if (tableRows.length >= 2) {
            tables.push(this.buildTable(tableRows));
          }
          tableRows = [];
          expectedCols = 0;
        }
      } else {
        if (tableRows.length >= 2) {
          tables.push(this.buildTable(tableRows));
        }
        tableRows = [];
        expectedCols = 0;
      }
    }

    if (tableRows.length >= 2) {
      tables.push(this.buildTable(tableRows));
    }

    return tables;
  }

  /**
   * Build a DetectedTable from raw rows.
   */
  private buildTable(rows: string[][]): DetectedTable {
    const headers = rows[0];
    const dataRows = rows.slice(1);

    return {
      headers,
      rows: dataRows,
      rowCount: dataRows.length,
      colCount: headers.length,
    };
  }
}
