// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

export interface PdfParseResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modDate?: string;
  };
  pages: Array<{
    pageNumber: number;
    text: string;
  }>;
}

/**
 * Parse PDF documents and extract structured content.
 * Uses pdf-parse for text extraction and metadata.
 */
export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  const data = await pdfParse(buffer);

  // Extract per-page text by splitting on form feed characters
  // pdf-parse separates pages with form feed (\f) by default
  const rawPages = data.text.split('\f').filter((p: string) => p.trim().length > 0);

  const pages = rawPages.map((text: string, index: number) => ({
    pageNumber: index + 1,
    text: text.trim(),
  }));

  // Extract metadata from the PDF info object
  const info = data.info || {};

  return {
    text: data.text,
    pageCount: data.numpages,
    metadata: {
      title: info.Title || undefined,
      author: info.Author || undefined,
      subject: info.Subject || undefined,
      creator: info.Creator || undefined,
      producer: info.Producer || undefined,
      creationDate: info.CreationDate || undefined,
      modDate: info.ModDate || undefined,
    },
    pages,
  };
}
