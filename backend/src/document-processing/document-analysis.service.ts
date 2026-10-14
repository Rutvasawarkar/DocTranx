import { Injectable, Logger } from '@nestjs/common';

/**
 * Analyzes extracted document content to identify structural elements:
 * headings, paragraphs, layout type, and table of contents.
 */
@Injectable()
export class DocumentAnalysisService {
  private readonly logger = new Logger(DocumentAnalysisService.name);

  /**
   * Analyze document content to detect structural elements.
   */
  async analyzeDocument(content: {
    text: string;
    paragraphs?: Array<{ text: string; style?: string }>;
    html?: string;
  }) {
    this.logger.log('Analyzing document structure');

    const headings = this.detectHeadings(content);
    const paragraphs = this.detectParagraphs(content);
    const layout = this.detectLayout(content.text);
    const toc = this.buildTableOfContents(headings);

    return {
      headings,
      paragraphs,
      layout,
      tableOfContents: toc,
    };
  }

  /**
   * Detect headings from styled paragraphs or text patterns.
   */
  private detectHeadings(content: {
    text: string;
    paragraphs?: Array<{ text: string; style?: string }>;
  }): Array<{ text: string; level: number }> {
    const headings: Array<{ text: string; level: number }> = [];

    // 1. From DOCX-style paragraphs (most reliable)
    if (content.paragraphs) {
      for (const para of content.paragraphs) {
        if (para.style) {
          const styleLower = para.style.toLowerCase();
          // Match Heading1, Heading2, ... or Title
          const headingMatch = styleLower.match(/heading(\d+)/);
          if (headingMatch) {
            headings.push({
              text: para.text,
              level: parseInt(headingMatch[1]),
            });
          } else if (styleLower === 'title') {
            headings.push({ text: para.text, level: 1 });
          } else if (styleLower === 'subtitle') {
            headings.push({ text: para.text, level: 2 });
          }
        }
      }
    }

    // 2. If no headings found from styles, try heuristic detection
    if (headings.length === 0) {
      const lines = content.text.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        const trimmed = line.trim();

        // Short lines that are all caps → likely heading
        if (
          trimmed.length > 3 &&
          trimmed.length < 100 &&
          trimmed === trimmed.toUpperCase() &&
          /[A-Z]/.test(trimmed)
        ) {
          headings.push({ text: trimmed, level: 1 });
          continue;
        }

        // Lines ending with no punctuation and under 80 chars → possible heading
        if (
          trimmed.length > 3 &&
          trimmed.length < 80 &&
          !/[.,:;!?]$/.test(trimmed) &&
          /^[A-Z0-9]/.test(trimmed)
        ) {
          // Check if it looks like a numbered heading (e.g., "1. Introduction")
          if (/^\d+(\.\d+)*\.?\s+[A-Z]/.test(trimmed)) {
            const depth = (trimmed.match(/\./g) || []).length;
            headings.push({ text: trimmed, level: Math.min(depth + 1, 6) });
          }
        }
      }
    }

    return headings;
  }

  /**
   * Extract paragraphs from content.
   */
  private detectParagraphs(content: {
    text: string;
    paragraphs?: Array<{ text: string; style?: string }>;
  }): Array<{ text: string; style?: string }> {
    // If we have styled paragraphs from DOCX parsing, use them
    if (content.paragraphs && content.paragraphs.length > 0) {
      return content.paragraphs.filter(
        (p) => !p.style?.toLowerCase().includes('heading'),
      );
    }

    // Fall back to splitting by double newlines
    const blocks = content.text.split(/\n\s*\n/).filter((b) => b.trim());
    return blocks.map((block) => ({
      text: block.trim(),
    }));
  }

  /**
   * Detect document layout type.
   */
  private detectLayout(text: string): string {
    const lines = text.split('\n');
    const nonEmptyLines = lines.filter((l) => l.trim());

    if (nonEmptyLines.length === 0) return 'empty';

    // Check for multi-column indicators
    const avgLength =
      nonEmptyLines.reduce((sum, l) => sum + l.length, 0) /
      nonEmptyLines.length;

    // Short average line length with many lines suggests multi-column
    if (avgLength < 40 && nonEmptyLines.length > 20) {
      return 'multi-column';
    }

    // Check for list-heavy content
    const listLines = nonEmptyLines.filter(
      (l) => /^\s*[\-\*\•\▸\▹]\s/.test(l) || /^\s*\d+[\.\)]\s/.test(l),
    );
    if (listLines.length > nonEmptyLines.length * 0.3) {
      return 'list-heavy';
    }

    return 'single-column';
  }

  /**
   * Build a table of contents from detected headings.
   */
  private buildTableOfContents(
    headings: Array<{ text: string; level: number }>,
  ): Array<{ text: string; level: number; index: number }> {
    return headings.map((h, index) => ({
      text: h.text,
      level: h.level,
      index,
    }));
  }
}
