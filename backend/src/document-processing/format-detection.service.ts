import { Injectable, Logger } from '@nestjs/common';

/**
 * Detects document format using magic bytes (file signatures)
 * and MIME type fallback.
 */
@Injectable()
export class FormatDetectionService {
  private readonly logger = new Logger(FormatDetectionService.name);

  /**
   * Known file signatures (magic bytes).
   */
  private readonly signatures: Array<{
    format: string;
    bytes: number[];
    offset?: number;
  }> = [
    { format: 'PDF', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
    { format: 'ZIP', bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK.. (ZIP-based: DOCX, PPTX, XLSX)
    { format: 'PNG', bytes: [0x89, 0x50, 0x4e, 0x47] }, // .PNG
    { format: 'JPEG', bytes: [0xff, 0xd8, 0xff] },        // JPEG
    { format: 'TIFF', bytes: [0x49, 0x49, 0x2a, 0x00] },  // TIFF (little-endian)
    { format: 'TIFF', bytes: [0x4d, 0x4d, 0x00, 0x2a] },  // TIFF (big-endian)
    { format: 'BMP', bytes: [0x42, 0x4d] },                // BM
  ];

  /**
   * Detect format from file buffer using magic bytes.
   * Falls back to MIME type analysis.
   */
  detect(buffer: Buffer, mimeType?: string): string {
    // 1. Try magic byte detection
    const magicFormat = this.detectFromMagicBytes(buffer);

    if (magicFormat) {
      // For ZIP-based formats, we need to determine the specific type
      if (magicFormat === 'ZIP') {
        return this.detectZipBasedFormat(buffer, mimeType);
      }
      return magicFormat;
    }

    // 2. Fall back to MIME type
    if (mimeType) {
      return this.detectFromMimeType(mimeType);
    }

    return 'UNKNOWN';
  }

  /**
   * Check if a file buffer appears to be a scanned/image-only PDF.
   * Heuristic: if the PDF has very little extractable text relative
   * to its page count, it's likely scanned.
   */
  isLikelyScannedPdf(
    text: string,
    pageCount: number,
  ): boolean {
    if (pageCount === 0) return false;

    const charsPerPage = text.trim().length / pageCount;
    // If less than 50 chars per page on average, likely scanned
    const threshold = 50;

    const isScanned = charsPerPage < threshold;
    if (isScanned) {
      this.logger.log(
        `Detected likely scanned PDF: ${charsPerPage.toFixed(0)} chars/page (threshold: ${threshold})`,
      );
    }

    return isScanned;
  }

  /**
   * Detect format from magic bytes at the start of the buffer.
   */
  private detectFromMagicBytes(buffer: Buffer): string | null {
    if (buffer.length < 4) return null;

    for (const sig of this.signatures) {
      const offset = sig.offset || 0;
      if (buffer.length < offset + sig.bytes.length) continue;

      let match = true;
      for (let i = 0; i < sig.bytes.length; i++) {
        if (buffer[offset + i] !== sig.bytes[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        this.logger.debug(`Magic byte match: ${sig.format}`);
        return sig.format;
      }
    }

    return null;
  }

  /**
   * For ZIP-based formats (DOCX, PPTX, XLSX), determine the actual
   * format by checking the content inside the ZIP archive.
   */
  private detectZipBasedFormat(
    buffer: Buffer,
    mimeType?: string,
  ): string {
    // Check content type markers within the ZIP
    const content = buffer.toString('ascii', 0, Math.min(buffer.length, 4096));

    if (content.includes('word/')) return 'DOCX';
    if (content.includes('ppt/')) return 'PPTX';
    if (content.includes('xl/')) return 'XLSX';

    // Fall back to MIME type if we can't determine from content
    if (mimeType) {
      return this.detectFromMimeType(mimeType);
    }

    return 'ZIP';
  }

  /**
   * Detect format from MIME type string.
   */
  private detectFromMimeType(mimeType: string): string {
    const lower = mimeType.toLowerCase();

    if (lower === 'application/pdf') return 'PDF';
    if (lower.includes('wordprocessingml') || lower.includes('msword'))
      return 'DOCX';
    if (lower.includes('presentationml') || lower.includes('powerpoint'))
      return 'PPTX';
    if (lower.includes('spreadsheetml') || lower.includes('excel'))
      return 'XLSX';
    if (lower.startsWith('image/png')) return 'PNG';
    if (lower.startsWith('image/jpeg')) return 'JPEG';
    if (lower.startsWith('image/tiff')) return 'TIFF';
    if (lower.startsWith('image/bmp')) return 'BMP';
    if (lower === 'text/plain') return 'TXT';
    if (lower === 'text/html') return 'HTML';

    return 'UNKNOWN';
  }
}
