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
import { ExportService } from './export.service';
import { RequestExportDto } from './dto/request-export.dto';

@ApiTags('Export')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('keycloak-jwt')
@Controller()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('documents/:id/export')
  @Roles('admin', 'editor')
  @ApiOperation({
    summary: 'Request document export',
    description:
      'Request export/reconstruction of a document into the target format. ' +
      'Supported formats: PDF, DOCX, PPTX, HTML, EPUB, RTF, TXT. ' +
      'Returns a signed download URL valid for 24 hours.',
  })
  @ApiParam({ name: 'id', description: 'Document UUID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Export job created' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async requestExport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestExportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.exportService.requestExport(
      id,
      dto,
      user.sub,
      user.tenantId,
    );
  }

  @Get('exports/:exportId')
  @ApiOperation({
    summary: 'Get export job status',
    description:
      'Check the status of an export job and retrieve the download URL. ' +
      'If the URL has expired, a new one is automatically generated.',
  })
  @ApiParam({ name: 'exportId', description: 'Export job UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Export job status' })
  @ApiResponse({ status: 404, description: 'Export job not found' })
  async getExportStatus(
    @Param('exportId', ParseUUIDPipe) exportId: string,
  ) {
    return this.exportService.getExportStatus(exportId);
  }
}
