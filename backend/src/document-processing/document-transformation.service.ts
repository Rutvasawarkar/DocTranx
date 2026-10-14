import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { DocumentProcessingService } from './document-processing.service';
import { DocumentReconstructionService } from './document-reconstruction.service';

/**
 * Handles cross-format document transformations by chaining:
 * Parse Source → Structured JSON → Reconstruct to Target Format
 */
@Injectable()
export class DocumentTransformationService {
  private readonly logger = new Logger(
    DocumentTransformationService.name,
  );

  constructor(
    private readonly storage: StorageService,
    private readonly processing: DocumentProcessingService,
    private readonly reconstruction: DocumentReconstructionService,
  ) {}

  /**
   * Transform a document from its current format to a target format.
   * 1. Load the source document from storage
   * 2. Process it through the extraction pipeline
   * 3. Reconstruct it in the target format
   */
  async transformDocument(
    documentId: string,
    sourceFilePath: string,
    sourceMimeType: string,
    targetFormat: string,
  ): Promise<{
    documentId: string;
    sourceFormat: string;
    targetFormat: string;
    outputFilePath: string;
    fidelityScore: number;
    status: string;
  }> {
    this.logger.log(
      `Transforming document ${documentId}: ${sourceMimeType} -> ${targetFormat}`,
    );

    // 1. Load source document
    const { body: sourceBuffer } = await this.storage.getFile(sourceFilePath);

    // 2. Process through extraction pipeline
    const processResult = await this.processing.processDocument(
      documentId,
      sourceMimeType,
      sourceBuffer,
    );

    // 3. Reconstruct in target format
    const reconstructResult = await this.reconstruction.reconstruct(
      documentId,
      targetFormat,
      processResult.structuredDocument,
    );

    this.logger.log(
      `Transformation complete: ${processResult.format} -> ${targetFormat} ` +
        `(fidelity: ${reconstructResult.fidelityScore}%)`,
    );

    return {
      documentId,
      sourceFormat: processResult.format,
      targetFormat,
      outputFilePath: reconstructResult.outputFilePath,
      fidelityScore: reconstructResult.fidelityScore,
      status: 'TRANSFORMED',
    };
  }
}
