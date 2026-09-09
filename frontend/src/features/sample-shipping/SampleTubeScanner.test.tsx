import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import { shippingFixture, shippingTube } from '#/test-helpers/sample-shipping'
import { SampleTubeScanner } from './SampleTubeScanner'

const mocks = vi.hoisted(() => ({ assign: vi.fn(), correct: vi.fn(), blocker: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: mocks.blocker }))
beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())
function show(initial = shippingFixture, canManage = true) {
  let refresh!: (shipment: SampleShipmentWorkflow) => void
  function Harness() {
    const [shipment, setShipment] = useState(initial)
    refresh = setShipment
    return <SampleTubeScanner shipment={shipment} canManage={canManage} onCorrect={mocks.correct} onAssign={async (item, barcode) => { const saved = await mocks.assign(item, barcode) as SampleShipmentWorkflow; setShipment(saved); return saved }} />
  }
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><Harness /></QueryClientProvider>)
  return { refresh: (shipment: SampleShipmentWorkflow) => act(() => refresh(shipment)) }
}

describe('guided tube scanning', () => {
  it('saves before advancing, shows the exact permanent barcode and focuses the next tube', async () => {
    let resolve!: (shipment: SampleShipmentWorkflow) => void
    mocks.assign.mockImplementation(() => new Promise<SampleShipmentWorkflow>(done => { resolve = done }))
    show()
    const input = screen.getByLabelText(/Scan tube barcode/)
    await waitFor(() => expect(document.activeElement).toBe(input))
    fireEvent.change(input, { target: { value: 'TUBE_0001' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(input).toHaveProperty('disabled', true))
    expect(screen.getByRole('heading', { name: 'RNA-1' })).toBeTruthy()
    expect(screen.getByText('0 of 2 tubes matched')).toBeTruthy()
    await act(async () => resolve({ ...shippingFixture, crosswalk: [{ ...shippingFixture.crosswalk[0], supplierTubeBarcode: 'TUBE_0001', version: 2 }, shippingFixture.crosswalk[1]] }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'RNA-2' })).toBeTruthy())
    expect(screen.getByRole('img', { name: 'Saved tube barcode TUBE_0001' })).toBeTruthy()
    expect(screen.getByLabelText(/Scan tube barcode/)).toHaveProperty('value', '')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Scan tube barcode/)))
    expect(screen.getByText('1 of 2 tubes matched')).toBeTruthy()
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
