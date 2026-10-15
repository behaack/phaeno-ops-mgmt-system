import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bundleCase } from '#/test-helpers/bundled-orders'
import { KitLotAssessmentView, PartnerKitLotDialog } from './KitLotSubmission'

const mocks = vi.hoisted(() => ({ submit: vi.fn() }))
vi.mock('#/api/pseq-kit-lots', () => ({ submitPartnerKitLot: mocks.submit }))
vi.mock('./use-order-draft-guard', () => ({ useOrderDraftGuard: () => () => {} }))
vi.mock('#/components/PortalConfirmation', () => ({ confirmPortal: async () => true }))
const assessment = { lotId: 'lot', lotNumber: 'LOT-1', expirationDate: '2026-09-01', isRecalled: false,
  recallReason: null, isExpired: false, expirationUnknown: false, assessedOn: '2026-08-30', lotVersion: 2 }
function show() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <PartnerKitLotDialog orderId="order" kitCase={{ ...bundleCase, lotSubmission: null, canSubmitLot: true }} onClose={vi.fn()} />
  </QueryClientProvider>)
}
describe('independent Partner kit lot submission', () => {
  beforeEach(() => { mocks.submit.mockReset() })
  it('saves a lot without assembly files, an assembly request or a kit-use date', async () => {
    mocks.submit.mockResolvedValue({ id: 'saved', enteredLotNumber: 'LOT-1', usedOn: null, checkedAt: '2026-08-30T12:00:00Z', version: 1, savedAssessment: assessment, currentAssessment: assessment })
    show()
    expect(screen.queryByLabelText(/assembly inputs|input files/i)).toBeNull()
    fireEvent.change(screen.getByLabelText(/Lot number/), { target: { value: 'LOT-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save and check lot' }))
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith('order', bundleCase.id,
      { caseVersion: bundleCase.version, version: null, lotNumber: 'LOT-1', usedOn: null }, expect.any(String)))
  })
  it('retains the label entry when the server rejects a mismatched lot', async () => {
    mocks.submit.mockRejectedValue(new Error('This lot does not match the kit.'))
    show()
    fireEvent.change(screen.getByLabelText(/Lot number/), { target: { value: 'WRONG-LOT' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save and check lot' }))
    expect(await screen.findByText('This lot does not match the kit.')).toBeTruthy()
    expect(screen.getByLabelText(/Lot number/)).toHaveProperty('value', 'WRONG-LOT')
  })
  it('shows both recall and use-date expiry warnings without replacing either', () => {
    render(<KitLotAssessmentView assessment={{ ...assessment, isRecalled: true, recallReason: 'Affected reagent', isExpired: true }} usedOn="2026-09-02" />)
    expect(screen.getByText('Lot recalled')).toBeTruthy()
    expect(screen.getByText('Kit was expired when used')).toBeTruthy()
    expect(screen.getByText(/Kit used on 2026-09-02/)).toBeTruthy()
  })
})
