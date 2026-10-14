import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsDateString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class SearchQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Full-text search query',
    example: 'financial report Q4',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by document format',
    example: 'PDF',
  })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({
    description: 'Filter by document type/MIME type',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Filter by creation date (from)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by creation date (to)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Enable search result highlighting',
    enum: ['true', 'false'],
    default: 'true',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  highlight?: string;
}
