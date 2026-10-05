import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { LabBatchDetail, LabContainer, SequencingVendor } from '#/api/lab-operations'
import { VendorBatchDialog, type VendorDialogKind } from './VendorBatchDialog'

const api = vi.hoisted(() => ({ finalize: vi.fn(), reference: vi.fn(), vendors: vi.fn(), prepare: vi.fn() }))
vi.mock('@tanstack/react-router', async importOriginal => ({ ...await importOriginal<object>(), useBlocker: () => ({ status: 'idle' }) }))
vi.mock('#/api/lab-operations', async importOriginal => ({ ...await importOriginal<object>(), finalizeVendorOutcome: api.finalize, addVendorResultReference: api.reference, getSequencingVendors: api.vendors, createLabSendout: api.prepare }))
const container: LabContainer = { id: 'tube', labSpecimenId: 'sample', parentContainerId: null, kind: 'Library', barcode: 'PB-1', barcodeSource: 'Manufacturer', externalBarcodeReferenceId: null, label: 'Library', labelPrintCount: 0, location: null, quantity: 10, quantityUnit: 'uL', status: 'Available', retainUntilUtc: null, version: 1 }
const workspace: LabBatchDetail = {
  batch: { id: 'batch', name: 'Test batch', batchNumber: 'PH-BAT-TEST', batchType: 'ExternalSequencing', status: 'InProgress', startedAtUtc: null, completedAtUtc: null, notes: null, memberCount: 1, sendoutId: 'sendout', sendoutStatus: 'ResultsReceived', sendoutVersion: 7, version: 3, libraryExceptionCount: 0, vendorOutcome: null, providerName: 'Vendor', trackingReference: 'TRACK-1', expectedCompletionAtUtc: null },
  sendout: { id: 'sendout', vendorSupplierId: null, vendorProductId: null, vendorShipmentAddressId: null, vendorShipmentAddressVersion: null, vendorProductName: null, vendorShipmentAddressLabel: null, providerName: 'Vendor', providerReference: null, manifestJson: '{}', destination: 'Dock', carrier: 'Carrier', trackingReference: 'TRACK-1', expectedCompletionAtUtc: null, shippedAtUtc: null, providerReceivedAtUtc: null, sequencingStartedAtUtc: null, resultsReceivedAtUtc: null, outcome: null, outcomeAtUtc: null, outcomeNote: null },
  tubes: { batchId: 'batch', batchStatus: 'InProgress', batchVersion: 3, hasSendout: true, members: [{ id: 'member', labWorkOrderId: 'work', labLibraryId: 'library', libraryKey: 'LIB-1', source: container, sequencingTube: { ...container, id: 'seq', kind: 'SequencingTube', barcode: 'SEQ-1', quantity: 5, quantityText: '5' }, transfer: { id: 'transfer', sourceContainerId: 'tube', sourceBarcode: 'PB-1', destinationContainerId: 'seq', destinationBarcode: 'SEQ-1', quantity: 5, quantityText: '5', quantityUnit: 'uL', sourceQuantityBefore: 15, sourceQuantityAfter: 10, sourceQuantityBasis: 'Measured', exhaustedOverride: false, balanceAdjustmentQuantity: null, performedByUserId: 'operator', recordedByUserId: 'operator', performedAtUtc: '2026-10-05T12:00:00Z', recordedAtUtc: '2026-10-05T12:00:00Z' }, catalogItemId: 'catalog', catalogServiceName: 'Service', catalogVersion: 1, minimumSequencingVolumeUl: 5, minimumSequencingVolumeUlText: '5', requirementCaptured: true }] }, resultReferences: [], libraryExceptions: [], custody: [],
}
function vendor(id: string): SequencingVendor { return { id, name: `Vendor ${id}`, version: 1, products: [{ id: `service-${id}`, productNumber: `Service ${id}`, description: 'Sequencing service', version: 2 }], shipmentAddresses: ['A', 'B'].map(label => ({ id: `address-${id}-${label}`, supplierId: id, label: `Dock ${label}`, recipient: null, addressLine1: `1 Test Street ${label}`, addressLine2: null, city: 'Test City', region: null, postalCode: null, countryCode: 'US', phone: null, instructions: null, destination: `1 Test Street ${label}\nTest City\nUS`, version: 3, isActive: true })) } }
function show(kind: VendorDialogKind, model = workspace) { const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return { queryClient, ...render(<QueryClientProvider client={queryClient}><VendorBatchDialog kind={kind} workspace={model} onClose={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} /></QueryClientProvider>) } }
beforeEach(() => { api.finalize.mockReset().mockResolvedValue(workspace.batch); api.reference.mockReset().mockResolvedValue(workspace.batch); api.vendors.mockReset().mockResolvedValue([vendor('one'), vendor('two')]); api.prepare.mockReset().mockResolvedValue(workspace.batch) })

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

it('requires a reason for each exception and saves the default outcome plus exact member override', async () => {
  show('outcome')
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByRole('dialog').querySelector('[data-slot="dialog-body"]')?.textContent).toContain('Test batch')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.change(screen.getByLabelText(/Vendor report and decision evidence/), { target: { value: 'Vendor final report' } })
  fireEvent.click(screen.getByRole('button', { name: 'Record success and complete batch' }))
  expect(await screen.findByText('Record the exception reason.')).toBeTruthy()
  expect(api.finalize).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(/Failure reason/), { target: { value: 'Low read yield' } })
  fireEvent.click(screen.getByRole('button', { name: 'Record success and complete batch' }))
  await waitFor(() => expect(api.finalize).toHaveBeenCalledWith('sendout', expect.objectContaining({ version: 7, outcome: 'Success', evidence: 'Vendor final report', exceptions: [{ memberId: 'member', outcome: 'Failure', reason: 'Low read yield' }] })))
})

it('rejects signed locations and saves a member-scoped unverified permanent reference', async () => {
  show('reference')
  fireEvent.change(screen.getByLabelText(/Reference label/), { target: { value: 'Read manifest' } })
  fireEvent.change(screen.getByLabelText(/External storage location/), { target: { value: 'https://storage.example/reads?token=secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add storage reference' }))
  expect(await screen.findByText(/Use a permanent location/)).toBeTruthy()
  expect(api.reference).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(/External storage location/), { target: { value: 's3://example/library/manifest.csv' } })
  fireEvent.change(screen.getByLabelText(/Library scope/), { target: { value: 'member' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add storage reference' }))
  await waitFor(() => expect(api.reference).toHaveBeenCalledWith('sendout', expect.objectContaining({ memberId: 'member', version: 7, label: 'Read manifest', storageReference: 's3://example/library/manifest.csv' })))
})

it('shows incomplete tube pairs and prevents preparation before physical transfer evidence', async () => {
  show('prepare', { ...workspace, sendout: null, tubes: { ...workspace.tubes, hasSendout: false, members: [{ ...workspace.tubes.members[0], transfer: null }] } })
  await screen.findByRole('option', { name: 'Vendor one' })
  expect(screen.getByRole('alert').textContent).toContain('0 of 1 tube pairs are ready')
  expect(screen.getByText('Record the physical tube transfer.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Prepare shipment' })).toHaveProperty('disabled', true)
  expect(api.prepare).not.toHaveBeenCalled()
})

it('protects a dirty storage draft and retains its location when keeping the entries', async () => {
  show('reference')
  fireEvent.change(screen.getByLabelText(/External storage location/), { target: { value: 's3://example/manifest.csv' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(await screen.findByRole('dialog', { name: 'Discard unsaved add external storage reference?' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Keep reviewing' }))
  expect(screen.getByLabelText(/External storage location/)).toHaveProperty('value', 's3://example/manifest.csv')
  expect(api.reference).not.toHaveBeenCalled()
})
