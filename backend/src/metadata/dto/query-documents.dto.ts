import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsDateString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryDocumentsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search term (matches file name or metadata values)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by MIME type',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Filter by document status',
    enum: [
      'UPLOADED',
      'PROCESSING',
      'EXTRACTED',
      'ANALYSED',
      'READY',
      'EXPORT_PENDING',
      'EXPORTED',
      'FAILED',
      'DELETED',
    ],
  })
  @IsOptional()
  @IsIn([
    'UPLOADED',
    'PROCESSING',
    'EXTRACTED',
    'ANALYSED',
    'READY',
    'EXPORT_PENDING',
    'EXPORTED',
    'FAILED',
    'DELETED',
  ])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by creation date (from)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by creation date (to)',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;
}
