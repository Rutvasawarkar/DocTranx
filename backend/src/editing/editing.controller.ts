import {
  Controller,
  Post,
  Get,
  Param,
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
import { EditingService } from './editing.service';
import { ApplyEditDto } from './dto/apply-edit.dto';

@ApiTags('Editing')
@Controller('documents/:documentId/edits')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('keycloak-jwt')
export class EditingController {
  constructor(private readonly editingService: EditingService) {}

  @Post()
  @Roles('admin', 'editor')
  @ApiOperation({
    summary: 'Apply an edit to a document',
    description:
      'Apply a diff-based edit to a document. Supported edit types: TEXT, TABLE, IMAGE, ' +
      'HEADER_FOOTER, FORMAT_CONVERSION, FIND_REPLACE. Each edit creates a version snapshot.',
  })
  @ApiParam({ name: 'documentId', description: 'Document UUID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Edit applied successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async applyEdit(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ApplyEditDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.editingService.applyEdit(
      documentId,
      dto,
      user.sub,
      user.tenantId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List edit history',
    description: 'Get the full edit history for a document, ordered newest-first.',
  })
  @ApiParam({ name: 'documentId', description: 'Document UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Edit history' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async listEdits(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.editingService.listEdits(documentId, user.tenantId);
  }

  @Post('undo')
  @Roles('admin', 'editor')
  @ApiOperation({
    summary: 'Undo last edit',
    description: 'Undo the most recent edit and rollback to the previous version.',
  })
  @ApiParam({ name: 'documentId', description: 'Document UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Last edit undone' })
  @ApiResponse({ status: 404, description: 'Document not found or no edits to undo' })
  async undoLastEdit(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.editingService.undoLastEdit(
      documentId,
      user.sub,
      user.tenantId,
    );
  }
}
