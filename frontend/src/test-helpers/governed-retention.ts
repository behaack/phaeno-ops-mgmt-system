import type { CustomerResultPackage } from '#/api/pseq-order-to-cash'

export const governedRetentionPackage: CustomerResultPackage = {
  id: 'package', labSampleId: 'sample', packageVersion: 1, state: 'Released',
  releasedAtUtc: '2026-08-01T12:00:00Z', retentionState: 'Active', isDownloadAvailable: true,
  artifacts: [{ id: 'artifact', logicalRole: 'Report', fileName: 'synthetic-result.txt', contentType: 'text/plain', sizeBytes: 16000, sha256: 'A'.repeat(64), deletedAtUtc: null }],
  retention: {
    releasedAtUtc: '2026-08-01T12:00:00Z', warningAtUtc: '2026-08-26T12:00:00Z',
    standardDeletionAtUtc: '2026-08-31T12:00:00Z', potentialFinalDeletionAtUtc: '2026-09-05T12:00:00Z',
    graceActivatedAtUtc: null, downloadAccessClosedAtUtc: null, byteDeletedAtUtc: null, deletionOutcome: null,
    download: { totalFileCount: 1, downloadedFileCount: 0, activeAttemptCount: 0, status: 'NotStarted', completedAtUtc: null },
  },
}
