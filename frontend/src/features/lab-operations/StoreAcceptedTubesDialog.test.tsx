import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AcceptRemainingTubesInput, LabWorkOrderDetail } from '#/api/lab-operations'
import type { SampleShippingCrosswalkItem, SampleShippingPacketScan } from '#/api/sample-shipping'
import { StoreAcceptedTubesDialog } from './StoreAcceptedTubesDialog'

const api = vi.hoisted(() => ({ scan: vi.fn(), save: vi.fn(), exception: vi.fn(), saved: vi.fn(), close: vi.fn() }))
vi.mock('#/api/lab-operations', () => ({ acceptRemainingLabTubes: api.save, accessionShipmentTube: api.exception, getLabIntakeReasons: async () => [{ code: 'damaged_container', label: 'Damaged container' }], getLabOperationsError: (_: unknown, fallback: string) => fallback }))
vi.mock('#/api/sample-shipping', () => ({ scanRegisteredSampleTube: api.scan }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: () => ({ status: 'idle', reset: vi.fn(), proceed: vi.fn() }) }))

const rows = Array.from({ length: 5 }, (_, index) => ({ tubeSlotId: `slot-${index + 1}`, supplierTubeBarcode: `TUBE-${index + 1}`, customerSampleId: `SAMPLE-${index + 1}` })) as SampleShippingCrosswalkItem[]
const packet = { labWorkOrderId: 'work', shipmentId: 'shipment', shipmentNumber: 'SHP-TEST', barcode: 'PH-P-TEST', containerReceivedAt: '2026-10-02T12:00:00Z', isVoided: false, crosswalk: rows } as SampleShippingPacketScan
const initialWork = { workOrder: { version: 1 }, containers: [] } as unknown as LabWorkOrderDetail

function App({ initial = initialWork }: { initial?: LabWorkOrderDetail }) {
  const [work, setWork] = useState(initial)
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }))
  return <QueryClientProvider client={client}><StoreAcceptedTubesDialog rows={rows} packet={packet} work={work} onClose={api.close} onSaved={async (detail, barcodes, complete) => { setWork(detail); api.saved(barcodes, complete) }} /></QueryClientProvider>
}
async function openBox(barcode: string) {
  const input = await screen.findByLabelText(/freezer box barcode/i)
  fireEvent.change(input, { target: { value: barcode } }); fireEvent.submit(input.closest('form')!)
  await screen.findByLabelText(/Supplier tube barcode/)
}
async function place(barcode: string) {
  const input = screen.getByLabelText(/Supplier tube barcode/)
  fireEvent.change(input, { target: { value: barcode } }); fireEvent.submit(input.closest('form')!)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Scan and place tube' })).toHaveProperty('disabled', false))
}
async function reviewAndSave(count: number) {
  const submittedCount = api.save.mock.calls.length
  fireEvent.click(screen.getByRole('button', { name: 'Review and finish box' }))
  const confirmation = screen.getByRole('checkbox', { name: new RegExp(`I inspected all ${count} tube`) })
  expect(confirmation).toHaveProperty('checked', false)
  expect(screen.queryByText('Confirm inspection and physical placement before saving.')).toBeNull()
  expect(api.save).toHaveBeenCalledTimes(submittedCount)
  fireEvent.click(confirmation); fireEvent.submit(confirmation.closest('form')!)
}

describe('box-at-a-time accession', () => {
  beforeEach(() => {
    api.saved.mockReset(); api.close.mockReset(); api.scan.mockReset(); api.save.mockReset(); api.exception.mockReset()
    api.scan.mockImplementation((_packet, barcode) => Promise.resolve({ supplierTubeBarcode: barcode, isExpected: true, isAccessioned: false }))
    let current = initialWork
    api.save.mockImplementation((_work, _shipment, input: AcceptRemainingTubesInput) => {
      current = { ...current, workOrder: { ...current.workOrder, version: current.workOrder.version + 1 }, containers: [...current.containers, ...input.tubes.map(tube => ({ barcode: tube.supplierTubeBarcode, location: tube.freezerBoxBarcode, intakeDisposition: 'Accepted', status: 'Available' }))] } as LabWorkOrderDetail
      return Promise.resolve(current)
    })
  })

  it('saves a three/two split as exact box groups with separate requests and advancing versions', async () => {
    render(<App />)
    await openBox('BOX-A')
    expect(api.save).not.toHaveBeenCalled()
    for (const barcode of ['TUBE-1', 'TUBE-2', 'TUBE-3']) await place(barcode)
    await reviewAndSave(3)
    await waitFor(() => expect(api.saved).toHaveBeenCalledWith(['TUBE-1', 'TUBE-2', 'TUBE-3'], false))
    const remainingTable = screen.getByRole('table', { name: 'Tubes awaiting an intake decision' })
    expect(within(remainingTable).queryByText('TUBE-1')).toBeNull()
    expect(within(remainingTable).getByText('TUBE-4')).toBeTruthy()
    expect(within(remainingTable).getByText('TUBE-5')).toBeTruthy()
    const accessioned = screen.getByText('Accessioned tubes (3)').closest('details')!
    expect(accessioned.open).toBe(false)
    fireEvent.click(within(accessioned).getByText('Accessioned tubes (3)'))
    expect(accessioned.open).toBe(true)
    expect(within(accessioned).getAllByText('BOX-A')).toHaveLength(3)
    fireEvent.click(within(accessioned).getByText('Accessioned tubes (3)'))
    await openBox('BOX-B')
    for (const barcode of ['TUBE-4', 'TUBE-5']) await place(barcode)
    await reviewAndSave(2)
    await waitFor(() => expect(api.saved).toHaveBeenCalledWith(['TUBE-4', 'TUBE-5'], true))
    const first = api.save.mock.calls[0][2], second = api.save.mock.calls[1][2]
    expect(first).toMatchObject({ workOrderVersion: 1, inspectionConfirmed: true, tubes: ['TUBE-1', 'TUBE-2', 'TUBE-3'].map(supplierTubeBarcode => ({ supplierTubeBarcode, freezerBoxBarcode: 'BOX-A' })) })
    expect(second).toMatchObject({ workOrderVersion: 2, tubes: ['TUBE-4', 'TUBE-5'].map(supplierTubeBarcode => ({ supplierTubeBarcode, freezerBoxBarcode: 'BOX-B' })) })
    expect(first.requestId).not.toBe(second.requestId)
    expect(api.scan.mock.calls.map(call => call[1])).toEqual(['TUBE-1', 'TUBE-2', 'TUBE-3', 'TUBE-4', 'TUBE-5'])
    expect(screen.queryByRole('table', { name: 'Tubes awaiting an intake decision' })).toBeNull()
    expect(screen.getByText('Accessioned tubes (5)').closest('details')).toHaveProperty('open', false)
  }, 15_000)

  it('rejects duplicate, unselected and previously rejected tubes without expanding the group', async () => {
    const rejected = { ...initialWork, containers: [{ barcode: 'TUBE-3', intakeDisposition: 'Rejected', status: 'Rejected' }] } as unknown as LabWorkOrderDetail
    render(<App initial={rejected} />)
    await openBox('BOX-A'); await place('TUBE-1'); await place('TUBE-1')
    expect(await screen.findByText('This tube is already in the box group. It was not added twice.')).toBeTruthy()
    await place('NOT-SELECTED')
    expect(await screen.findByText(/not an expected, undecided tube/)).toBeTruthy()
    await place('TUBE-3')
    expect(screen.getByText(/not an expected, undecided tube/)).toBeTruthy()
    await reviewAndSave(1)
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
    expect(api.save.mock.calls[0][2].tubes).toEqual([{ supplierTubeBarcode: 'TUBE-1', freezerBoxBarcode: 'BOX-A' }])
  })

  it('requires the original box on resume and ignores an in-flight scan from the paused context', async () => {
    let resolveScan!: (value: unknown) => void
    render(<App />)
    await openBox('BOX-A'); await place('TUBE-1')
    api.scan.mockImplementationOnce(() => new Promise(resolve => { resolveScan = resolve }))
    const input = screen.getByLabelText(/Supplier tube barcode/)
    fireEvent.change(input, { target: { value: 'TUBE-2' } }); fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(api.scan).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: 'Pause box' }))
    await act(async () => resolveScan({ supplierTubeBarcode: 'TUBE-2', isExpected: true, isAccessioned: false }))
    const box = screen.getByLabelText(/Rescan freezer box barcode/)
    fireEvent.change(box, { target: { value: 'BOX-B' } }); fireEvent.submit(box.closest('form')!)
    expect(await screen.findByText(/This group belongs to BOX-A/)).toBeTruthy()
    await openBox('BOX-A')
    await reviewAndSave(1)
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
    expect(api.save.mock.calls[0][2].tubes).toEqual([{ supplierTubeBarcode: 'TUBE-1', freezerBoxBarcode: 'BOX-A' }])
  })

  it('locks an uncertain submission and retries the identical payload without a new request identity', async () => {
    api.save.mockRejectedValueOnce(new Error('Response lost'))
    render(<App />)
    await openBox('BOX-A'); await place('TUBE-1'); await reviewAndSave(1)
    expect(await screen.findByText('Box acceptance could not be confirmed')).toBeTruthy()
    expect(screen.queryByLabelText(/Supplier tube barcode/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Back to placement' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry same group' }))
    await waitFor(() => expect(api.saved).toHaveBeenCalledWith(['TUBE-1'], false))
    expect(api.save.mock.calls[1][2]).toEqual(api.save.mock.calls[0][2])
  })

  it('requires a box before any tube scan and excludes a pending tube after its saved exception', async () => {
    const rejectedWork = { ...initialWork, workOrder: { ...initialWork.workOrder, version: 2 }, containers: [{ barcode: 'TUBE-1', intakeDisposition: 'Rejected', status: 'Rejected', location: null }] } as unknown as LabWorkOrderDetail
    api.exception.mockResolvedValue(rejectedWork)
    api.save.mockResolvedValue({ ...rejectedWork, workOrder: { ...rejectedWork.workOrder, version: 3 }, containers: [...rejectedWork.containers, { barcode: 'TUBE-2', location: 'BOX-A', intakeDisposition: 'Accepted', status: 'Available' }] })
    render(<App />)
    expect(screen.queryByLabelText(/Supplier tube barcode/)).toBeNull()
    expect(api.scan).not.toHaveBeenCalled()
    await openBox('BOX-A'); await place('TUBE-1'); await place('TUBE-2')
    fireEvent.click(screen.getByRole('button', { name: 'Record exception for TUBE-1' }))
    expect(await screen.findByText(/Reconcile its physical location before saving/)).toBeTruthy()
    const reason = await screen.findByLabelText(/Intake reason/)
    await screen.findByRole('option', { name: 'Damaged container' })
    fireEvent.change(reason, { target: { value: 'damaged_container' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I have identified/ }))
    fireEvent.submit(reason.closest('form')!)
    await screen.findByText('Not stored')
    const exceptions = screen.getByText('Recorded exceptions (1)').closest('details')!
    expect(exceptions.open).toBe(false)
    expect(screen.queryByText('Accessioned tubes (1)')).toBeNull()
    expect(within(screen.getByRole('table', { name: 'Tubes awaiting an intake decision' })).queryByText('TUBE-1')).toBeNull()
    await openBox('BOX-A'); await reviewAndSave(1)
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
    expect(api.save.mock.calls[0][2]).toMatchObject({ workOrderVersion: 2, tubes: [{ supplierTubeBarcode: 'TUBE-2', freezerBoxBarcode: 'BOX-A' }] })
    expect(api.scan.mock.calls.map(call => call[1])).toEqual(['TUBE-1', 'TUBE-2'])
    expect(await screen.findByText('Not stored')).toBeTruthy()
  })
})
