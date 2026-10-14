import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @ApiPropertyOptional({
    description: 'Optional title for the document',
    example: 'Q4 Financial Report',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    description: 'Optional description',
    example: 'Quarterly financial report for Q4 2025',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Tags for document classification',
    example: ['financial', 'quarterly', 'report'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
