import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { StorageModule } from './storage/storage.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { EventsModule } from './events/events.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { MetadataModule } from './metadata/metadata.module';
import { EditingModule } from './editing/editing.module';
import { ExportModule } from './export/export.module';
import { SearchModule } from './search/search.module';
import { DocumentProcessingModule } from './document-processing/document-processing.module';

@Module({
  imports: [
    // ── Configuration ────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Core infrastructure ──────────────────────────────────
    PrismaModule,
    AuthModule,
    HealthModule,
    StorageModule,
    IntegrationsModule,
    EventsModule,

    // ── Feature modules ──────────────────────────────────────
    IngestionModule,
    MetadataModule,
    EditingModule,
    ExportModule,
    SearchModule,
    DocumentProcessingModule,
  ],
})
export class AppModule {}
