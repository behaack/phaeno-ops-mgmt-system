import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SequencingTubeWorkspace } from '#/api/lab-material-transfers'
import type { LabContainer } from '#/api/lab-operations'
import { SequencingTubesDialog } from './SequencingTubesDialog'

const api = vi.hoisted(() => ({ get: vi.fn(), apply: vi.fn(), blocker: vi.fn() }))
vi.mock('./lab-command-recovery', async original => ({ ...await original<typeof import('./lab-command-recovery')>(), useLabCommandRecovery: () => ({ data: null, isFetched: true, retain: async () => undefined, clear: async () => undefined, refetch: async () => undefined }) }))
vi.mock('#/api/lab-material-transfers', () => ({ getSequencingTubes: api.get, applySequencingTubeCommand: api.apply }))
const suppliers = [{ id: 'supplier-1', name: 'Tube maker', isActive: true }]
vi.mock('@tanstack/react-router', () => ({ useBlocker: api.blocker, Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ session: { user: { id: 'operator' } } }) }))
vi.mock('./LabLabelDialog', () => ({ LabLabelDialog: () => <div>Label dialog</div> }))

const source: LabContainer = { id: 'source', labSpecimenId: 'sample', parentContainerId: 'original', kind: 'Library', barcode: 'LIBRARY-123', barcodeSource: 'PhaenoGenerated', externalBarcodeReferenceId: null, label: 'Library', labelPrintCount: 1, location: 'Freezer A', quantity: 100, quantityUnit: 'µL', status: 'Available', retainUntilUtc: null, version: 4 }
const destination: LabContainer = { ...source, id: 'destination', parentContainerId: 'source', kind: 'Sequencing', barcode: 'SEQUENCING-123', barcodeSource: 'Manufacturer', label: 'Sequencing tube', labelPrintCount: 0, quantity: null, quantityUnit: null, version: 1 }
const workspace = (hasTube = false): SequencingTubeWorkspace => ({ batchId: 'batch', batchVersion: 3, batchStatus: 'Draft', hasSendout: false, members: [{ id: 'member', labWorkOrderId: 'work', labLibraryId: 'library', libraryKey: 'LIBRARY-123', source, sequencingTube: hasTube ? destination : null, transfer: null, catalogItemId: 'catalog', catalogServiceName: 'PSeq', catalogVersion: 4, minimumSequencingVolumeUl: 5, minimumSequencingVolumeUlText: '5', requirementCaptured: hasTube }] })
const renderDialog = (onClose = vi.fn()) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SequencingTubesDialog batchId="batch" batchName="Example batch" suppliers={suppliers} canManage onClose={onClose} onChanged={vi.fn().mockResolvedValue(undefined)} /></QueryClientProvider>)

beforeEach(() => { vi.clearAllMocks(); api.blocker.mockReturnValue({ status: 'idle' }); api.get.mockResolvedValue(workspace()) })

describe('sequencing tube material tracking', () => {
  it('focuses Keep editing and retains an unsaved scan until explicit discard', async () => {
    const onClose = vi.fn()
    renderDialog(onClose)
    await screen.findByLabelText(/Scan source library barcode/)
    fireEvent.change(screen.getByLabelText(/Scan source library barcode/), { target: { value: 'WRONG-TUBE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Close workspace' }))
    const cancel = await screen.findByRole('button', { name: 'Keep editing' })
    expect(document.activeElement).toBe(cancel)
    expect(cancel.closest('[role="dialog"]')?.querySelector('[data-slot="dialog-body"]')?.textContent).toContain('unsaved scans')
    fireEvent.click(cancel)
    expect(screen.getByLabelText(/Scan source library barcode/)).toHaveProperty('value', 'WRONG-TUBE')
    fireEvent.click(screen.getByRole('button', { name: 'Close workspace' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard entry' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(api.apply).not.toHaveBeenCalled()
  })

  it('shows the Catalog requirement read-only and blocks an unconfigured service', async () => {
    const data = workspace()
    api.get.mockResolvedValue({ ...data, members: [{ ...data.members[0], minimumSequencingVolumeUl: null, minimumSequencingVolumeUlText: null }] })
    renderDialog()
    expect(await screen.findByRole('button', { name: 'Prepare sequencing tube' })).toHaveProperty('disabled', true)
    expect(screen.getByText(/Catalog administrator must configure/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /minimum volume/i })).toBeNull()
    expect(screen.queryByRole('textbox', { name: /minimum volume/i })).toBeNull()
    expect(api.apply).not.toHaveBeenCalled()
  })

  it('matches a scanned library and shows its own service requirement', async () => {
    const data = workspace()
    api.get.mockResolvedValue({ ...data, members: [...data.members, { ...data.members[0], id: 'second', source: { ...source, id: 'second-source', barcode: 'SECOND-LIBRARY' }, catalogItemId: 'second-service', catalogServiceName: 'Second service', minimumSequencingVolumeUl: 7, minimumSequencingVolumeUlText: '7' }] })
    renderDialog()
    const scan = await screen.findByLabelText(/Scan source library barcode/)
    fireEvent.change(scan, { target: { value: 'SECOND-LIBRARY' } })
    fireEvent.keyDown(scan, { key: 'Enter' })
    await screen.findByText('7 µL per tube')
    expect(screen.getByLabelText('Library to prepare')).toHaveProperty('value', 'second')
    expect(document.activeElement).toBe(screen.getByLabelText(/Sequencing tube barcode/))
    expect(screen.queryByRole('button', { name: 'Discard entry' })).toBeNull()
    expect(api.apply).not.toHaveBeenCalled()
  })

  it('blocks below-minimum volume and previews the exact debit at the minimum', async () => {
    api.get.mockResolvedValue({ ...workspace(true), members: [{ ...workspace(true).members[0], source: { ...source, quantity: 20, quantityText: '20' } }] })
    api.apply.mockResolvedValue(workspace(true))
    renderDialog()
    await screen.findByLabelText(/Scan sequencing tube barcode/)
    fireEvent.change(screen.getByLabelText(/Scan source library barcode/), { target: { value: source.barcode } })
    fireEvent.change(screen.getByLabelText(/Scan sequencing tube barcode/), { target: { value: destination.barcode } })
    fireEvent.change(screen.getByLabelText(/Actual amount transferred/), { target: { value: '4.9999999999999999999999999999' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I personally performed/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save pair and transfer' }))
    expect(await screen.findByText(/Enter at least 5 µL/)).toBeTruthy()
    expect(api.apply).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Actual amount transferred/), { target: { value: '5' } })
    expect(screen.getByText('15 µL')).toBeTruthy()
    expect(screen.getByText('Meets minimum volume')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save pair and transfer' }))
    await waitFor(() => expect(api.apply).toHaveBeenCalledOnce())
    expect(api.apply.mock.calls[0][2].quantityText).toBe('5')
  })

  it('keeps transfer unavailable until a generated tube label is scanned back', async () => {
    const pending = { ...destination, barcodeSource: 'PhaenoGenerated' as const, status: 'LabelPending' }
    const assigned = workspace(true)
    api.get.mockResolvedValue({ ...assigned, members: [{ ...assigned.members[0], sequencingTube: pending }] })
    renderDialog()
    expect(await screen.findByRole('button', { name: 'Save pair and transfer' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Print and verify label' })).toBeTruthy()
  })

  it('retains the saved pair evidence and advances to the next library after transfer', async () => {
    const data = workspace(true)
    const second = { ...data.members[0], id: 'second', source: { ...source, id: 'second-source', barcode: 'SECOND-LIBRARY' }, sequencingTube: null, requirementCaptured: false }
    const before = { ...data, members: [...data.members, second] }
    api.get.mockResolvedValue(before)
    api.apply.mockResolvedValue({ ...before, batchVersion: 4, members: [{ ...data.members[0], source: { ...source, quantity: 95, quantityText: '95' }, transfer: {
      id: 'transfer', sourceContainerId: source.id, sourceBarcode: source.barcode, destinationContainerId: destination.id, destinationBarcode: destination.barcode,
      quantity: 5, quantityText: '5', quantityUnit: 'µL', sourceQuantityBefore: 100, sourceQuantityAfter: 95, sourceQuantityAfterText: '95', sourceQuantityBasis: null,
      exhaustedOverride: false, balanceAdjustmentQuantity: null, performedByUserId: 'operator', performedAtUtc: '2026-10-04T21:00:00Z', recordedByUserId: 'operator', recordedAtUtc: '2026-10-04T21:00:00Z',
    } }, second] })
    renderDialog()
    await screen.findByLabelText(/Scan sequencing tube barcode/)
    fireEvent.change(screen.getByLabelText(/Scan source library barcode/), { target: { value: source.barcode } })
    fireEvent.change(screen.getByLabelText(/Scan sequencing tube barcode/), { target: { value: destination.barcode } })
    fireEvent.change(screen.getByLabelText(/Actual amount transferred/), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I personally performed/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save pair and transfer' }))
    await screen.findByText('1 of 2 library/sequencing tube pairs recorded')
    await waitFor(() => expect(screen.getByLabelText('Library to prepare')).toHaveProperty('value', 'second'))
    expect(document.activeElement).toBe(screen.getByLabelText(/Scan source library barcode/))
    expect(screen.getByLabelText(/Scan source library barcode/)).toHaveProperty('value', '')
    expect(screen.getByText('95 µL')).toBeTruthy()
    expect(screen.getByText('Actual volume transferred')).toBeTruthy()
    expect(api.apply).toHaveBeenCalledOnce()
  })

  it('locks an uncertain allocation and retries the exact command and versions', async () => {
    api.apply.mockRejectedValueOnce(new Error('Interrupted response')).mockResolvedValueOnce(workspace(true))
    renderDialog()
    await screen.findByLabelText(/Scan source library barcode/)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare sequencing tube' }))
    await screen.findByText('Enter the sequencing tube storage location.')
    expect(api.apply).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Scan source library barcode/), { target: { value: source.barcode } })
    fireEvent.change(screen.getByLabelText(/Sequencing tube storage location/), { target: { value: 'Sequencing rack A1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Prepare sequencing tube' }))
    const retry = await screen.findByRole('button', { name: 'Retry same command' })
    expect(screen.getByLabelText(/Sequencing tube barcode/).closest('fieldset')).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Close workspace' })).toHaveProperty('disabled', true)
    expect(api.apply).toHaveBeenCalledTimes(1)
    const first = api.apply.mock.calls[0]
    expect(first[2]).toMatchObject({ action: 'allocate', barcodeSource: 'PhaenoGenerated', batchVersion: 3, sourceVersion: 4, location: 'Sequencing rack A1' })
    fireEvent.click(retry)
    await waitFor(() => expect(api.apply).toHaveBeenCalledTimes(2))
    expect(api.apply.mock.calls[1]).toEqual(first)
    await screen.findByRole('button', { name: 'Save pair and transfer' })
    expect(screen.getByLabelText(/Scan sequencing tube barcode/)).toBeTruthy()
  })

  it('records positive actual material with both physical scans and optional exhaustion', async () => {
    api.get.mockResolvedValue(workspace(true))
    api.apply.mockResolvedValue(workspace(true))
    renderDialog()
    await screen.findByLabelText(/Scan sequencing tube barcode/)
    fireEvent.click(screen.getByRole('button', { name: 'Save pair and transfer' }))
    await screen.findByText('Scan the selected library tube barcode.')
    expect(api.apply).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Scan source library barcode/), { target: { value: source.barcode } })
    fireEvent.change(screen.getByLabelText(/Scan sequencing tube barcode/), { target: { value: destination.barcode } })
    fireEvent.change(screen.getByLabelText(/Actual amount transferred/), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Material exhausted/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /I personally performed/ }))
    expect(screen.queryByRole('option', { name: /Another staff member/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Save pair and transfer' }))
    await waitFor(() => expect(api.apply).toHaveBeenCalledOnce())
    expect(api.apply.mock.calls[0][2]).toMatchObject({ action: 'transfer', confirmedSourceBarcode: source.barcode, confirmedDestinationBarcode: destination.barcode, sourceVersion: 4, destinationVersion: 1, quantityText: '20', quantityUnit: 'µL', materialExhausted: true, performance: { mode: 'now', personallyPerformed: true } })
  })

  it('preserves a precise decimal and compares it with the exact source balance', async () => {
    const preciseSource = { ...source, quantity: 0.12345678901234568, quantityText: '0.123456789012345678901' }
    api.get.mockResolvedValue({ ...workspace(true), members: [{ ...workspace(true).members[0], minimumSequencingVolumeUl: 0.1, minimumSequencingVolumeUlText: '0.1', source: preciseSource }] })
    api.apply.mockResolvedValue(workspace(true))
    renderDialog()
    await screen.findByLabelText(/Scan sequencing tube barcode/)
    fireEvent.change(screen.getByLabelText(/Scan source library barcode/), { target: { value: source.barcode } })
    fireEvent.change(screen.getByLabelText(/Scan sequencing tube barcode/), { target: { value: destination.barcode } })
    fireEvent.change(screen.getByLabelText(/Actual amount transferred/), { target: { value: '0.123456789012345678902' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I personally performed/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save pair and transfer' }))
    expect(await screen.findByText('The amount exceeds the known library material remaining.')).toBeTruthy()
    expect(api.apply).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Actual amount transferred/), { target: { value: '0.123456789012345678901' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save pair and transfer' }))
    await waitFor(() => expect(api.apply).toHaveBeenCalledOnce())
    expect(api.apply.mock.calls[0][2].quantityText).toBe('0.123456789012345678901')
    expect(api.apply.mock.calls[0][2].quantity).toBeUndefined()
  })

  it('keeps completed or frozen sendouts available for read-only inspection', async () => {
    api.get.mockResolvedValue({ ...workspace(true), batchStatus: 'Complete', hasSendout: true })
    renderDialog()
    await screen.findByText(/This batch is read-only/)
    expect(screen.queryByRole('button', { name: 'Save pair and transfer' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Prepare sequencing tube' })).toBeNull()
    expect(api.apply).not.toHaveBeenCalled()
  })
})
