import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState, type AnchorHTMLAttributes } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomerLabDashboardView, OrderListItem, PagedResult } from '#/api/order-management'
import { CustomerLabRequestsCard } from './CustomerLabRequestsCard'
import { CustomerDashboardMetrics } from './CustomerDashboardMetrics'
import { useCustomerDashboardQuery } from './customer-dashboard-query'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  session: { authProvider: 'clerk', selectedOrganizationId: 'customer', selectedDepartmentId: 'general',
    session: { capabilities: { canViewLabServiceOrders: true, canAcceptLabServiceQuotes: true } } },
}))
vi.mock('#/api/order-management', () => ({ getCustomerLabDashboard: (view: CustomerLabDashboardView, page: number) =>
  mocks.list(page, view).then((requests: PagedResult<OrderListItem>) => ({ summary: { attentionCount: 0, newResultCount: 0 }, requests })) }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => mocks.session }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; params?: { orderId: string } }) =>
    <a href={to.replace('$orderId', params?.orderId ?? '')} {...props}>{children}</a>,
}))

function order(id: string, reference: string, status = 'QuoteIssued'): OrderListItem {
  return { id, reference, status, number: `REF-${id}`, organizationId: 'customer',
    version: 1, createdAt: '2026-09-22T12:00:00Z', updatedAt: '2026-09-22T12:00:00Z', tenantSafeReason: null }
}
const first = order('one', 'MDA Demonstration Project')
const second = order('two', 'Brain cancer project')
const page = (items: OrderListItem[], totalCount = items.length, current = 1) => ({ items, totalCount, page: current, pageSize: 10 })
const clients: QueryClient[] = []
function CardHarness({ view, withMetrics = false }: { view: CustomerLabDashboardView; withMetrics?: boolean }) {
  const [currentPage, setCurrentPage] = useState(1)
  const query = useCustomerDashboardQuery(view, currentPage, 'customer', mocks.session.selectedDepartmentId, true)
  return <>{withMetrics ? <CustomerDashboardMetrics view={view} onSelect={() => {}} query={query} enabled /> : null}
    <CustomerLabRequestsCard view={view} page={currentPage} onPageChange={setCurrentPage} query={query} /></>
}
function setup(requestView: CustomerLabDashboardView = 'active', withMetrics = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  clients.push(client)
  const ui = () => <QueryClientProvider client={client}><CardHarness view={requestView} withMetrics={withMetrics} key={mocks.session.selectedDepartmentId} /></QueryClientProvider>
  const view = render(ui())
  return { client, changeScope: () => view.rerender(ui()) }
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.session.authProvider = 'clerk'
  mocks.session.selectedDepartmentId = 'general'
  mocks.session.session.capabilities.canAcceptLabServiceQuotes = true
})
afterEach(() => { clients.splice(0).forEach(client => client.clear()) })

describe('Customer dashboard requests', () => {
  it('uses one response for result totals and the matching Jobs list', async () => {
    mocks.list.mockResolvedValue(page([order('finished', 'Completed research', 'Completed')]))
    setup('results', true)
    expect(await screen.findByRole('link', { name: 'View results for Completed research' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '0 new results' })).toBeTruthy()
    expect(mocks.list).toHaveBeenCalledTimes(1)
  })

  it('links completed Jobs to their still-undownloaded results', async () => {
    mocks.list.mockResolvedValue(page([order('finished', 'Completed research', 'Completed')]))
    setup('results')
    expect(await screen.findByRole('link', { name: 'View results for Completed research' })).toBeTruthy()
    expect(mocks.list).toHaveBeenCalledWith(1, 'results')
    expect(screen.getByText('1 Job')).toBeTruthy()
    expect(screen.queryByText('With Phaeno:')).toBeNull()
  })

  it('surfaces both named requests with separate pricing links', async () => {
    mocks.list.mockResolvedValue(page([first, second]))
    setup()
    expect(await screen.findByText('2 active requests')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Review pricing for MDA Demonstration Project' }).getAttribute('href')).toBe('/lab-services/one')
    expect(screen.getByRole('link', { name: 'Review pricing for Brain cancer project' }).getAttribute('href')).toBe('/lab-services/two')
  })

  it('distinguishes an administrator decision from work waiting on Phaeno', async () => {
    mocks.session.session.capabilities.canAcceptLabServiceQuotes = false
    mocks.list.mockResolvedValue(page([first, order('waiting', 'Next project', 'QuoteInPreparation')]))
    setup()
    expect(await screen.findByRole('link', { name: 'View pricing for MDA Demonstration Project' })).toBeTruthy()
    expect(screen.getByText('Administrator action:')).toBeTruthy()
    expect(screen.getByText('Waiting for Phaeno:')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /^Review pricing/ })).toBeNull()
  })

  it('pages the full request set and resets when the Department changes', async () => {
    mocks.list.mockResolvedValueOnce(page([first], 11)).mockResolvedValueOnce(page([second], 11, 2))
      .mockResolvedValueOnce(page([order('research', 'Research project')]))
    const { changeScope } = setup()
    await screen.findByText('MDA Demonstration Project')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Brain cancer project')
    expect(mocks.list).toHaveBeenLastCalledWith(2, 'active')
    expect(screen.queryByText('MDA Demonstration Project')).toBeNull()
    mocks.session.selectedDepartmentId = 'research'
    changeScope()
    expect(screen.queryByText('Brain cancer project')).toBeNull()
    await screen.findByText('Research project')
    expect(mocks.list).toHaveBeenLastCalledWith(1, 'active')
  })

  it('removes stale work after a failed refresh and recovers through retry', async () => {
    mocks.list.mockResolvedValueOnce(page([first])).mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce(page([]))
    const { client } = setup()
    await screen.findByText('MDA Demonstration Project')
    await act(() => client.invalidateQueries({ queryKey: ['lab-service-orders', 'dashboard-work'] }))
    expect(await screen.findByText('Requests could not be loaded')).toBeTruthy()
    expect(screen.queryByText('MDA Demonstration Project')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry requests' }))
    await screen.findByText('No active laboratory requests. Completed requests remain in Lab services.')
    expect(screen.queryByText('Requests could not be loaded')).toBeNull()
  })

  it('refreshes the list when work is no longer active', async () => {
    mocks.list.mockResolvedValueOnce(page([first, second])).mockResolvedValueOnce(page([second]))
    const { client } = setup()
    await screen.findByText('MDA Demonstration Project')
    await act(() => client.invalidateQueries({ queryKey: ['lab-service-orders', 'dashboard-work'] }))
    await waitFor(() => expect(screen.queryByText('MDA Demonstration Project')).toBeNull())
    expect(screen.getByText('1 active request')).toBeTruthy()
    expect(screen.getByText('Brain cancer project')).toBeTruthy()
  })
})
