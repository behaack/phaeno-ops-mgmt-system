import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomerDashboardMetrics } from './CustomerDashboardMetrics'

const mocks = vi.hoisted(() => ({ summary: vi.fn(), department: 'general' }))
vi.mock('#/api/order-management', () => ({ getCustomerLabDashboardSummary: mocks.summary }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({
  authProvider: 'clerk', selectedOrganizationId: 'customer', selectedDepartmentId: mocks.department,
  session: { capabilities: { canViewLabServiceOrders: true } },
}) }))
const clients: QueryClient[] = []
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  clients.push(client)
  const select = vi.fn()
  const ui = () => <QueryClientProvider client={client}><CustomerDashboardMetrics view="active" onSelect={select} /></QueryClientProvider>
  const rendered = render(ui())
  return { client, select, changeScope: () => rendered.rerender(ui()) }
}
beforeEach(() => { vi.resetAllMocks(); mocks.department = 'general' })
afterEach(() => clients.splice(0).forEach(client => client.clear()))

describe('Customer dashboard metrics', () => {
  it('shows full counts including zero results and selects the matching work view', async () => {
    mocks.summary.mockResolvedValue({ attentionCount: 12, newResultCount: 0 })
    const { select } = setup()
    fireEvent.click(await screen.findByRole('button', { name: '12 items requiring attention' }))
    expect(select).toHaveBeenLastCalledWith('attention')
    fireEvent.click(screen.getByRole('button', { name: '0 new results' }))
    expect(select).toHaveBeenLastCalledWith('results')
  })

  it('does not present missing or stale metrics as zero after a failed refresh', async () => {
    mocks.summary.mockResolvedValueOnce({ attentionCount: 2, newResultCount: 1 }).mockRejectedValueOnce(new Error('Unavailable'))
    const { client } = setup()
    expect(screen.getByRole('button', { name: 'Unavailable new results' })).toHaveProperty('disabled', true)
    await screen.findByRole('button', { name: '1 new result' })
    await act(() => client.invalidateQueries({ queryKey: ['lab-service-orders', 'dashboard-summary'] }))
    await screen.findByText('Dashboard totals are temporarily unavailable.')
    expect(screen.getByRole('button', { name: 'Unavailable new results' })).toHaveProperty('disabled', true)
    expect(screen.queryByRole('button', { name: '1 new result' })).toBeNull()
    expect(screen.queryByRole('button', { name: '0 new results' })).toBeNull()
  })

  it('clears totals from the previous Department while loading the new scope', async () => {
    mocks.summary.mockResolvedValueOnce({ attentionCount: 2, newResultCount: 1 }).mockResolvedValueOnce({ attentionCount: 4, newResultCount: 3 })
    const { changeScope } = setup()
    await screen.findByRole('button', { name: '2 items requiring attention' })
    mocks.department = 'research'
    changeScope()
    expect(screen.queryByRole('button', { name: '2 items requiring attention' })).toBeNull()
    await screen.findByRole('button', { name: '4 items requiring attention' })
  })
})
