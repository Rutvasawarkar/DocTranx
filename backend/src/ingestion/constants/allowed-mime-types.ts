/**
 * Supported MIME types for document ingestion.
 * Based on Architecture Doc section 4.1: PDF, DOCX/DOC, PPTX/PPT,
 * scanned images (TIFF, PNG, JPEG, BMP).
 */
export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  // PDF
  'application/pdf',

  // Microsoft Word
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx

  // Microsoft PowerPoint
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx

  // Images (scanned documents)
  'image/tiff',
  'image/png',
  'image/jpeg',
  'image/bmp',
]);

/**
 * Human-readable format name mapping for API responses.
 */
export const MIME_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'image/tiff': 'TIFF',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/bmp': 'BMP',
};

/** Default max file size: 500MB */
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

/** Default max batch size: 5GB */
export const MAX_BATCH_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
