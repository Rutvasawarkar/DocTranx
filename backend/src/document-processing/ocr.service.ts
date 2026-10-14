import { Injectable, Logger } from '@nestjs/common';
import Tesseract from 'tesseract.js';

export interface OcrResult {
  text: string;
  confidence: number;
  blocks: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
}

/**
 * OCR Service using Tesseract.js for text extraction from
 * scanned documents and images.
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * Extract text from an image buffer using Tesseract OCR.
   * Supports PNG, JPEG, TIFF, and BMP formats.
   */
  async extractTextFromImage(buffer: Buffer): Promise<OcrResult> {
    this.logger.log('Running OCR on scanned document');

    try {
      const result = await Tesseract.recognize(buffer, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(
              `OCR progress: ${(m.progress * 100).toFixed(0)}%`,
            );
          }
        },
      });

      const blocks = (result.data.blocks || []).map((block: any) => ({
        text: block.text,
        confidence: block.confidence,
        bbox: {
          x0: block.bbox.x0,
          y0: block.bbox.y0,
          x1: block.bbox.x1,
          y1: block.bbox.y1,
        },
      }));

      this.logger.log(
        `OCR completed: ${result.data.text.length} chars, confidence: ${result.data.confidence.toFixed(1)}%`,
      );

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        blocks,
      };
    } catch (error) {
      this.logger.error(`OCR failed: ${error}`);
      return {
        text: '',
        confidence: 0,
        blocks: [],
      };
    }
  }

  /**
   * Process multiple images (e.g., scanned PDF pages) sequentially.
   */
  async extractTextFromImages(
    images: Buffer[],
  ): Promise<OcrResult[]> {
    this.logger.log(`Processing ${images.length} images for OCR`);

    const results: OcrResult[] = [];

    for (let i = 0; i < images.length; i++) {
      this.logger.log(`OCR page ${i + 1}/${images.length}`);
      const result = await this.extractTextFromImage(images[i]);
      results.push(result);
    }

    return results;
  }
}

// Re-export with original name for backward compatibility
export { OcrService as OCRService };
