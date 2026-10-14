import { Global, Module } from '@nestjs/common';
import { VERSION_CONTROL_CLIENT } from './interfaces/version-control.client';
import { DOC_PROCESSING_CLIENT } from './interfaces/doc-processing.client';
import { EVENT_PUBLISHER } from './interfaces/event-publisher';
import { StubVersionControlClient } from './stubs/stub-version-control.client';
import { StubDocProcessingClient } from './stubs/stub-doc-processing.client';
import { StubEventPublisher } from './stubs/stub-event-publisher';

/**
 * Integrations module — provides cross-service clients.
 *
 * Currently wired to stub implementations for development.
 * To swap to real implementations:
 * 1. Create a real client class implementing the interface
 * 2. Replace the `useClass` value here
 * 3. No other module changes needed (DI handles the rest)
 */
@Global()
@Module({
  providers: [
    {
      provide: VERSION_CONTROL_CLIENT,
      useClass: StubVersionControlClient,
    },
    {
      provide: DOC_PROCESSING_CLIENT,
      useClass: StubDocProcessingClient,
    },
    {
      provide: EVENT_PUBLISHER,
      useClass: StubEventPublisher,
    },
  ],
  exports: [VERSION_CONTROL_CLIENT, DOC_PROCESSING_CLIENT, EVENT_PUBLISHER],
})
export class IntegrationsModule {}
