import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { LabBatch, LabBatchDetail } from '#/api/lab-operations'
import { SequencingSendoutProgress } from './SequencingSendoutProgress'

const batch: LabBatch = { id: 'batch', name: 'Test batch', batchNumber: 'PH-BAT-TEST', batchType: 'ExternalSequencing', status: 'InProgress', startedAtUtc: null, completedAtUtc: null, notes: null, memberCount: 1, sendoutId: 'sendout', sendoutStatus: 'ReceivedByProvider', sendoutVersion: 1, version: 1, libraryExceptionCount: 0, vendorOutcome: null, providerName: 'SIMULATED vendor', trackingReference: null, expectedCompletionAtUtc: null, resultsVersion: null, runNotPerformed: null, resultsReceivedAtUtc: null }
const sendout: NonNullable<LabBatchDetail['sendout']> = { id: 'sendout', vendorSupplierId: null, vendorProductId: null, vendorShipmentAddressId: null, vendorShipmentAddressVersion: null, vendorProductName: null, vendorShipmentAddressLabel: null, providerName: 'SIMULATED vendor', providerReference: null, manifestJson: '{}', destination: null, carrier: null, trackingReference: null, expectedCompletionAtUtc: null, shippedAtUtc: '2026-10-04T10:00:00Z', providerReceivedAtUtc: '2026-10-04T11:00:00Z', sequencingStartedAtUtc: null, sequencingCompletedAtUtc: null, runNotPerformed: null, resultsReceivedAtUtc: null, outcome: null, outcomeAtUtc: null, outcomeNote: null }

it('waits at the single results step after vendor receipt', () => {
  render(<SequencingSendoutProgress batch={batch} sendout={sendout} />)
  expect(screen.getByText('3 of 4 steps complete')).toBeTruthy()
  expect(screen.getAllByText('Complete')).toHaveLength(3)
  expect(document.querySelector('[aria-current="step"]')?.textContent).toContain('Results received')
})

it('retains a recorded Failure decision as completed evidence without implying success', () => {
  render(<SequencingSendoutProgress batch={{ ...batch, status: 'Complete', sendoutStatus: 'Complete', vendorOutcome: 'Failure' }} sendout={{ ...sendout, sequencingCompletedAtUtc: '2026-10-04T11:30:00Z', runNotPerformed: false, sequencingStartedAtUtc: '2026-10-04T11:15:00Z', resultsReceivedAtUtc: '2026-10-04T11:45:00Z', outcome: 'Failure', outcomeAtUtc: '2026-10-04T11:45:00Z' }} />)
  expect(screen.getByText('4 of 4 steps complete')).toBeTruthy()
  expect(screen.queryByText('Failure')).toBeNull()
  expect(screen.queryByText('Not recorded')).toBeNull()
  expect(document.querySelector('[aria-current="step"]')).toBeNull()
})
