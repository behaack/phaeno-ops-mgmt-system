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
const workspace = (hasTube = false): SequencingTubeWorkspace => ({ batchId: 'batch', batchVersion: 3, batchStatus: 'Draft', hasSendout: false, members: [{ id: 'member', labWorkOrderId: 'work', labLibraryId: 'library', libraryKey: 'LIBRARY-123', source, sequencingTube: hasTube ? destination : null, transfer: null }] })
const renderDialog = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SequencingTubesDialog batchId="batch" batchName="Example batch" suppliers={suppliers} canManage onClose={vi.fn()} onChanged={vi.fn().mockResolvedValue(undefined)} /></QueryClientProvider>)

beforeEach(() => { vi.clearAllMocks(); api.get.mockResolvedValue(workspace()) })

describe('sequencing tube material tracking', () => {
  it('keeps transfer unavailable until a generated tube label is scanned back', async () => {
    const pending = { ...destination, barcodeSource: 'PhaenoGenerated' as const, status: 'LabelPending' }
    const assigned = workspace(true)
    api.get.mockResolvedValue({ ...assigned, members: [{ ...assigned.members[0], sequencingTube: pending }] })
    renderDialog()
    expect(await screen.findByText(/scan the physical label back before recording the transfer/)).toBeTruthy()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions' }), { button: 0, ctrlKey: false })
    expect((await screen.findByRole('menuitem', { name: 'Record transfer' })).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('menuitem', { name: 'Print label' })).toBeTruthy()
  })

  it('locks an uncertain allocation and retries the exact command and versions', async () => {
    api.apply.mockRejectedValueOnce(new Error('Interrupted response')).mockResolvedValueOnce(workspace(true))
    renderDialog()
    fireEvent.click(await screen.findByRole('button', { name: 'Assign sequencing tube' }))
    fireEvent.click(screen.getByRole('button', { name: 'Assign sequencing tube' }))
    await screen.findByText('Enter the sequencing tube storage location.')
    expect(api.apply).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Sequencing tube storage location/), { target: { value: 'Sequencing rack A1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Assign sequencing tube' }))
    const retry = await screen.findByRole('button', { name: 'Retry same command' })
    expect(screen.getByLabelText(/Sequencing tube barcode/).closest('fieldset')).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Back to tubes' })).toHaveProperty('disabled', true)
    expect(api.apply).toHaveBeenCalledTimes(1)
    const first = api.apply.mock.calls[0]
    expect(first[2]).toMatchObject({ action: 'allocate', barcodeSource: 'PhaenoGenerated', batchVersion: 3, sourceVersion: 4, location: 'Sequencing rack A1' })
    fireEvent.click(retry)
    await waitFor(() => expect(api.apply).toHaveBeenCalledTimes(2))
    expect(api.apply.mock.calls[1]).toEqual(first)
    await screen.findByText(/Sequencing tube assigned/)
  })

  it('records positive actual material with both physical scans and optional exhaustion', async () => {
    api.get.mockResolvedValue(workspace(true))
    api.apply.mockResolvedValue(workspace(true))
    renderDialog()
    fireEvent.click(await screen.findByRole('button', { name: 'Record transfer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Record transfer' }))
    await screen.findByText('Scan the selected library tube barcode.')
    expect(api.apply).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Scan source library barcode/), { target: { value: source.barcode } })
    fireEvent.change(screen.getByLabelText(/Scan sequencing tube barcode/), { target: { value: destination.barcode } })
    fireEvent.change(screen.getByLabelText(/Actual amount transferred/), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Material exhausted/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /I personally performed/ }))
    expect(screen.queryByRole('option', { name: /Another staff member/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Record transfer' }))
    await waitFor(() => expect(api.apply).toHaveBeenCalledOnce())
    expect(api.apply.mock.calls[0][2]).toMatchObject({ action: 'transfer', confirmedSourceBarcode: source.barcode, confirmedDestinationBarcode: destination.barcode, sourceVersion: 4, destinationVersion: 1, quantityText: '20', quantityUnit: 'µL', materialExhausted: true, performance: { mode: 'now', personallyPerformed: true } })
  })

  it('preserves a precise decimal and compares it with the exact source balance', async () => {
    const preciseSource = { ...source, quantity: 0.12345678901234568, quantityText: '0.123456789012345678901' }
    api.get.mockResolvedValue({ ...workspace(true), members: [{ ...workspace(true).members[0], source: preciseSource }] })
    api.apply.mockResolvedValue(workspace(true))
    renderDialog()
    fireEvent.click(await screen.findByRole('button', { name: 'Record transfer' }))
    fireEvent.change(screen.getByLabelText(/Scan source library barcode/), { target: { value: source.barcode } })
    fireEvent.change(screen.getByLabelText(/Scan sequencing tube barcode/), { target: { value: destination.barcode } })
    fireEvent.change(screen.getByLabelText(/Actual amount transferred/), { target: { value: '0.123456789012345678902' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I personally performed/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Record transfer' }))
    expect(await screen.findByText('The amount exceeds the known library material remaining.')).toBeTruthy()
    expect(api.apply).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Actual amount transferred/), { target: { value: '0.123456789012345678901' } })
    fireEvent.click(screen.getByRole('button', { name: 'Record transfer' }))
    await waitFor(() => expect(api.apply).toHaveBeenCalledOnce())
    expect(api.apply.mock.calls[0][2].quantityText).toBe('0.123456789012345678901')
    expect(api.apply.mock.calls[0][2].quantity).toBeUndefined()
  })

  it('keeps completed or frozen sendouts available for read-only inspection', async () => {
    api.get.mockResolvedValue({ ...workspace(true), batchStatus: 'Complete', hasSendout: true })
    renderDialog()
    await screen.findByText(/The sendout manifest is frozen/)
    expect(screen.queryByRole('button', { name: 'Record transfer' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Assign sequencing tube' })).toBeNull()
    expect(api.apply).not.toHaveBeenCalled()
  })
})
