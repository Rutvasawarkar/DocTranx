import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { v4 as uuidv4 } from 'uuid';

export interface ExtractedImage {
  id: string;
  name: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Service for extracting embedded images/media from documents
 * and saving them to local storage.
 */
@Injectable()
export class ImageExtractionService {
  private readonly logger = new Logger(ImageExtractionService.name);

  constructor(private readonly storage: StorageService) {}

  /**
   * Save extracted image buffers from parsers to local storage
   * and return references.
   */
  async saveExtractedImages(
    documentId: string,
    images: Array<{
      name: string;
      buffer: Buffer;
      contentType: string;
    }>,
  ): Promise<ExtractedImage[]> {
    if (images.length === 0) return [];

    this.logger.log(
      `Saving ${images.length} extracted images for document ${documentId}`,
    );

    const results: ExtractedImage[] = [];

    for (const image of images) {
      const imageId = uuidv4();
      const ext = image.name.split('.').pop() || 'bin';
      const storagePath = `documents/${documentId}/images/${imageId}.${ext}`;

      await this.storage.uploadFile(
        storagePath,
        image.buffer,
        image.contentType,
      );

      results.push({
        id: imageId,
        name: image.name,
        storagePath,
        contentType: image.contentType,
        sizeBytes: image.buffer.length,
      });
    }

    this.logger.log(
      `Saved ${results.length} images for document ${documentId}`,
    );

    return results;
  }
}
