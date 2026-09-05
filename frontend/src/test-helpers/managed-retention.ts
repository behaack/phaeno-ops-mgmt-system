import type { LabResultRelease, OperationalFile } from '#/api/order-management'
import { governedRetentionPackage } from './governed-retention'

export const managedFile: OperationalFile = {
  id: 'managed-file', parentRecordId: 'sample', purpose: 'LabResult', fileName: 'analysis-results.txt', fileKind: 'report',
  contentType: 'text/plain', sizeBytes: 16, scanStatus: 'Clean', releaseStatus: 'Released',
  releasedAt: '2026-08-01T12:00:00Z', createdAt: '2026-08-01T12:00:00Z', version: 1,
}
export const managedRelease: LabResultRelease = {
  id: 'managed-release', labSampleId: 'sample', releaseVersion: 1, analysisProfile: 'PSeq', pipelineVersion: 'synthetic',
  provenance: 'Synthetic fixture', qcStatus: 'Passed', manifestJson: JSON.stringify({ files: [{ id: managedFile.id }] }),
  releaseStatus: 'Released', generatedAt: '2026-08-01T12:00:00Z', releasedAt: '2026-08-01T12:00:00Z',
  retention: governedRetentionPackage.retention!, version: 1,
}
