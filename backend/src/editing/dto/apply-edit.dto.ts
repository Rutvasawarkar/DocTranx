import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, IsOptional, IsObject } from 'class-validator';

export class ApplyEditDto {
  @ApiProperty({
    description: 'Type of edit operation',
    enum: ['TEXT', 'TABLE', 'IMAGE', 'HEADER_FOOTER', 'FORMAT_CONVERSION', 'FIND_REPLACE'],
    example: 'TEXT',
  })
  @IsIn(['TEXT', 'TABLE', 'IMAGE', 'HEADER_FOOTER', 'FORMAT_CONVERSION', 'FIND_REPLACE'])
  editType!: string;

  @ApiProperty({
    description: 'JSON diff payload describing the edit. Structure depends on editType.',
    example: {
      path: '/sections/0/paragraphs/2',
      operation: 'update',
      oldValue: 'Original text content',
      newValue: 'Updated text content',
    },
  })
  @IsObject()
  @IsNotEmpty()
  diffPayload!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Human-readable description of the edit',
    example: 'Fixed typo in section 2, paragraph 3',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
