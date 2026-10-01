import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { PhaseBillingPlan } from '#/api/lab-phases'
import { PhaseInvoiceDialog } from './LabPhaseDialogs'
import { phaseProgress } from './LabPhasesPanel'

vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'mock' }) }))
vi.mock('./use-order-draft-guard', () => ({ useOrderDraftGuard: vi.fn() }))

describe('phase review', () => {
  it('groups accessioned and accepted progress under Received for Customers', () => {
    expect(phaseProgress({ AwaitingAcceptance: 2, ReadyForPreparation: 3, Sequencing: 1 }, false))
      .toBe('5 Received · 1 Sequencing')
    expect(phaseProgress({ AwaitingAcceptance: 2, ReadyForPreparation: 3 }, true))
      .not.toContain('Received')
  })

  it('offers remaining agreed portions and excludes cancelled and fully invoiced phases', () => {
    const plan: PhaseBillingPlan = { orderId: 'job', revision: 3, currency: 'USD', phases: [
      { id: 'one', name: 'Discovery', lifecycle: 'Planned', acceptedSubtotal: 1000, invoicedSubtotal: 250 },
      { id: 'two', name: 'Cancelled cohort', lifecycle: 'Cancelled', acceptedSubtotal: 2000, invoicedSubtotal: 0 },
      { id: 'three', name: 'Paid scope', lifecycle: 'ResultsDelivered', acceptedSubtotal: 500, invoicedSubtotal: 500 },
    ] }
    render(<QueryClientProvider client={new QueryClient()}><PhaseInvoiceDialog orderId="job" plan={plan} onSaved={async () => undefined} onClose={vi.fn()} /></QueryClientProvider>)
    const input = screen.getByLabelText(/Discovery subtotal/)
    expect(input.getAttribute('max')).toBe('750')
    expect(screen.queryByLabelText(/Cancelled cohort subtotal/)).toBeNull()
    expect(screen.queryByLabelText(/Paid scope subtotal/)).toBeNull()
    fireEvent.change(input, { target: { value: '125.50' } })
    expect(screen.getByText(/Subtotal to invoice: 125.50 USD/)).toBeTruthy()
  })
})
