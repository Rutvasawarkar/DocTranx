import { Module } from '@nestjs/common';
import { EditingController } from './editing.controller';
import { EditingService } from './editing.service';

@Module({
  controllers: [EditingController],
  providers: [EditingService],
  exports: [EditingService],
})
export class EditingModule {}
