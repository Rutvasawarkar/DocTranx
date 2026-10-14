import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MetadataEntryDto {
  @ApiProperty({ description: 'Metadata key', example: 'author' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  key!: string;

  @ApiProperty({ description: 'Metadata value', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  value!: string;
}

export class UpdateMetadataDto {
  @ApiProperty({
    description: 'Metadata key-value entries to upsert',
    type: [MetadataEntryDto],
    example: [
      { key: 'author', value: 'John Doe' },
      { key: 'department', value: 'Finance' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetadataEntryDto)
  entries!: MetadataEntryDto[];
}
