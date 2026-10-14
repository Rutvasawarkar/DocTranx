/**
 * Kafka topic constants for the Document Intelligence Platform.
 * These follow the naming convention: doc.<event-name>
 */
export const EventTopics = {
  /** Fired when a document has been uploaded and initial record created */
  DOC_INGESTED: 'doc.ingested',

  /** Fired when processing (extraction, layout, structure) completes */
  DOC_PROCESSED: 'doc.processed',

  /** Fired when a user applies an edit to a document */
  DOC_EDIT_APPLIED: 'doc.edit-applied',

  /** Fired when an export is requested */
  DOC_EXPORT_REQUESTED: 'doc.export-requested',

  /** Fired when an export completes successfully */
  DOC_EXPORTED: 'doc.exported',

  /** Fired when a document is deleted */
  DOC_DELETED: 'doc.deleted',
} as const;

export type EventTopic = (typeof EventTopics)[keyof typeof EventTopics];
