import { expect, it } from 'vitest'
import { captureRun, runCaptureIssue, runCaptureValues } from './vendor-run-capture'

it('keeps two actual runs under one job distinct by selected file group', () => {
  const a = { ...runCaptureValues('set', 1), runReference: 'RUN-A', start: '2026-10-20T10:00:00', end: '2026-10-20T11:00:00' }
  const b = { ...a, groupNumber: 2, runReference: 'RUN-B', instrument: 'Instrument B', indexMapping: 'INDEX-B' }
  expect(runCaptureIssue(a)).toBeUndefined()
  expect(captureRun(a).scientificEvidence.runStartedAtUtc).toBe('2026-10-20T10:00:00Z')
  expect(captureRun(b)).toMatchObject({ runReference: 'RUN-B', groupNumber: 2, scientificEvidence: { instrument: 'Instrument B', indexMapping: 'INDEX-B' } })
})
it('refuses missing run identity/times and incomplete scientific document fingerprints', () => {
  const row = runCaptureValues('set', 1)
  expect(runCaptureIssue(row)).toContain('reference')
  row.runReference = 'RUN-A'; expect(runCaptureIssue(row)).toContain('UTC')
  row.start = '2026-10-20T10:00:00'; row.end = '2026-10-20T11:00:00'; row.documentReference = 'vendor:document'
  expect(runCaptureIssue(row)).toContain('SHA-256')
})
it('retains unedited scientific evidence across notes-only receipt edits', () => {
  const saved = { setId: 'set', groupNumber: 1, runReference: 'RUN-A', scientificEvidence: { schemaVersion: 1 as const,
    runStartedAtUtc: '2026-10-20T10:00:00.123456Z', runCompletedAtUtc: '2026-10-20T11:00:00.654321Z',
    workflowVersion: 'Protocol 3', qcSummary: 'Recorded vendor QC', software: [{ name: 'Demux', version: '2' }, { name: 'Other', version: '4' }],
    documents: [{ role: 'qc', externalFileReference: 'vendor:qc', sha256: 'A'.repeat(64), sizeBytes: 100 }] } }
  expect(captureRun(runCaptureValues('set', 1, saved))).toEqual(saved)
})
