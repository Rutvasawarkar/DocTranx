import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';

import { DocumentProcessingService } from './document-processing.service';
import { DocumentReconstructionService } from './document-reconstruction.service';
import { DocumentAnalysisService } from './document-analysis.service';
import { DocumentEditingService } from './document-editing.service';
import { DocumentTransformationService } from './document-transformation.service';
import { OcrService } from './ocr.service';
import { TableDetectionService } from './table-detection.service';
import { ImageExtractionService } from './image-extraction.service';
import { StructuredDocumentService } from './structured-document.service';
import { FormatDetectionService } from './format-detection.service';
import { VersionControlService } from './version-control.service';

@Module({
  imports: [StorageModule, PrismaModule],
  providers: [
    DocumentProcessingService,
    DocumentReconstructionService,
    DocumentAnalysisService,
    DocumentEditingService,
    DocumentTransformationService,
    OcrService,
    TableDetectionService,
    ImageExtractionService,
    StructuredDocumentService,
    FormatDetectionService,
    VersionControlService,
  ],
  exports: [
    DocumentProcessingService,
    DocumentReconstructionService,
    DocumentAnalysisService,
    DocumentEditingService,
    DocumentTransformationService,
    OcrService,
    TableDetectionService,
    ImageExtractionService,
    StructuredDocumentService,
    FormatDetectionService,
    VersionControlService,
  ],
})
export class DocumentProcessingModule {}
