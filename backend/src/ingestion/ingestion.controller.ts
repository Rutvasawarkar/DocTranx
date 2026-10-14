import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { IngestionService } from './ingestion.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { MAX_FILE_SIZE_BYTES } from './constants/allowed-mime-types';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('keycloak-jwt')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  @Roles('admin', 'editor')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  @ApiOperation({
    summary: 'Upload a document',
    description:
      'Upload a document file for ingestion. Supported formats: PDF, DOCX, DOC, PPTX, PPT, TIFF, PNG, JPEG, BMP. ' +
      'Maximum file size: 500MB. The document will be validated, stored in S3/MinIO, and queued for processing.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document file with optional metadata',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The document file to upload',
        },
        title: {
          type: 'string',
          description: 'Optional title for the document',
          example: 'Q4 Financial Report',
        },
        description: {
          type: 'string',
          description: 'Optional description',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional classification tags',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized — invalid or missing JWT' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  @ApiResponse({ status: 413, description: 'File too large' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    return this.ingestionService.ingestDocument(
      file,
      dto,
      user.sub,
      user.tenantId,
    );
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Get document processing status',
    description: 'Returns the current processing status of a document.',
  })
  @ApiParam({ name: 'id', description: 'Document UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Document status retrieved' })
  @ApiResponse({ status: 400, description: 'Document not found' })
  async getDocumentStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.ingestionService.getDocumentStatus(id);
  }
}
