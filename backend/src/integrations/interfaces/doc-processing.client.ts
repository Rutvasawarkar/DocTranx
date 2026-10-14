/**
 * Interface for communication with the Document Processing service.
 * Implementations:
 *   - StubDocProcessingClient (mock responses, for development)
 *   - Real client (swap in when Document Processing service is available)
 */
export interface IDocProcessingClient {
  /**
   * Request reconstruction of a document into the target format.
   * Returns the file path of the reconstructed output.
   */
  reconstruct(
    documentId: string,
    targetFormat: string,
    options?: ReconstructOptions,
  ): Promise<{ outputFilePath: string; fidelityScore?: number }>;

  /**
   * Check the current processing status of a document.
   */
  getProcessingStatus(documentId: string): Promise<ProcessingStatus>;
}

export interface ReconstructOptions {
  resolution?: 'screen' | 'print' | 'archive';
  embedFonts?: boolean;
  watermark?: boolean;
  password?: string;
}

export interface ProcessingStatus {
  documentId: string;
  stage: string;
  progress: number; // 0-100
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error?: string;
}

/** DI token for the Document Processing client */
export const DOC_PROCESSING_CLIENT = 'DOC_PROCESSING_CLIENT';
