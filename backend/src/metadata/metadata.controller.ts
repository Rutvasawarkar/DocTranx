import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { MetadataService } from './metadata.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateMetadataDto } from './dto/update-metadata.dto';

@ApiTags('Metadata')
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('keycloak-jwt')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Get()
  @ApiOperation({
    summary: 'List documents',
    description:
      'List documents with optional filtering by MIME type, status, date range, tags, ' +
      'and full-text search. Supports pagination and sorting.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of documents' })
  async listDocuments(
    @Query() query: QueryDocumentsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.metadataService.listDocuments(query, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get document details',
    description: 'Get a single document with all associated metadata.',
  })
  @ApiParam({ name: 'id', description: 'Document UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Document details with metadata' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.metadataService.getDocument(id, user.tenantId);
  }

  @Patch(':id/metadata')
  @Roles('admin', 'editor')
  @ApiOperation({
    summary: 'Update document metadata',
    description: 'Upsert metadata key-value pairs for a document.',
  })
  @ApiParam({ name: 'id', description: 'Document UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Metadata updated' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async updateMetadata(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMetadataDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.metadataService.updateMetadata(
      id,
      dto,
      user.tenantId,
      user.sub,
    );
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Delete a document',
    description: 'Soft-delete a document. Only admins can delete documents.',
  })
  @ApiParam({ name: 'id', description: 'Document UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.metadataService.deleteDocument(id, user.tenantId, user.sub);
  }
}
