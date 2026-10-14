import * as AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

export interface PptxSlide {
  slideNumber: number;
  text: string;
  notes?: string;
}

export interface PptxParseResult {
  text: string;
  slides: PptxSlide[];
  slideCount: number;
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
 * Parse PPTX documents by unzipping and parsing slide XML.
 * Extracts text from all slides, speaker notes, embedded images,
 * and core metadata.
 */
export async function parsePptx(buffer: Buffer): Promise<PptxParseResult> {
  const zip = new AdmZip(buffer);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name: string) => {
      return ['a:p', 'a:r', 'a:t', 'p:sp', 'p:txBody'].includes(name);
    },
  });

  // 1. Find all slide entries and sort them by number
  const slideEntries = zip
    .getEntries()
    .filter(
      (entry) =>
        /^ppt\/slides\/slide\d+\.xml$/.test(entry.entryName),
    )
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] || '0');
      const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] || '0');
      return numA - numB;
    });

  // 2. Parse each slide for text
  const slides: PptxSlide[] = [];
  const allText: string[] = [];

  for (let i = 0; i < slideEntries.length; i++) {
    const entry = slideEntries[i];
    const slideNum = i + 1;
    const xmlContent = entry.getData().toString('utf-8');
    const parsed = parser.parse(xmlContent);

    const slideText = extractTextFromSlide(parsed);
    allText.push(slideText);

    // Try to find speaker notes
    const noteEntry = zip.getEntry(
      `ppt/notesSlides/notesSlide${slideNum}.xml`,
    );
    let notes: string | undefined;
    if (noteEntry) {
      const noteXml = noteEntry.getData().toString('utf-8');
      const noteParsed = parser.parse(noteXml);
      notes = extractTextFromSlide(noteParsed);
    }

    slides.push({
      slideNumber: slideNum,
      text: slideText,
      notes: notes || undefined,
    });
  }

  // 3. Extract embedded images
  const images: PptxParseResult['images'] = [];
  const mediaEntries = zip.getEntries().filter(
    (entry) =>
      entry.entryName.startsWith('ppt/media/') && !entry.isDirectory,
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

  // 4. Extract metadata from docProps/core.xml
  const metadata: PptxParseResult['metadata'] = {};
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
    text: allText.join('\n\n'),
    slides,
    slideCount: slides.length,
    images,
    metadata,
  };
}

/**
 * Recursively extract text from a parsed slide XML structure.
 * Walks through shape trees to find <a:t> text elements.
 */
function extractTextFromSlide(obj: any): string {
  const textParts: string[] = [];

  function walk(node: any): void {
    if (node === null || node === undefined) return;

    if (typeof node === 'string') {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }

    if (typeof node === 'object') {
      // Found a text element
      if ('a:t' in node) {
        const t = node['a:t'];
        if (typeof t === 'string') {
          textParts.push(t);
        } else if (Array.isArray(t)) {
          for (const item of t) {
            if (typeof item === 'string') textParts.push(item);
            else if (item?.['#text']) textParts.push(item['#text']);
          }
        } else if (t?.['#text']) {
          textParts.push(t['#text']);
        }
      }

      // Found a paragraph boundary — add newline
      if ('a:p' in node) {
        const paras = Array.isArray(node['a:p'])
          ? node['a:p']
          : [node['a:p']];
        for (const p of paras) {
          walk(p);
          textParts.push('\n');
        }
      }

      // Walk all child nodes
      for (const key of Object.keys(node)) {
        if (key === 'a:t' || key === 'a:p') continue;
        walk(node[key]);
      }
    }
  }

  walk(obj);
  return textParts.join('').trim();
}
