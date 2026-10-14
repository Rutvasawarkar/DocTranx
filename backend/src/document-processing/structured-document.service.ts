import { Injectable, Logger } from '@nestjs/common';
import { DetectedTable } from './table-detection.service';
import { ExtractedImage } from './image-extraction.service';

/**
 * Universal Structured Document representation.
 * This is the intermediate JSON format used throughout the platform
 * for editing, transformation, and reconstruction.
 */
export interface StructuredDocument {
  documentId: string;
  format: string;
  sections: StructuredSection[];
  tables: DetectedTable[];
  images: ExtractedImage[];
  metadata: Record<string, any>;
  analysis: {
    headings: Array<{ text: string; level: number }>;
    layout: string;
    tableOfContents: Array<{ text: string; level: number; index: number }>;
  };
  pageCount?: number;
  createdAt: string;
}

export interface StructuredSection {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'image-ref' | 'table-ref' | 'slide';
  content: string;
  style?: string;
  level?: number;
  children?: StructuredSection[];
  slideNumber?: number;
}

/**
 * Converts extracted and analyzed content into the universal
 * Structured Document JSON format.
 */
@Injectable()
export class StructuredDocumentService {
  private readonly logger = new Logger(StructuredDocumentService.name);

  private sectionCounter = 0;

  /**
   * Build the structured document representation from all extracted data.
   */
  async buildStructure(
    documentId: string,
    format: string,
    data: {
      text: string;
      paragraphs?: Array<{ text: string; style?: string }>;
      tables?: DetectedTable[];
      images?: ExtractedImage[];
      slides?: Array<{ slideNumber: number; text: string; notes?: string }>;
      metadata?: Record<string, any>;
      analysis?: {
        headings: Array<{ text: string; level: number }>;
        layout: string;
        tableOfContents: Array<{
          text: string;
          level: number;
          index: number;
        }>;
      };
      pageCount?: number;
    },
  ): Promise<StructuredDocument> {
    this.logger.log(
      `Building structured representation for ${documentId} (${format})`,
    );

    this.sectionCounter = 0;

    // Build sections based on format
    let sections: StructuredSection[];
    if (format === 'PPTX' && data.slides) {
      sections = this.buildSlideSections(data.slides);
    } else {
      sections = this.buildDocumentSections(
        data.paragraphs || [],
        data.analysis?.headings || [],
      );
    }

    // Add table references into sections
    if (data.tables && data.tables.length > 0) {
      for (let i = 0; i < data.tables.length; i++) {
        sections.push({
          id: this.nextSectionId(),
          type: 'table-ref',
          content: `Table ${i + 1}`,
        });
      }
    }

    // Add image references into sections
    if (data.images && data.images.length > 0) {
      for (const img of data.images) {
        sections.push({
          id: this.nextSectionId(),
          type: 'image-ref',
          content: img.name,
        });
      }
    }

    const structuredDoc: StructuredDocument = {
      documentId,
      format,
      sections,
      tables: data.tables || [],
      images: data.images || [],
      metadata: data.metadata || {},
      analysis: data.analysis || {
        headings: [],
        layout: 'single-column',
        tableOfContents: [],
      },
      pageCount: data.pageCount,
      createdAt: new Date().toISOString(),
    };

    this.logger.log(
      `Structured document built: ${sections.length} sections, ` +
        `${structuredDoc.tables.length} tables, ` +
        `${structuredDoc.images.length} images`,
    );

    return structuredDoc;
  }

  /**
   * Build sections from DOCX/PDF paragraphs and headings.
   */
  private buildDocumentSections(
    paragraphs: Array<{ text: string; style?: string }>,
    headings: Array<{ text: string; level: number }>,
  ): StructuredSection[] {
    const sections: StructuredSection[] = [];
    const headingTexts = new Set(headings.map((h) => h.text));

    for (const para of paragraphs) {
      // Check if this paragraph is a heading
      const heading = headings.find((h) => h.text === para.text);

      if (heading || para.style?.toLowerCase().includes('heading')) {
        sections.push({
          id: this.nextSectionId(),
          type: 'heading',
          content: para.text,
          style: para.style,
          level: heading?.level || 1,
        });
      } else if (para.style?.toLowerCase().includes('list')) {
        sections.push({
          id: this.nextSectionId(),
          type: 'list',
          content: para.text,
          style: para.style,
        });
      } else {
        sections.push({
          id: this.nextSectionId(),
          type: 'paragraph',
          content: para.text,
          style: para.style,
        });
      }
    }

    // If no paragraphs were provided, fall back to headings + text blocks
    if (sections.length === 0 && headings.length > 0) {
      for (const heading of headings) {
        sections.push({
          id: this.nextSectionId(),
          type: 'heading',
          content: heading.text,
          level: heading.level,
        });
      }
    }

    return sections;
  }

  /**
   * Build sections from PPTX slides.
   */
  private buildSlideSections(
    slides: Array<{ slideNumber: number; text: string; notes?: string }>,
  ): StructuredSection[] {
    return slides.map((slide) => ({
      id: this.nextSectionId(),
      type: 'slide' as const,
      content: slide.text,
      slideNumber: slide.slideNumber,
    }));
  }

  /**
   * Generate a unique section ID.
   */
  private nextSectionId(): string {
    this.sectionCounter++;
    return `sec-${this.sectionCounter}`;
  }
}
