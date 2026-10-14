/**
 * Interface for publishing events (e.g. to Kafka).
 * Implementations:
 *   - StubEventPublisher (logs to console, for development)
 *   - KafkaEventPublisher (real Kafka, when KAFKA_ENABLED=true)
 */
export interface IEventPublisher {
  /**
   * Publish a message to the given topic.
   */
  publish(topic: string, message: EventMessage): Promise<void>;
}

export interface EventMessage {
  key: string;
  value: unknown;
  headers?: Record<string, string>;
}

/** DI token for the Event Publisher */
export const EVENT_PUBLISHER = 'EVENT_PUBLISHER';
