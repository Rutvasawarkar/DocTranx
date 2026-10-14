import { Injectable, Logger } from '@nestjs/common';

import { FormatDetectionService } from './format-detection.service';
import { OcrService } from './ocr.service';
import { TableDetectionService } from './table-detection.service';
import { ImageExtractionService } from './image-extraction.service';
import { DocumentAnalysisService } from './document-analysis.service';
import {
  StructuredDocumentService,
  StructuredDocument,
} from './structured-document.service';
import { StorageService } from '../storage/storage.service';

import { parsePdf, PdfParseResult } from './parsers/pdf.parser';
import { parseDocx, DocxParseResult } from './parsers/docx.parser';
import { parsePptx, PptxParseResult } from './parsers/pptx.parser';

/**
 * Orchestrates the full document processing pipeline:
 * Format Detection → Parsing → OCR (if needed) → Table Detection
 * → Image Extraction → Analysis → Structured Document
 */
@Injectable()
export class DocumentProcessingService {
  private readonly logger = new Logger(DocumentProcessingService.name);

  constructor(
    private readonly formatDetection: FormatDetectionService,
    private readonly ocr: OcrService,
    private readonly tableDetection: TableDetectionService,
    private readonly imageExtraction: ImageExtractionService,
    private readonly analysis: DocumentAnalysisService,
    private readonly structuredDoc: StructuredDocumentService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Process a document through the full extraction pipeline.
   * Returns the structured document JSON representation.
   */
  async processDocument(
    documentId: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<{
    documentId: string;
    mimeType: string;
    format: string;
    status: string;
    structuredDocument: StructuredDocument;
    processedAt: Date;
  }> {
    this.logger.log(
      `Processing document ${documentId} (${mimeType}, ${buffer.length} bytes)`,
    );

    // ── 1. Format Detection ──────────────────────────────────
    const format = this.formatDetection.detect(buffer, mimeType);
    this.logger.log(`Detected format: ${format}`);

    // ── 2. Parse document by format ──────────────────────────
    let parseResult: PdfParseResult | DocxParseResult | PptxParseResult;
    let text = '';
    let paragraphs: Array<{ text: string; style?: string }> = [];
    let rawTables: Array<{ rows: string[][] }> = [];
    let rawImages: Array<{ name: string; buffer: Buffer; contentType: string }> = [];
    let metadata: Record<string, any> = {};
    let pageCount: number | undefined;
    let slides: Array<{ slideNumber: number; text: string; notes?: string }> | undefined;

    switch (format) {
      case 'PDF': {
        const pdfResult = await parsePdf(buffer);
        text = pdfResult.text;
        metadata = pdfResult.metadata;
        pageCount = pdfResult.pageCount;

        // Split text into paragraphs
        paragraphs = pdfResult.pages.map((page) => ({
          text: page.text,
          style: undefined,
        }));

        // Check if scanned PDF → run OCR
        if (this.formatDetection.isLikelyScannedPdf(text, pdfResult.pageCount)) {
          this.logger.log('Scanned PDF detected — running OCR');
          const ocrResult = await this.ocr.extractTextFromImage(buffer);
          text = ocrResult.text;
          paragraphs = [{ text: ocrResult.text }];
        }

        // Detect tables from text
        const pdfTables = this.tableDetection.detectFromText(text);
        rawTables = pdfTables.map((t) => ({
          rows: [t.headers, ...t.rows],
        }));
        break;
      }

      case 'DOCX': {
        const docxResult = await parseDocx(buffer);
        text = docxResult.text;
        paragraphs = docxResult.paragraphs;
        rawTables = docxResult.tables;
        rawImages = docxResult.images;
        metadata = docxResult.metadata;
        break;
      }

      case 'PPTX': {
        const pptxResult = await parsePptx(buffer);
        text = pptxResult.text;
        slides = pptxResult.slides;
        rawImages = pptxResult.images;
        metadata = pptxResult.metadata;
        pageCount = pptxResult.slideCount;
        break;
      }

      default:
        this.logger.warn(`Unsupported format: ${format}`);
        text = 'Unsupported document type';
    }

    // ── 3. Table Detection ───────────────────────────────────
    const detectedTables = rawTables.length > 0
      ? this.tableDetection.extractFromDocxRows(rawTables)
      : this.tableDetection.detectFromText(text);

    // ── 4. Image Extraction ──────────────────────────────────
    const extractedImages = await this.imageExtraction.saveExtractedImages(
      documentId,
      rawImages,
    );

    // ── 5. Content Analysis ──────────────────────────────────
    const analysisResult = await this.analysis.analyzeDocument({
      text,
      paragraphs,
    });

    // ── 6. Build Structured Document ─────────────────────────
    const structuredDocument = await this.structuredDoc.buildStructure(
      documentId,
      format,
      {
        text,
        paragraphs,
        tables: detectedTables,
        images: extractedImages,
        slides,
        metadata,
        analysis: analysisResult,
        pageCount,
      },
    );

    // ── 7. Persist structured JSON to storage ────────────────
    const jsonPath = `documents/${documentId}/structured.json`;
    const jsonBuffer = Buffer.from(
      JSON.stringify(structuredDocument, null, 2),
    );
    await this.storage.uploadFile(jsonPath, jsonBuffer, 'application/json');

    this.logger.log(
      `Document ${documentId} processed successfully: ` +
        `${structuredDocument.sections.length} sections, ` +
        `${detectedTables.length} tables, ` +
        `${extractedImages.length} images`,
    );

    return {
      documentId,
      mimeType,
      format,
      status: 'PROCESSED',
      structuredDocument,
      processedAt: new Date(),
    };
  }
}
