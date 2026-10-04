import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { noSessionCapabilities } from '#/test-helpers/session'
import { FinanceSidebar } from './FinanceSidebar'

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), capabilities: {}, search: {} as Record<string, string> }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate, useSearch: () => mocks.search }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ session: { capabilities: mocks.capabilities } }) }))

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  mocks.capabilities = noSessionCapabilities
  mocks.search = {}
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})
afterEach(() => vi.unstubAllGlobals())

describe('Finance sidebar access and retained context', () => {
  it.each([
    ['canManagePSeqBilling', ['Invoices and aging', 'Customer billing']],
    ['canManagePSeqCash', ['Receipts', 'Import receipts', 'Reconciliation']],
    ['canReconcilePSeqCash', ['Reconciliation']],
  ] as const)('offers only the sections assigned to %s', (capability, labels) => {
    mocks.capabilities = { ...noSessionCapabilities, [capability]: true }
    render(<FinanceSidebar><p>Finance content</p></FinanceSidebar>)
    const navigation = screen.getByRole('navigation', { name: 'Finance sections' })
    expect(within(navigation).getAllByRole('button')).toHaveLength(labels.length)
    for (const label of labels) expect(within(navigation).getByRole('button', { name: new RegExp(`^${label}`) })).toBeTruthy()
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it('preserves Customer filters when selecting a different Finance section', () => {
    mocks.capabilities = { ...noSessionCapabilities, canManagePSeqBilling: true, canManagePSeqCash: true }
    mocks.search = { financeSection: 'customers', financeCustomer: 'customer-1', financeSearch: 'Atlas' }
    render(<FinanceSidebar><p>Finance content</p></FinanceSidebar>)
    expect(screen.getByRole('button', { name: /^Customer billing/ }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('button', { name: /^Receipts/ }))
    const navigation = mocks.navigate.mock.calls.at(-1)?.[0]
    expect(navigation.to).toBe('/finance')
    expect(navigation.search(mocks.search)).toEqual({ ...mocks.search, financeSection: 'receipts' })
  })

  it('selects the record’s owning section while preserving its return context', () => {
    mocks.capabilities = { ...noSessionCapabilities, canManagePSeqBilling: true, canManagePSeqCash: true }
    mocks.search = { financeSection: 'invoices', financeSearch: 'Atlas' }
    render(<FinanceSidebar recordSection="receipts"><p>Receipt detail</p></FinanceSidebar>)
    expect(screen.getByRole('button', { name: /^Receipts/ }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: /^Invoices and aging/ }).getAttribute('aria-current')).toBeNull()
  })

  it('omits Finance navigation when no Finance responsibilities are available', () => {
    render(<FinanceSidebar><p>Finance unavailable</p></FinanceSidebar>)
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.getByText('Finance unavailable')).toBeTruthy()
  })
})
