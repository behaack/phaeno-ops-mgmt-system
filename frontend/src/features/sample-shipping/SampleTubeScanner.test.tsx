import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState, type ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import { shippingFixture, shippingTube } from '#/test-helpers/sample-shipping'
import { locationKit } from '#/test-helpers/location-kit-inventory'
import { SampleTubeScanner } from './SampleTubeScanner'

const mocks = vi.hoisted(() => ({ assign: vi.fn(), correct: vi.fn(), blocker: vi.fn(), activity: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: mocks.blocker }))
beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())
function show(initial = shippingFixture, canManage = true, context: Pick<ComponentProps<typeof SampleTubeScanner>, 'specimenSources' | 'jobTubeProgress'> = {}) {
  let refresh!: (shipment: SampleShipmentWorkflow) => void
  function Harness() {
    const [shipment, setShipment] = useState(initial)
    refresh = setShipment
    return <SampleTubeScanner shipment={shipment} canManage={canManage} {...context} onScanActivityChange={mocks.activity} onCorrect={mocks.correct} onAssign={async (item, barcode) => { const saved = await mocks.assign(item, barcode) as SampleShipmentWorkflow; setShipment(saved); return saved }} />
  }
  const rendered = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><Harness /></QueryClientProvider>)
  return { refresh: (shipment: SampleShipmentWorkflow) => act(() => refresh(shipment)), unmount: rendered.unmount }
}

describe('guided tube scanning', () => {
  it('requires an assigned physical container for Customer preparation and keeps Members history visible', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = (assigned = false, canManage = true) => <QueryClientProvider client={client}><SampleTubeScanner shipment={{ ...shippingFixture, assignedContainer: assigned ? locationKit(20, { status: 'Assigned' }) : null }} requiresAssignedContainer canManage={canManage} onAssign={mocks.assign} onCorrect={mocks.correct} /></QueryClientProvider>
    const rendered = render(view())
    expect(screen.queryByRole('button', { name: 'Save scan' })).toBeNull()
    expect(screen.getByText('Confirm a received container before scanning its tubes.')).toBeTruthy()
    rendered.rerender(view(true, false))
    expect(screen.getByText('KIT-20')).toBeTruthy()
    expect(screen.getByText('RNA-1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save scan' })).toBeNull()
    expect(mocks.assign).not.toHaveBeenCalled()
  })
  it('retains the scan during refresh failure, blocks saving, and keeps wrong-container rejection on the same tube', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const view = (blocked: boolean) => <QueryClientProvider client={client}><SampleTubeScanner shipment={{ ...shippingFixture, assignedContainer: locationKit(20, { status: 'Assigned' }) }} requiresAssignedContainer writesBlocked={blocked} canManage onAssign={mocks.assign} onCorrect={mocks.correct} /></QueryClientProvider>
    const rendered = render(view(false))
    fireEvent.change(screen.getByLabelText(/Scan tube barcode/), { target: { value: 'OTHER-CONTAINER-TUBE' } })
    rendered.rerender(view(true))
    expect(screen.getByLabelText(/Scan tube barcode/)).toHaveProperty('value', 'OTHER-CONTAINER-TUBE')
    expect(screen.getByRole('button', { name: 'Save scan' })).toHaveProperty('disabled', true)
    fireEvent.submit(screen.getByLabelText(/Scan tube barcode/).closest('form')!)
    await waitFor(() => expect(mocks.assign).not.toHaveBeenCalled())
    mocks.assign.mockRejectedValue(new Error('This tube belongs to another container.'))
    rendered.rerender(view(false))
    fireEvent.click(screen.getByRole('button', { name: 'Save scan' }))
    expect(await screen.findByText(/This tube belongs to another container/)).toBeTruthy()
    expect(screen.getByLabelText(/Scan tube barcode/)).toHaveProperty('value', 'OTHER-CONTAINER-TUBE')
    expect(screen.getByRole('heading', { name: 'RNA-1' })).toBeTruthy()
  })
  it('saves before advancing, shows the exact permanent barcode and focuses the next tube', async () => {
    let resolve!: (shipment: SampleShipmentWorkflow) => void
    mocks.assign.mockImplementation(() => new Promise<SampleShipmentWorkflow>(done => { resolve = done }))
    show()
    const input = screen.getByLabelText(/Scan tube barcode/)
    await waitFor(() => expect(document.activeElement).toBe(input))
    fireEvent.change(input, { target: { value: 'TUBE_0001' } })
    expect(mocks.activity).toHaveBeenLastCalledWith(true)
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(input).toHaveProperty('disabled', true))
    expect(mocks.activity).toHaveBeenLastCalledWith(true)
    expect(screen.getByRole('heading', { name: 'RNA-1' })).toBeTruthy()
    expect(screen.getByText('0 of 2 tubes matched in this container')).toBeTruthy()
    await act(async () => resolve({ ...shippingFixture, crosswalk: [{ ...shippingFixture.crosswalk[0], supplierTubeBarcode: 'TUBE_0001', version: 2 }, shippingFixture.crosswalk[1]] }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'RNA-2' })).toBeTruthy())
    expect(screen.getAllByRole('img', { name: 'Tube barcode TUBE_0001' })).toHaveLength(1)
    expect(screen.queryByRole('img', { name: 'Saved tube barcode TUBE_0001' })).toBeNull()
    expect(screen.getByLabelText(/Scan tube barcode/)).toHaveProperty('value', '')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Scan tube barcode/)))
    expect(screen.getByText('1 of 2 tubes matched in this container')).toBeTruthy()
    expect(mocks.activity).toHaveBeenLastCalledWith(false)
  })

  it('clears reported scan activity when a draft is discarded or the scanner unmounts', () => {
    const { unmount } = show()
    const input = screen.getByLabelText(/Scan tube barcode/)
    expect(mocks.activity).toHaveBeenLastCalledWith(false)
    fireEvent.change(input, { target: { value: 'UNSAVED-TUBE' } })
    expect(mocks.activity).toHaveBeenLastCalledWith(true)
    fireEvent.change(input, { target: { value: '' } })
    expect(mocks.activity).toHaveBeenLastCalledWith(false)
    fireEvent.change(input, { target: { value: 'ANOTHER-DRAFT' } })
    unmount()
    expect(mocks.activity).toHaveBeenLastCalledWith(false)
    expect(mocks.assign).not.toHaveBeenCalled()
  })

  it('retains a rejected scan on the same sample and allows a retry', async () => {
    mocks.assign.mockRejectedValueOnce(new Error('This tube is already assigned to another shipment.'))
    show()
    fireEvent.change(screen.getByLabelText(/Scan tube barcode/), { target: { value: 'DUPLICATE-0001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save scan' }))
    expect(await screen.findByText(/already assigned to another shipment/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'RNA-1' })).toBeTruthy()
    expect(screen.getByLabelText(/Scan tube barcode/)).toHaveProperty('value', 'DUPLICATE-0001')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Scan tube barcode/)))
    expect(screen.getByRole('button', { name: 'Save scan' })).toHaveProperty('disabled', false)
  })

  it('resumes at the next unmatched tube and limits long lists to one page', () => {
    show({ ...shippingFixture, crosswalk: Array.from({ length: 30 }, (_, index) => shippingTube(index + 1, { supplierTubeBarcode: index < 10 ? `TUBE-${index}` : null })) })
    expect(screen.getByRole('heading', { name: 'RNA-11' })).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Next tubes' })).toBeTruthy()
  })

  it('reviews another page without changing the scan target, then advances past the eighth tube only after saving', async () => {
    const initial = { ...shippingFixture, crosswalk: Array.from({ length: 18 }, (_, index) => shippingTube(index + 1, { submittedSpecimenId: 'shared-sample', customerSampleId: 'RNA-1', tubeOrdinal: index + 1, totalSampleTubeCount: 18, supplierTubeBarcode: index < 7 ? `SAVED-${index + 1}` : null })) }
    let resolve!: (shipment: SampleShipmentWorkflow) => void
    mocks.assign.mockImplementation(() => new Promise<SampleShipmentWorkflow>(done => { resolve = done }))
    show(initial, true, { specimenSources: { 'shared-sample': 'Human PBMCs' }, jobTubeProgress: { matched: 11, total: 22 } })
    const input = screen.getByLabelText(/Scan tube barcode/)
    fireEvent.change(input, { target: { value: 'TUBE-8' } })
    expect(screen.getByText('7 of 18 tubes matched in this container')).toBeTruthy()
    expect(screen.getByText('Across this Job: 11 of 22 tubes matched.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next tubes' }))
    expect(screen.getByText('Tubes 9–16 of 18 in this container')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'RNA-1' })).toBeTruthy()
    expect(input).toHaveProperty('value', 'TUBE-8')
    expect(within(screen.getAllByRole('listitem')[0]).getByText('Tube 9 of 18')).toBeTruthy()
    expect(within(screen.getAllByRole('listitem')[0]).getByText('Human PBMCs')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Return to active tube' }))
    expect(screen.getByText('Tubes 1–8 of 18 in this container')).toBeTruthy()
    expect(document.activeElement).toBe(input)
    expect(input).toHaveProperty('value', 'TUBE-8')
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(mocks.assign).toHaveBeenCalledWith(initial.crosswalk[7], 'TUBE-8'))
    expect(screen.getByRole('button', { name: 'Next tubes' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Previous tubes' })).toHaveProperty('disabled', true)
    expect(screen.getByText('Tubes 1–8 of 18 in this container')).toBeTruthy()
    await act(async () => resolve({ ...initial, crosswalk: initial.crosswalk.map((item, index) => index === 7 ? { ...item, supplierTubeBarcode: 'TUBE-8' } : item) }))
    expect(screen.getByText('Tubes 9–16 of 18 in this container')).toBeTruthy()
    expect(screen.getByText('8 of 18 tubes matched in this container')).toBeTruthy()
    const nextInput = screen.getByLabelText(/Scan tube barcode/)
    expect(within(nextInput.closest('form')!).getByText(/Tube 9 of 18/)).toBeTruthy()
    expect(nextInput).toHaveProperty('value', '')
    await waitFor(() => expect(document.activeElement).toBe(nextInput))
    expect(screen.queryByRole('button', { name: 'Return to active tube' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Next tubes' }))
    expect(screen.getByText('Tubes 17–18 of 18 in this container')).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(within(screen.getAllByRole('listitem')[0]).getByText('Tube 17 of 18')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next tubes' })).toHaveProperty('disabled', true)
  })

  it('retains a failed barcode and unmapped sample context while browsing and returning to the active tube', async () => {
    mocks.assign.mockRejectedValue(new Error('This tube belongs to another container.'))
    show({ ...shippingFixture, crosswalk: Array.from({ length: 10 }, (_, index) => shippingTube(index + 1)) }, true, { specimenSources: {} })
    const input = screen.getByLabelText(/Scan tube barcode/)
    fireEvent.change(input, { target: { value: 'WRONG-TUBE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next tubes' }))
    fireEvent.submit(input.closest('form')!)
    expect(await screen.findByText(/This tube belongs to another container/)).toBeTruthy()
    expect(screen.getByText('Tubes 9–10 of 10 in this container')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'RNA-1' })).toBeTruthy()
    expect(within(screen.getAllByRole('listitem')[0]).getByText('Biological source not available · Review sample context.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Return to active tube' }))
    expect(input).toHaveProperty('value', 'WRONG-TUBE')
    expect(screen.getByText('Tubes 1–8 of 10 in this container')).toBeTruthy()
    expect(screen.getByText('Tube was not matched')).toBeTruthy()
    expect(mocks.assign).toHaveBeenCalledTimes(1)
  })

  it('holds the active sample when a background update changes that row', () => {
    const { refresh } = show()
    fireEvent.change(screen.getByLabelText(/Scan tube barcode/), { target: { value: 'MY-UNSAVED-TUBE' } })
    refresh({ ...shippingFixture, crosswalk: [{ ...shippingFixture.crosswalk[0], supplierTubeBarcode: 'OTHER-SAVED-TUBE', version: 2 }, shippingFixture.crosswalk[1]] })
    expect(screen.getByText('Review the updated tube list')).toBeTruthy()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Continue scanning' }))
    expect(confirm).toHaveBeenCalled()
    expect(mocks.assign).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Continue scanning' }))
    expect(screen.getByRole('heading', { name: 'RNA-2' })).toBeTruthy()
  })

  it('keeps a Member view read-only and shows saved barcodes', () => {
    show({ ...shippingFixture, crosswalk: [{ ...shippingFixture.crosswalk[0], supplierTubeBarcode: 'SAVED-0001' }] }, false)
    expect(screen.queryByLabelText(/Scan tube barcode/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Change tube' })).toBeNull()
    expect(screen.getByRole('img', { name: 'Tube barcode SAVED-0001' })).toBeTruthy()
  })
})
