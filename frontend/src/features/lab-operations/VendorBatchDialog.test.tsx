import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { LabBatchDetail, LabContainer, SequencingVendor } from '#/api/lab-operations'
import { VendorBatchDialog, type VendorDialogKind } from './VendorBatchDialog'

const api = vi.hoisted(() => ({ vendors: vi.fn(), prepare: vi.fn() }))
vi.mock('@tanstack/react-router', async importOriginal => ({ ...await importOriginal<object>(), useBlocker: () => ({ status: 'idle' }) }))
vi.mock('#/api/lab-operations', async importOriginal => ({ ...await importOriginal<object>(), getSequencingVendors: api.vendors, createLabSendout: api.prepare }))
const container: LabContainer = { id: 'tube', labSpecimenId: 'sample', parentContainerId: null, kind: 'Library', barcode: 'PB-1', barcodeSource: 'Manufacturer', externalBarcodeReferenceId: null, label: 'Library', labelPrintCount: 0, location: null, quantity: 10, quantityUnit: 'uL', status: 'Available', retainUntilUtc: null, version: 1 }
const workspace: LabBatchDetail = {
  batch: { id: 'batch', name: 'Test batch', batchNumber: 'PH-BAT-TEST', batchType: 'ExternalSequencing', status: 'InProgress', startedAtUtc: null, completedAtUtc: null, notes: null, memberCount: 1, sendoutId: 'sendout', sendoutStatus: 'ResultsReceived', sendoutVersion: 7, version: 3, libraryExceptionCount: 0, vendorOutcome: null, providerName: 'Vendor', trackingReference: 'TRACK-1', expectedCompletionAtUtc: null, resultsVersion: null, runNotPerformed: null, resultsReceivedAtUtc: null },
  sendout: { id: 'sendout', vendorSupplierId: null, vendorProductId: null, vendorShipmentAddressId: null, vendorShipmentAddressVersion: null, vendorProductName: null, vendorShipmentAddressLabel: null, providerName: 'Vendor', providerReference: null, manifestJson: '{}', destination: 'Dock', carrier: 'Carrier', trackingReference: 'TRACK-1', expectedCompletionAtUtc: null, shippedAtUtc: null, providerReceivedAtUtc: null, sequencingStartedAtUtc: null, sequencingCompletedAtUtc: null, runNotPerformed: null, resultsReceivedAtUtc: null, outcome: null, outcomeAtUtc: null, outcomeNote: null },
  tubes: { batchId: 'batch', batchStatus: 'InProgress', batchVersion: 3, hasSendout: true, members: [{ id: 'member', labWorkOrderId: 'work', labLibraryId: 'library', libraryKey: 'LIB-1', source: container, sequencingTube: { ...container, id: 'seq', kind: 'SequencingTube', barcode: 'SEQ-1', quantity: 5, quantityText: '5' }, transfer: { id: 'transfer', sourceContainerId: 'tube', sourceBarcode: 'PB-1', destinationContainerId: 'seq', destinationBarcode: 'SEQ-1', quantity: 5, quantityText: '5', quantityUnit: 'uL', sourceQuantityBefore: 15, sourceQuantityAfter: 10, sourceQuantityBasis: 'Measured', exhaustedOverride: false, balanceAdjustmentQuantity: null, performedByUserId: 'operator', recordedByUserId: 'operator', performedAtUtc: '2026-10-05T12:00:00Z', recordedAtUtc: '2026-10-05T12:00:00Z' }, catalogItemId: 'catalog', catalogServiceName: 'Service', catalogVersion: 1, minimumSequencingVolumeUl: 5, minimumSequencingVolumeUlText: '5', requirementCaptured: true }] }, resultReferences: [], libraryExceptions: [], custody: [],
}
function vendor(id: string): SequencingVendor { return { id, name: `Vendor ${id}`, version: 1, products: [{ id: `service-${id}`, productNumber: `Service ${id}`, description: 'Sequencing service', version: 2 }], shipmentAddresses: ['A', 'B'].map(label => ({ id: `address-${id}-${label}`, supplierId: id, label: `Dock ${label}`, recipient: null, addressLine1: `1 Test Street ${label}`, addressLine2: null, city: 'Test City', region: null, postalCode: null, countryCode: 'US', phone: null, instructions: null, destination: `1 Test Street ${label}\nTest City\nUS`, version: 3, isActive: true })) } }
function show(kind: VendorDialogKind, model = workspace) { const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return { queryClient, ...render(<QueryClientProvider client={queryClient}><VendorBatchDialog kind={kind} workspace={model} onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} /></QueryClientProvider>) } }
beforeEach(() => { api.vendors.mockReset().mockResolvedValue([vendor('one'), vendor('two')]); api.prepare.mockReset().mockResolvedValue(workspace.batch) })

it('clears dependent choices on vendor change and submits the reviewed catalog versions after refresh', async () => {
  const view = show('prepare', { ...workspace, sendout: null })
  await screen.findByRole('option', { name: 'Vendor one' })
  fireEvent.change(screen.getByRole('combobox', { name: /^Vendor/ }), { target: { value: 'one' } })
  fireEvent.change(screen.getByLabelText(/^Sequencing service/), { target: { value: 'service-one' } })
  fireEvent.change(screen.getByLabelText(/^Shipment address/), { target: { value: 'address-one-A' } })
  expect(screen.getByText(/1 Test Street A/)).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: /^Vendor/ }), { target: { value: 'two' } })
  expect(screen.getByLabelText(/^Sequencing service/)).toHaveProperty('value', '')
  expect(screen.getByLabelText(/^Shipment address/)).toHaveProperty('value', '')
  expect(screen.queryByText(/1 Test Street A/)).toBeNull()
  fireEvent.change(screen.getByLabelText(/^Sequencing service/), { target: { value: 'service-two' } })
  fireEvent.change(screen.getByLabelText(/^Shipment address/), { target: { value: 'address-two-B' } })
  const changed = vendor('two'); changed.version = 20; changed.products[0].version = 20; changed.shipmentAddresses[1].version = 20; changed.shipmentAddresses[1].destination = 'Changed destination'
  view.queryClient.setQueryData(['lab-sequencing-vendors'], [vendor('one'), changed])
  fireEvent.click(screen.getByRole('button', { name: 'Prepare shipment' }))
  await waitFor(() => expect(api.prepare).toHaveBeenCalledWith('batch', expect.objectContaining({ vendorSupplierId: 'two', vendorProductId: 'service-two', vendorShipmentAddressId: 'address-two-B', vendorSupplierVersion: 1, vendorProductVersion: 2, vendorShipmentAddressVersion: 3, batchVersion: 3 })))
})

it('explains missing vendor setup and blocks shipment preparation', async () => {
  api.vendors.mockResolvedValue([])
  show('prepare', { ...workspace, sendout: null })
  expect(await screen.findByText(/No sequencing vendors are ready/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Prepare shipment' })).toHaveProperty('disabled', true)
  expect(api.prepare).not.toHaveBeenCalled()
})

it('shows newly configured vendors when an empty catalog refreshes before selection', async () => {
  api.vendors.mockResolvedValue([])
  const view = show('prepare', { ...workspace, sendout: null })
  await screen.findByText(/No sequencing vendors are ready/)
  view.queryClient.setQueryData(['lab-sequencing-vendors'], [vendor('one')])
  expect(await screen.findByRole('option', { name: 'Vendor one' })).toBeTruthy()
  expect(screen.queryByText(/No sequencing vendors are ready/)).toBeNull()
})

it('shows incomplete tube pairs and prevents preparation before physical transfer evidence', async () => {
  show('prepare', { ...workspace, sendout: null, tubes: { ...workspace.tubes, hasSendout: false, members: [{ ...workspace.tubes.members[0], transfer: null }] } })
  await screen.findByRole('option', { name: 'Vendor one' })
  expect(screen.getByRole('alert').textContent).toContain('0 of 1 tube pairs are ready')
  expect(screen.getByText('Record the physical tube transfer.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Prepare shipment' })).toHaveProperty('disabled', true)
  expect(api.prepare).not.toHaveBeenCalled()
})
