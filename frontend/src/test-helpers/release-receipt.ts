import type { ReleaseReceipt } from '#/api/released-deliverables'
import { managedRelease } from './managed-retention'
export const releaseReceipt: ReleaseReceipt = {
  release: { id: '11111111-1111-4111-8111-111111111111', organizationId: 'org', organizationName: 'Synthetic Research', packageType: 'LabResult', packageId: '22222222-2222-4222-8222-222222222222', releasedAtUtc: '2026-08-01T12:00:00Z', downloadAccessClosedAtUtc: '2026-09-05T12:00:00Z', byteDeletedAtUtc: '2026-09-05T12:10:00Z', deletionOutcome: 'Deleted', isQuarantined: false },
  retention: { ...managedRelease.retention!, releasedAtUtc: '2026-08-01T12:00:00Z', standardDeletionAtUtc: '2026-08-31T12:00:00Z', potentialFinalDeletionAtUtc: '2026-09-05T12:00:00Z', graceActivatedAtUtc: '2026-08-31T12:00:00Z', downloadAccessClosedAtUtc: '2026-09-05T12:00:00Z', byteDeletedAtUtc: '2026-09-05T12:10:00Z', deletionOutcome: 'Deleted' },
  workflowId: 'workflow', workflowPath: '/lab-services/workflow', version: 4, canManage: false, canQuarantine: true, generatedAtUtc: '2026-09-05T13:00:00Z', deletionDueAtUtc: '2026-09-05T12:00:00Z',
  lineage: { scope: 'Sample', customerSampleIds: ['RNA-research-01'], supplierTubeBarcodes: ['SUPPLIER-001'], accessionId: 'PHAENO-001' },
  files: [{ id: 'file', name: 'sample-transcript-isoform-expression-results-with-a-long-filename-αβ.txt', sizeBytes: 128, sha256: 'a'.repeat(64), downloadedAtUtc: '2026-09-05T12:01:00Z' }],
  downloads: [{ id: 'attempt', fileId: 'file', userId: 'member', userName: 'Synthetic Member', scope: 'IndividualFile', outcome: 'Succeeded', startedAtUtc: '2026-09-05T11:59:00Z', completedAtUtc: '2026-09-05T12:01:00Z', completedAfterCutoff: true }], holds: [], reissues: [],
}
