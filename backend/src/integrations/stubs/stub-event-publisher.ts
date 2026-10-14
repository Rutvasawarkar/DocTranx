import { Injectable, Logger } from '@nestjs/common';
import { IEventPublisher, EventMessage } from '../interfaces/event-publisher';

/**
 * Stub implementation of the Event Publisher.
 * Logs events to console instead of publishing to Kafka.
 * Use during development when Kafka is not running.
 */
@Injectable()
export class StubEventPublisher implements IEventPublisher {
  private readonly logger = new Logger('StubEventPublisher');
  private readonly publishedEvents: Array<{ topic: string; message: EventMessage }> = [];

  async publish(topic: string, message: EventMessage): Promise<void> {
    this.logger.log(
      `[STUB] Event published → topic=${topic} key=${message.key} value=${JSON.stringify(message.value)}`,
    );
    this.publishedEvents.push({ topic, message });
  }

  /**
   * Retrieve all published events (useful for testing).
   */
  getPublishedEvents(): Array<{ topic: string; message: EventMessage }> {
    return [...this.publishedEvents];
  }

  /**
   * Clear all published events (useful for testing).
   */
  clearEvents(): void {
    this.publishedEvents.length = 0;
  }
}
