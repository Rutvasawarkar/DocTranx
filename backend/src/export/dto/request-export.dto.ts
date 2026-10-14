import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, IsBoolean } from 'class-validator';

export class RequestExportDto {
  @ApiProperty({
    description: 'Target export format',
    enum: ['PDF', 'DOCX', 'PPTX', 'HTML', 'EPUB', 'RTF', 'TXT'],
    example: 'PDF',
  })
  @IsIn(['PDF', 'DOCX', 'PPTX', 'HTML', 'EPUB', 'RTF', 'TXT'])
  targetFormat!: string;

  @ApiPropertyOptional({
    description: 'Image resolution profile',
    enum: ['screen', 'print', 'archive'],
    default: 'screen',
  })
  @IsOptional()
  @IsIn(['screen', 'print', 'archive'])
  resolution?: string;

  @ApiPropertyOptional({
    description: 'Whether to add a watermark',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  watermark?: boolean;

  @ApiPropertyOptional({
    description: 'Password to protect the exported document (PDF only)',
  })
  @IsOptional()
  @IsString()
  password?: string;
}
