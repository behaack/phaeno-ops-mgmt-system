import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CustomerOrderReadiness } from './CustomerOrderReadiness'
import { parseOrderSection } from './order-sections'

describe('Customer order readiness', () => {
  it('keeps quote and billing requirements out of the start-pricing alert', () => {
    render(<CustomerOrderReadiness readiness={{
      canStartPricing: true, startPricingBlockers: [],
      quoteBlockers: [{ code: 'ActiveCustomerAdministratorRequired', label: 'Administrator', nextAction: 'Accept invitation.' }],
      invoiceBlockers: [{ code: 'BillingContactIncomplete', label: 'Billing contact', nextAction: 'Add billing contact.' }],
    }} />)
    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('Ready to start pricing')).toBeTruthy()
    expect(within(alert).queryByText('Accept invitation.')).toBeNull()
    expect(within(alert).queryByText('Add billing contact.')).toBeNull()
    expect(screen.getByText('Later requirements · Quote: 1 · Invoice: 1')).toBeTruthy()
  })

  it('resolves the retired staging entry point to Intake', () => {
    expect(parseOrderSection('staging')).toBe('intake')
  })
})
