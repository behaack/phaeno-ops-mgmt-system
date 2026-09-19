import { describe, expect, it } from 'vitest'
import { captureDefaults, captureMetadata, captureSchema } from './scientific-capture'
import type { ScientificWorkspace } from '#/api/lab-scientific-evidence'
const data = { inputs: [] } as unknown as ScientificWorkspace
const valid = (kind: 'sequencing' | 'analysis') => ({ ...captureDefaults(kind, undefined, data), providerKey: 'Lab', runReference: 'Run 1', start: '2025-01-01T08:00', end: '2025-01-01T09:00', libraryId: 'library', sendoutId: 'submission', mapping: 'lane-1:index-A', fileReference: 'reads.fastq:v1', checksum: 'a'.repeat(64), size: '42', qcSummary: 'Passed', metrics: [{ name: 'yield', value: '2.5', unit: 'Gb' }], inputs: [{ id: 'output', role: 'reads' }], software: [{ name: 'pipeline', version: '1', sha256: '' }], references: [{ name: 'reference', version: '1', sha256: '' }], parameters: 'b'.repeat(64) })
describe('scientific capture', () => {
  it.each(['sequencing', 'analysis'] as const)('preserves required %s metadata and exact file attribution', kind => { const v = captureSchema.parse(valid(kind)); const m = captureMetadata(v); expect(m.runStartedAtUtc).toMatch(/Z$/); if (kind === 'analysis') expect(m.inputRoles).toEqual([{ sequencingOutputId: 'output', role: 'reads' }]); else expect(m.qcMetrics?.yield.value).toBe(2.5) })
  it('requires exact hashes, positive whole bytes, QC and ordered real dates', () => {
    for (const patch of [{ checksum: 'short' }, { size: '0' }, { size: '1.2' }, { metrics: [] }, { start: '2025-02-30T08:00' }, { end: '2024-01-01T08:00' }, { isCorrection: true }, { metrics: [{ name: '', value: 'NaN', unit: '' }] }]) expect(captureSchema.safeParse({ ...valid('sequencing'), ...patch }).success).toBe(false)
  })
  it('keeps the original timestamp precision when only other evidence is corrected', () => {
    const v = valid('sequencing'); const minute = captureMetadata(v).runStartedAtUtc!
    const original = minute.replace(':00.000Z', ':37.123456Z')
    expect(captureMetadata(v, { schemaVersion: 1, runStartedAtUtc: original }).runStartedAtUtc).toBe(original)
    expect(captureMetadata({ ...v, start: '2025-01-01T07:00' }, { schemaVersion: 1, runStartedAtUtc: original }).runStartedAtUtc).not.toBe(original)
  })
  it('requires input roles and complete version records', () => { for (const patch of [{ inputs: [] }, { inputs: [{ id: 'a', role: '' }] }, { software: [{ name: '', version: '', sha256: '' }] }, { references: [] }, { parameters: '' }]) expect(captureSchema.safeParse({ ...valid('analysis'), ...patch }).success).toBe(false) })
  it('explained not-applicable choices omit hidden incomplete rows without losing typed form values', () => {
    const v = { ...valid('analysis'), softwareNa: true, softwareReason: 'Manual review only', software: [{ name: '', version: '', sha256: 'unfinished' }] }
    const m = captureMetadata(captureSchema.parse(v)); expect(m.software).toBeUndefined(); expect(m.notApplicable).toEqual({ software: 'Manual review only' }); expect(v.software).toHaveLength(1)
    expect(captureSchema.safeParse({ ...v, softwareReason: '' }).success).toBe(false)
  })
  it('requires valid optional submission/receipt ordering and QC document identities', () => {
    expect(captureSchema.safeParse({ ...valid('sequencing'), submitted: '2025-01-02T00:00', received: '2025-01-01T00:00' }).success).toBe(false)
    const v = { ...valid('sequencing'), metrics: [], documents: [{ role: 'qc', externalFileReference: 'qc.pdf:v1', sha256: 'c'.repeat(64), sizeBytes: '123' }] }; expect(captureSchema.safeParse(v).success).toBe(true); expect(captureSchema.safeParse({ ...v, documents: [{ ...v.documents[0], sizeBytes: '0' }] }).success).toBe(false)
  })
})
