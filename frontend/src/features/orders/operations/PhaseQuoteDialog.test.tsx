import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabServiceOrder, OrderConfiguration } from '#/api/order-management'
import { PhaseQuoteDialog } from './PhaseQuoteDialog'

const mutation = vi.hoisted(() => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }))
vi.mock('./use-phase-quote', () => ({ usePhaseQuote: () => mutation }))
vi.mock('../use-order-draft-guard', () => ({ useOrderDraftGuard: () => undefined }))

const itemId = '00000000-0000-4000-8000-000000000010'
const phaseId = '00000000-0000-4000-8000-000000000011'
const catalogItems = [{ id: itemId, name: 'PSeq', isActive: true, isPSeqLabService: true, salesUnit: 'specimen', basePrice: 100, currency: 'USD' }] as OrderConfiguration['catalogItems']
function renderPricing(phased: boolean, runs = 9) {
  const sources = [{ biologicalSource: 'Human PBMC', specimenCount: 3 }]
  const order = { id: '00000000-0000-4000-8000-000000000012', version: 1, requestedSpecimenCount: 3, requestedSequencingRunCount: runs,
    sourceGroups: sources, proposedUnitPrice: null, priceProposalNote: null,
    phaseScopes: phased ? [{ id: phaseId, name: 'Discovery', position: 1, sampleCount: 3, scope: { sources, runsPerSample: runs / 3, sequencingRunCount: runs },
      proposedUnitPrice: null, proposedAdditionalRunPrice: null, pricingNote: null, turnaroundBusinessDays: 14 }] : null } as LabServiceOrder
  return render(<PhaseQuoteDialog open order={order} catalogItems={catalogItems} onOpenChange={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />)
}

describe('laboratory sample and additional-run quote review', () => {
  beforeEach(() => mutation.mutate.mockReset())

  it.each([false, true])('prices one standard service per sample for phased=%s', async phased => {
    renderPricing(phased)
    fireEvent.change(screen.getByRole('spinbutton', { name: /Final price per additional run/ }), { target: { value: '20' } })
    expect(screen.getByText('Quote subtotal: $420.00')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Issue quote' }))
    await waitFor(() => expect(mutation.mutate).toHaveBeenCalledTimes(1))
    expect(mutation.mutate.mock.calls[0][0].lines).toEqual([
      expect.objectContaining({ pricingComponent: 'StandardSample', quantity: 3, unitPrice: 100, phaseId: phased ? phaseId : null }),
      expect.objectContaining({ pricingComponent: 'AdditionalRun', quantity: 6, unitPrice: 20, phaseId: phased ? phaseId : null }),
    ])
  })

  it('retains incomplete pricing rather than issuing free additional runs', async () => {
    renderPricing(false)
    expect(screen.getByText('Quote subtotal: Complete the prices')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Issue quote' }))
    expect(await screen.findByText('Enter the price per additional run.')).toBeTruthy()
    expect(mutation.mutate).not.toHaveBeenCalled()
  })

  it('needs only the sample rate when each sample has one run', async () => {
    renderPricing(false, 3)
    expect(screen.queryByRole('spinbutton', { name: /Final price per additional run/ })).toBeNull()
    expect(screen.getByText('Quote subtotal: $300.00')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Issue quote' }))
    await waitFor(() => expect(mutation.mutate).toHaveBeenCalledTimes(1))
    expect(mutation.mutate.mock.calls[0][0].lines).toHaveLength(1)
  })
})
