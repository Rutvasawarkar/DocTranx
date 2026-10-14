import { Injectable, Logger } from '@nestjs/common';
import {
  IVersionControlClient,
  VersionSummary,
  VersionDetail,
} from '../interfaces/version-control.client';

/**
 * Stub implementation of the Version Control client.
 * Logs operations to console and returns mock data.
 * Use this during development while the real Version Control service is unavailable.
 */
@Injectable()
export class StubVersionControlClient implements IVersionControlClient {
  private readonly logger = new Logger('StubVersionControlClient');
  private readonly snapshots: Map<string, VersionSummary[]> = new Map();
  private snapshotCounter = 0;

  async createSnapshot(
    documentId: string,
    stage: string,
    payload: unknown,
  ): Promise<{ versionId: string }> {
    const versionId = `stub-v${++this.snapshotCounter}-${Date.now()}`;
    this.logger.log(
      `[STUB] Creating snapshot for doc=${documentId} stage=${stage} → versionId=${versionId}`,
    );

    const summary: VersionSummary = {
      versionId,
      stage,
      timestamp: new Date().toISOString(),
    };

    const existing = this.snapshots.get(documentId) || [];
    existing.push(summary);
    this.snapshots.set(documentId, existing);

    return { versionId };
  }

  async listVersions(documentId: string): Promise<VersionSummary[]> {
    this.logger.log(`[STUB] Listing versions for doc=${documentId}`);
    return this.snapshots.get(documentId) || [];
  }

  async getVersion(documentId: string, versionId: string): Promise<VersionDetail> {
    this.logger.log(`[STUB] Getting version doc=${documentId} version=${versionId}`);
    const versions = this.snapshots.get(documentId) || [];
    const found = versions.find((v) => v.versionId === versionId);

    return {
      versionId: found?.versionId || versionId,
      stage: found?.stage || 'unknown',
      timestamp: found?.timestamp || new Date().toISOString(),
      payload: { stub: true },
      checksum: 'stub-checksum',
    };
  }

  async rollback(
    documentId: string,
    versionId: string,
  ): Promise<{ newVersionId: string }> {
    this.logger.log(`[STUB] Rollback doc=${documentId} to version=${versionId}`);
    const result = await this.createSnapshot(documentId, 'rollback', { rolledBackTo: versionId });
    return { newVersionId: result.versionId };
  }
}
