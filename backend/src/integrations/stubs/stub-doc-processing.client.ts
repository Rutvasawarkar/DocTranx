import { Injectable, Logger } from '@nestjs/common';
import {
  IDocProcessingClient,
  ProcessingStatus,
  ReconstructOptions,
} from '../interfaces/doc-processing.client';

/**
 * Stub implementation of the Document Processing client.
 * Returns mock data for development without the real processing service.
 */
@Injectable()
export class StubDocProcessingClient implements IDocProcessingClient {
  private readonly logger = new Logger('StubDocProcessingClient');

  async reconstruct(
    documentId: string,
    targetFormat: string,
    options?: ReconstructOptions,
  ): Promise<{ outputFilePath: string; fidelityScore?: number }> {
    this.logger.log(
      `[STUB] Reconstruct doc=${documentId} format=${targetFormat} options=${JSON.stringify(options)}`,
    );

    // Simulate a short processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const outputFilePath = `exports/${documentId}/output-${Date.now()}.${targetFormat.toLowerCase()}`;
    return {
      outputFilePath,
      fidelityScore: 0.97,
    };
  }

  async getProcessingStatus(documentId: string): Promise<ProcessingStatus> {
    this.logger.log(`[STUB] Processing status for doc=${documentId}`);

    return {
      documentId,
      stage: 'completed',
      progress: 100,
      status: 'completed',
    };
  }
}
