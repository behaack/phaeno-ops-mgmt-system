import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConnectedOperationsSummary } from '#/features/dashboard/ConnectedOperationsSummary'
import { OperationalAttentionPanel } from './PSeqOrderToCashPanels'
import { ResultPackageDetailPage, ResultReleasePanel } from './ResultReleasePanel'

const mocks = vi.hoisted(() => ({ attention: vi.fn(), packages: vi.fn(), detail: vi.fn(), orders: vi.fn() }))
vi.mock('#/api/pseq-order-to-cash', () => ({ listOperationalAttention: mocks.attention, listResultPackages: mocks.packages, getResultPackage: mocks.detail }))
vi.mock('#/api/order-management', async importOriginal => ({ ...await importOriginal<typeof import('#/api/order-management')>(), listCommercialOrders: mocks.orders }))
vi.mock('./FinanceOperationsPanel', () => ({ FinanceOperationsPanel: () => null }))
vi.mock('#/features/file-management/ReleasedDeliverableDetailPage', () => ({ ReleasedDeliverableDetailPage: () => null }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canReleasePSeqResults: true } } }) }))
vi.mock('@tanstack/react-router', () => ({ useSearch: () => ({}), useNavigate: () => vi.fn(), Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a> }))

function apiError(code: string, status = 404) { return { isAxiosError: true, response: { status, data: { success: false, error: { code, message: 'Server response' } } } } }
function view(element: ReactNode, client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>)
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.orders.mockResolvedValue({ totalCount: 0, items: [] })
  mocks.attention.mockResolvedValue([])
  mocks.packages.mockResolvedValue([])
})

describe('Disabled operational capabilities', () => {
  it('does not request or display role-restricted attention on an administrator-only dashboard', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['operational-attention', 'dashboard'], [{ id: 'cached-attention' }])
    view(<ConnectedOperationsSummary section="orders" canViewAttention={false} />, client)
    expect(await screen.findByText('0 orders in active intake')).toBeTruthy()
    expect(mocks.attention).not.toHaveBeenCalled()
    expect(screen.queryByText(/unresolved attention items|Attention unavailable|Checking attention/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Retry attention' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Attention queue' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Open Intake' })).toBeTruthy()
  })
  it('removes unusable dashboard attention actions without hiding commercial work', async () => {
    mocks.attention.mockRejectedValue(apiError('attention_operations_disabled'))
    view(<ConnectedOperationsSummary section="orders" canViewAttention />)
    expect(await screen.findByText(/Attention queues not enabled/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Retry attention' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Attention queue' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Open Intake' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('retains dashboard retry and navigation for a real outage', async () => {
    mocks.attention.mockRejectedValue(apiError('service_unavailable', 503))
    view(<ConnectedOperationsSummary section="orders" canViewAttention />)
    expect(await screen.findByRole('button', { name: 'Retry attention' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Attention queue' })).toBeTruthy()
  })
  it('shows neutral attention guidance and removes its queue filter', async () => {
    mocks.attention.mockRejectedValue(apiError('attention_operations_disabled'))
    view(<OperationalAttentionPanel apiEnabled userId="operator" />)
    expect(await screen.findByText('Attention queues not enabled')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Attention queues not enabled')
    expect(screen.queryByRole('combobox', { name: 'Queue' })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText('No unresolved items in this queue.')).toBeNull()
  })
  it('hides stale result rows and filters when a refetch reports disabled', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['pseq-result-packages', 'ReadyForRelease'], [{ id: 'old', state: 'ReadyForRelease', packageVersion: 1, artifacts: [] }])
    mocks.packages.mockRejectedValue(apiError('governed_results_disabled'))
    view(<ResultReleasePanel apiEnabled />, client)
    expect((await screen.findByRole('status')).textContent).toContain('Result release not enabled')
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('explains disabled direct package links and provides a way back', async () => {
    mocks.detail.mockRejectedValue(apiError('governed_results_disabled'))
    view(<ResultPackageDetailPage packageId="package" />)
    expect(await screen.findByText('Result release not enabled')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to result packages' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Release to Customer' })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it.each([['forbidden', 403], ['not_found', 404], ['service_unavailable', 503], ['governed_results_disabled', 403]])('keeps %s / %s as an error', async (code, status) => {
    mocks.packages.mockRejectedValue(apiError(code, status))
    view(<ResultReleasePanel apiEnabled />)
    expect((await screen.findByRole('alert')).textContent).toContain('Result packages could not be loaded')
    expect(screen.queryByText('Result release not enabled')).toBeNull()
  })
})
