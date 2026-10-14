import * as mammoth from 'mammoth';
import * as AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

export interface DocxParseResult {
  text: string;
  html: string;
  paragraphs: Array<{
    text: string;
    style?: string;
  }>;
  tables: Array<{
    rows: string[][];
  }>;
  images: Array<{
    name: string;
    buffer: Buffer;
    contentType: string;
  }>;
  metadata: {
    title?: string;
    subject?: string;
    creator?: string;
    description?: string;
    lastModifiedBy?: string;
    revision?: string;
    created?: string;
    modified?: string;
  };
}

/**
 * Parse DOCX documents for structured content extraction.
 * Uses mammoth for HTML/text conversion and adm-zip + fast-xml-parser
 * for deep XML parsing of tables, styles, and images.
 */
export async function parseDocx(buffer: Buffer): Promise<DocxParseResult> {
  // 1. Use mammoth to get HTML and plain text
  const [htmlResult, textResult] = await Promise.all([
    mammoth.convertToHtml({ buffer }),
    mammoth.extractRawText({ buffer }),
  ]);

  // 2. Parse the raw DOCX XML for deeper extraction
  const zip = new AdmZip(buffer);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name: string) => {
      // Force array for elements that can repeat
      return ['w:p', 'w:r', 'w:t', 'w:tbl', 'w:tr', 'w:tc'].includes(name);
    },
  });

  // 3. Extract paragraphs and tables from document.xml
  const paragraphs: DocxParseResult['paragraphs'] = [];
  const tables: DocxParseResult['tables'] = [];

  const documentXml = zip.getEntry('word/document.xml');
  if (documentXml) {
    const xmlContent = documentXml.getData().toString('utf-8');
    const parsed = parser.parse(xmlContent);
    const body = parsed?.['w:document']?.['w:body'];

    if (body) {
      // Extract paragraphs
      const pElements = body['w:p'] || [];
      for (const p of pElements) {
        const para = extractParagraph(p);
        if (para.text.trim()) {
          paragraphs.push(para);
        }
      }

      // Extract tables
      const tblElements = body['w:tbl'] || [];
      for (const tbl of tblElements) {
        const table = extractTable(tbl);
        if (table.rows.length > 0) {
          tables.push(table);
        }
      }
    }
  }

  // 4. Extract embedded images
  const images: DocxParseResult['images'] = [];
  const mediaEntries = zip.getEntries().filter(
    (entry) =>
      entry.entryName.startsWith('word/media/') && !entry.isDirectory,
  );

  for (const entry of mediaEntries) {
    const name = entry.entryName.split('/').pop() || entry.entryName;
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const contentTypeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      emf: 'image/emf',
      wmf: 'image/wmf',
    };

    images.push({
      name,
      buffer: entry.getData(),
      contentType: contentTypeMap[ext] || 'application/octet-stream',
    });
  }

  // 5. Extract metadata from core.xml
  const metadata: DocxParseResult['metadata'] = {};
  const coreXml = zip.getEntry('docProps/core.xml');
  if (coreXml) {
    const coreContent = coreXml.getData().toString('utf-8');
    const coreParsed = parser.parse(coreContent);
    const props = coreParsed?.['cp:coreProperties'] || {};

    metadata.title = props['dc:title'] || undefined;
    metadata.subject = props['dc:subject'] || undefined;
    metadata.creator = props['dc:creator'] || undefined;
    metadata.description = props['dc:description'] || undefined;
    metadata.lastModifiedBy = props['cp:lastModifiedBy'] || undefined;
    metadata.revision = props['cp:revision'] || undefined;
    metadata.created = props['dcterms:created']?.['#text'] || undefined;
    metadata.modified = props['dcterms:modified']?.['#text'] || undefined;
  }

  return {
    text: textResult.value,
    html: htmlResult.value,
    paragraphs,
    tables,
    images,
    metadata,
  };
}

/**
 * Extract text and style from a w:p (paragraph) element.
 */
function extractParagraph(p: any): { text: string; style?: string } {
  let text = '';
  let style: string | undefined;

  // Get paragraph style
  const pPr = p['w:pPr'];
  if (pPr) {
    const pStyle = pPr['w:pStyle'];
    if (pStyle) {
      style = pStyle['@_w:val'] || undefined;
    }
  }

  // Get text runs
  const runs = p['w:r'] || [];
  for (const run of runs) {
    const textElements = run['w:t'] || [];
    for (const t of textElements) {
      if (typeof t === 'string') {
        text += t;
      } else if (t && t['#text'] !== undefined) {
        text += t['#text'];
      }
    }
  }

  return { text, style };
}

/**
 * Extract table data from a w:tbl element.
 */
function extractTable(tbl: any): { rows: string[][] } {
  const rows: string[][] = [];

  const trElements = tbl['w:tr'] || [];
  for (const tr of trElements) {
    const row: string[] = [];

    const tcElements = tr['w:tc'] || [];
    for (const tc of tcElements) {
      let cellText = '';

      const cellParagraphs = tc['w:p'] || [];
      for (const p of cellParagraphs) {
        const runs = p['w:r'] || [];
        for (const run of runs) {
          const textElements = run['w:t'] || [];
          for (const t of textElements) {
            if (typeof t === 'string') {
              cellText += t;
            } else if (t && t['#text'] !== undefined) {
              cellText += t['#text'];
            }
          }
        }
      }

      row.push(cellText.trim());
    }

    rows.push(row);
  }

  return { rows };
}
