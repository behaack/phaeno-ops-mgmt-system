import { expect, it, vi } from 'vitest'
import type { LabBatch } from '#/api/lab-operations'
import { nextVendorStage, vendorStage, vendorEtaOverdue, shipmentPairIssue } from './vendor-workflow'
import type { SequencingTubeMember } from '#/api/lab-material-transfers'
const batch: LabBatch = { id: 'batch', name: 'Test batch', batchNumber: 'PH-BAT', batchType: 'ExternalSequencing', status: 'Complete', startedAtUtc: null, completedAtUtc: null, notes: null, memberCount: 1, sendoutId: 'sendout', sendoutStatus: 'Complete', sendoutVersion: 1, version: 1, libraryExceptionCount: 0, vendorOutcome: null, providerName: null, trackingReference: null, expectedCompletionAtUtc: null }
it('keeps results receipt separate from success and does not infer outcomes for historical complete records', () => {
  expect(nextVendorStage('Sequencing')).toBe('ResultsReceived')
  expect(nextVendorStage('ResultsReceived')).toBeNull()
  expect(vendorStage(batch)).toBe('Complete · outcome unrecorded')
  expect(vendorStage({ ...batch, vendorOutcome: 'Failure' })).toBe('Failure')
})
it('checks both transfer and destination volume against the exact captured minimum', () => {
  const member = { requirementCaptured: true, minimumSequencingVolumeUl: 5, minimumSequencingVolumeUlText: '5', transfer: { quantity: 5, quantityText: '5', quantityUnit: 'uL' }, sequencingTube: { status: 'Available', quantity: 5, quantityText: '5', quantityUnit: 'uL' } } as SequencingTubeMember
  expect(shipmentPairIssue(member)).toBeNull()
  expect(shipmentPairIssue({ ...member, transfer: null })).toContain('physical tube transfer')
  expect(shipmentPairIssue({ ...member, requirementCaptured: false })).toContain('Catalog minimum')
  expect(shipmentPairIssue({ ...member, sequencingTube: { ...member.sequencingTube!, quantityText: '4.9999999999999999999999999999' } })).toContain('minimum')
  expect(shipmentPairIssue({ ...member, transfer: { ...member.transfer!, quantity: 5000, quantityText: '5000', quantityUnit: 'nL' } })).toBeNull()
})
it('shows overdue ETA only while awaiting returned results', () => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-05T12:00:00Z').getTime())
  const overdue = { ...batch, sendoutStatus: 'Sequencing', expectedCompletionAtUtc: '2026-10-04T12:00:00Z' }
  expect(vendorEtaOverdue(overdue)).toBe(true)
  expect(vendorEtaOverdue({ ...overdue, sendoutStatus: 'ResultsReceived' })).toBe(false)
  vi.restoreAllMocks()
})
