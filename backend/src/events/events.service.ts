import { Injectable, Logger, Inject } from '@nestjs/common';
import { IEventPublisher, EventMessage, EVENT_PUBLISHER } from '../integrations/interfaces/event-publisher';

/**
 * Events service — high-level wrapper for event publishing.
 * Delegates to the injected IEventPublisher implementation
 * (stub in development, real Kafka in production).
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject(EVENT_PUBLISHER)
    private readonly publisher: IEventPublisher,
  ) {}

  /**
   * Publish an event to the specified topic.
   */
  async publish(topic: string, key: string, value: unknown): Promise<void> {
    const message: EventMessage = {
      key,
      value,
      headers: {
        'x-source': 'backend-service',
        'x-timestamp': new Date().toISOString(),
      },
    };

    try {
      await this.publisher.publish(topic, message);
      this.logger.log(`Event published: topic=${topic} key=${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish event: topic=${topic} key=${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Don't throw — events are fire-and-forget in Model B
      // The operation that triggered the event should still succeed
    }
  }
}
