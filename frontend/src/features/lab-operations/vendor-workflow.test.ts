import { expect, it, vi } from 'vitest'
import type { LabBatch } from '#/api/lab-operations'
import { nextVendorStage, vendorStage, vendorEtaOverdue, shipmentPairIssue, canRecordVendorResults } from './vendor-workflow'
import type { SequencingTubeMember } from '#/api/lab-material-transfers'
const batch: LabBatch = { id: 'batch', name: 'Test batch', batchNumber: 'PH-BAT', batchType: 'ExternalSequencing', status: 'Complete', startedAtUtc: null, completedAtUtc: null, notes: null, memberCount: 1, sendoutId: 'sendout', sendoutStatus: 'Complete', sendoutVersion: 1, version: 1, libraryExceptionCount: 0, vendorOutcome: 'Success', providerName: null, trackingReference: null, expectedCompletionAtUtc: null, resultsVersion: 1, runNotPerformed: false, resultsReceivedAtUtc: '2026-10-06T10:00:00Z' }
it('shows one final results stage independent of library success or failure', () => {
  expect(nextVendorStage('Sequencing')).toBeNull()
  expect(nextVendorStage('ResultsReceived')).toBeNull()
  expect(vendorStage(batch)).toBe('Results received')
  expect(vendorStage({ ...batch, vendorOutcome: 'Failure', resultsReceivedAtUtc: '2026-10-06T10:00:00Z' })).toBe('Results received')
  expect(vendorStage({ ...batch, vendorOutcome: 'Failure', runNotPerformed: true, resultsReceivedAtUtc: null })).toBe('Run not performed')
  expect(vendorStage({ ...batch, sendoutStatus: 'ReceivedByProvider' })).toBe('Vendor received')
})
it('offers initial receipt and later location entry without a completed-record repair path', () => {
  expect(canRecordVendorResults(batch)).toBe(true)
  expect(canRecordVendorResults({ ...batch, vendorOutcome: 'Success' })).toBe(true)
  expect(canRecordVendorResults({ ...batch, sendoutId: null })).toBe(false)
  expect(canRecordVendorResults({ ...batch, vendorOutcome: null, resultsReceivedAtUtc: null })).toBe(false)
  expect(canRecordVendorResults({ ...batch, runNotPerformed: true, resultsReceivedAtUtc: null })).toBe(true)
  expect(canRecordVendorResults({ ...batch, status: 'InProgress', sendoutStatus: 'ReceivedByProvider' })).toBe(true)
  expect(canRecordVendorResults({ ...batch, status: 'InProgress', sendoutStatus: 'Sequencing' })).toBe(false)
  expect(canRecordVendorResults({ ...batch, status: 'InProgress', sendoutStatus: 'ResultsReceived' })).toBe(false)
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
  const overdue = { ...batch, status: 'InProgress', sendoutStatus: 'ReceivedByProvider', expectedCompletionAtUtc: '2026-10-04T12:00:00Z' }
  expect(vendorEtaOverdue(overdue)).toBe(true)
  expect(vendorEtaOverdue({ ...overdue, sendoutStatus: 'Complete' })).toBe(false)
  expect(vendorEtaOverdue({ ...overdue, status: 'Complete' })).toBe(false)
  vi.restoreAllMocks()
})
