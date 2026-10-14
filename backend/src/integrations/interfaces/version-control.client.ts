/**
 * Interface for communication with the Version Control service.
 * Implementations:
 *   - StubVersionControlClient (in-memory, for development)
 *   - Real client (swap in when Version Control service is available)
 */
export interface IVersionControlClient {
  /**
   * Create a version snapshot at the given pipeline stage.
   */
  createSnapshot(
    documentId: string,
    stage: string,
    payload: unknown,
  ): Promise<{ versionId: string }>;

  /**
   * List all version summaries for a document.
   */
  listVersions(
    documentId: string,
  ): Promise<VersionSummary[]>;

  /**
   * Get full version details.
   */
  getVersion(
    documentId: string,
    versionId: string,
  ): Promise<VersionDetail>;

  /**
   * Rollback a document to a previous version.
   */
  rollback(
    documentId: string,
    versionId: string,
  ): Promise<{ newVersionId: string }>;
}

export interface VersionSummary {
  versionId: string;
  stage: string;
  timestamp: string;
  createdBy?: string;
  tag?: string;
}

export interface VersionDetail extends VersionSummary {
  payload: unknown;
  checksum: string;
  previousVersionId?: string;
}

/** DI token for the Version Control client */
export const VERSION_CONTROL_CLIENT = 'VERSION_CONTROL_CLIENT';
