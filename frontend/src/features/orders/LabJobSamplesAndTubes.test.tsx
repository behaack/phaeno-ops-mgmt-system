import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabServiceOrder } from '#/api/order-management'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import { SampleTubeScanner } from '#/features/sample-shipping/SampleTubeScanner'
import { shippingFixture, shippingTube } from '#/test-helpers/sample-shipping'
import { LabJobSamplesPanel } from './LabJobSamplesPanel'

const mocks = vi.hoisted(() => ({ assign: vi.fn(), correct: vi.fn(), source: vi.fn(), navigate: vi.fn(), blocker: vi.fn() }))
vi.mock('#/features/sample-shipping/use-source-sample-shipments', () => ({ useSourceSampleShipments: mocks.source }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: mocks.blocker, Link: ({ children }: { children: ReactNode }) => <a href="#shipment">{children}</a> }))
vi.mock('./LabSampleDialog', () => ({ LabSampleDialog: () => null }))

const order = {
  id: 'job-1', organizationId: 'org-1', orderNumber: 'ABC12345', version: 1,
  requestedSpecimenCount: 12, sampleRosterFinalizedAt: '2026-09-10T00:00:00Z',
  canEditSamples: false, canFinalizeSamples: false,
  sourceGroups: [{ id: 'source-1', biologicalSource: 'Human PBMCs', specimenCount: 12 }],
  samples: Array.from({ length: 12 }, (_, index) => ({ id: `sample-${index + 1}`, customerSampleId: `RNA-${index + 1}`, biologicalSource: 'Human PBMCs', quantity: index === 0 ? 2 : 1, status: 'Expected' })),
} as LabServiceOrder
const shipment = { ...shippingFixture, authorizationSourceId: order.id,
  crosswalk: Array.from({ length: 12 }, (_, index) => shippingTube(index + 1, { supplierTubeBarcode: index < 10 ? `TUBE-${index + 1}` : null })) }
const split = { ...shippingFixture, id: 'shipment-2', shipmentNumber: 'SHIP-2', crosswalk: [shippingTube(20, { submittedSpecimenId: 'sample-1', customerSampleId: 'RNA-1', tubeOrdinal: 2, totalSampleTubeCount: 2 })] }

function show(initial = shipment, canManage = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  function Harness() {
    const [saved, setSaved] = useState(initial)
    const [scanning, setScanning] = useState(false)
    return <SampleTubeScanner shipment={saved} canManage={canManage} scanning={scanning}
      onStartScanning={() => setScanning(true)} onStopScanning={() => setScanning(false)} onCorrect={mocks.correct}
      onAssign={async (item, barcode) => { const result = await mocks.assign(item, barcode) as SampleShipmentWorkflow; setSaved(result); return result }}
      renderSamples={context => <LabJobSamplesPanel order={order} embedded tubeShipments={[saved, split]} tubeContext={context} onPageChange={mocks.navigate} />} />
  }
  return render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>)
}

describe('one sample list for review and tube matching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.source.mockReturnValue({ allowed: true, receiptState: 'ready', sampleReceipts: new Map(order.samples.map(sample => [sample.id, { counts: { received: 0, total: sample.quantity } }])), sampleMatches: new Map([['sample-1', { matched: 1, total: 2 }]]) })
  })

  it('expands a split sample with container identities and keeps its total Job-wide', () => {
    show()
    expect(screen.queryByLabelText(/Scan tube barcode/)).toBeNull()
    expect(screen.getAllByRole('region', { name: 'Samples by biological source' })).toHaveLength(1)
    expect(screen.getByText('Matched: 1 of 2 tubes')).toBeTruthy()
    expect(screen.queryByText(/Receipt:/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'RNA-1 tubes' }))
    const tubes = screen.getByRole('list', { name: 'Tubes for RNA-1' })
    expect(within(tubes).getByText('SHIP-1')).toBeTruthy()
    expect(within(tubes).getByText('SHIP-2')).toBeTruthy()
    expect(within(tubes).getAllByRole('listitem')).toHaveLength(2)
    expect(within(tubes).getAllByRole('button', { name: 'Change tube' })).toHaveLength(1)
    fireEvent.click(within(tubes).getByRole('button', { name: 'Change tube' }))
    expect(mocks.correct).toHaveBeenCalledWith(shipment.crosswalk[0])
  })

  it('opens the next unmatched sample page and preserves a dirty target while reviewing another page', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Match tubes' }))
    const input = screen.getByLabelText(/Scan tube barcode/)
    await waitFor(() => expect(document.activeElement).toBe(input))
    expect(screen.getByRole('button', { name: 'RNA-11 tubes' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Samples 11–12 of 12')).toBeTruthy()
    fireEvent.change(input, { target: { value: 'UNSAVED-BARCODE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Previous samples' }))
    expect(input).toHaveProperty('value', 'UNSAVED-BARCODE')
    expect(screen.getByRole('heading', { name: 'RNA-11' })).toBeTruthy()
    expect(mocks.navigate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Return to active tube' }))
    expect(screen.getByRole('button', { name: 'RNA-11 tubes' }).getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(input)
  })

  it('retains a failed scan, saves before advancing, then leaves the list open when matching completes', async () => {
    mocks.assign.mockRejectedValueOnce(new Error('Tube belongs to another container.'))
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Match tubes' }))
    fireEvent.change(screen.getByLabelText(/Scan tube barcode/), { target: { value: 'WRONG-TUBE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save scan' }))
    expect(await screen.findByText(/Tube belongs to another container/)).toBeTruthy()
    expect(screen.getByLabelText(/Scan tube barcode/)).toHaveProperty('value', 'WRONG-TUBE')
    expect(screen.getByRole('button', { name: 'RNA-11 tubes' }).getAttribute('aria-expanded')).toBe('true')
    let resolve!: (saved: SampleShipmentWorkflow) => void
    mocks.assign.mockImplementationOnce(() => new Promise<SampleShipmentWorkflow>(done => { resolve = done }))
    fireEvent.change(screen.getByLabelText(/Scan tube barcode/), { target: { value: 'TUBE-11' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save scan' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saving scan…' })).toHaveProperty('disabled', true))
    expect(screen.getByRole('button', { name: 'Previous samples' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Done scanning' })).toHaveProperty('disabled', true)
    const saved = { ...shipment, crosswalk: shipment.crosswalk.map(item => item.submittedSpecimenId === 'sample-11' ? { ...item, supplierTubeBarcode: 'TUBE-11' } : item) }
    await act(async () => resolve(saved))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'RNA-12' })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'RNA-12 tubes' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByLabelText(/Scan tube barcode/)).toHaveProperty('value', '')
    mocks.assign.mockResolvedValueOnce({ ...saved, crosswalk: saved.crosswalk.map(item => ({ ...item, supplierTubeBarcode: item.supplierTubeBarcode ?? 'TUBE-12' })) })
    fireEvent.change(screen.getByLabelText(/Scan tube barcode/), { target: { value: 'TUBE-12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save scan' }))
    await waitFor(() => expect(screen.queryByLabelText(/Scan tube barcode/)).toBeNull())
    expect(screen.getByText('All 12 tubes matched in this container.')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Samples by biological source' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'RNA-12 tubes' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('asks before discarding an unfinished scan and restores focus when matching resumes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Match tubes' }))
    fireEvent.change(screen.getByLabelText(/Scan tube barcode/), { target: { value: 'DRAFT-TUBE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done scanning' }))
    expect(screen.getByLabelText(/Scan tube barcode/)).toHaveProperty('value', 'DRAFT-TUBE')
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Done scanning' }))
    expect(screen.queryByLabelText(/Scan tube barcode/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Match tubes' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Scan tube barcode/)))
    expect(screen.getByLabelText(/Scan tube barcode/)).toHaveProperty('value', '')
    confirm.mockRestore()
  })

  it('keeps unmatched sample identities visible and removes write actions after dispatch or for Members', () => {
    const unknown = shippingTube(99, { submittedSpecimenId: 'missing', customerSampleId: 'REVIEW-99' })
    const rendered = show({ ...shipment, status: 'Shipped', shippedAt: '2026-09-10T12:00:00Z', crosswalk: [...shipment.crosswalk, unknown] })
    expect(screen.queryByRole('button', { name: 'Match tubes' })).toBeNull()
    expect(screen.getByRole('region', { name: 'Tubes needing sample review' })).toBeTruthy()
    expect(screen.getByText('REVIEW-99')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'RNA-1 tubes' }))
    expect(screen.queryByRole('button', { name: 'Change tube' })).toBeNull()
    expect(screen.getByText('Receipt: 0 of 2 tubes received')).toBeTruthy()
    rendered.unmount()
    show(shipment, false)
    fireEvent.click(screen.getByRole('button', { name: 'RNA-1 tubes' }))
    expect(screen.queryByRole('button', { name: 'Change tube' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Match tubes' })).toBeNull()
  })
})
