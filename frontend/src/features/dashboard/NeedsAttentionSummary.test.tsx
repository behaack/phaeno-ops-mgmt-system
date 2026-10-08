import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { noSessionCapabilities } from '#/test-helpers/session'
import { NeedsAttentionSummary } from './NeedsAttentionSummary'

const api = vi.hoisted(() => ({ attention: vi.fn(), summaries: vi.fn() }))
vi.mock('#/api/pseq-order-to-cash', () => ({ listOperationalAttention: api.attention }))
vi.mock('#/api/commercial-sale-summaries', () => ({ listSaleSummaryFailures: api.summaries }))
vi.mock('#/api/order-management', () => ({
  getOrderErrorMessage: (_error: unknown, fallback: string) => fallback,
  isOrderFeatureDisabled: (error: unknown) => error instanceof Error && error.message === 'disabled',
}))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a> }))

beforeEach(() => {
  vi.resetAllMocks()
  api.attention.mockResolvedValue([])
  api.summaries.mockResolvedValue({ items: [], totalCount: 0 })
})

function renderSummary(capabilities = noSessionCapabilities, enabled = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><NeedsAttentionSummary capabilities={capabilities} enabled={enabled} /></QueryClientProvider>)
}

describe('Dashboard attention permissions and feedback', () => {
  it('does not call APIs for unauthorized or mock sessions', () => {
    const first = renderSummary()
    expect(screen.queryByText('Needs attention')).toBeNull()
    first.unmount()
    renderSummary({ ...noSessionCapabilities, canOperateCommercialWork: true, canManageOrderConfiguration: true }, false)
    expect(screen.getByText('Use a connected session to load current work.')).toBeTruthy()
    expect(api.attention).not.toHaveBeenCalled()
    expect(api.summaries).not.toHaveBeenCalled()
  })

  it('allows administrator CRM recovery without broader operational attention access', async () => {
    renderSummary({ ...noSessionCapabilities, canManageOrderConfiguration: true })
    expect(await screen.findByText('0 CRM sale summaries awaiting recovery')).toBeTruthy()
    expect(api.attention).not.toHaveBeenCalled()
    expect(api.summaries).toHaveBeenCalledWith(1)
    expect(screen.getByRole('link', { name: /View all/ }).getAttribute('href')).toBe('/dashboard/attention')
  })

  it('shows CRM failure even when the operational feature is disabled', async () => {
    api.attention.mockRejectedValue(new Error('disabled'))
    api.summaries.mockRejectedValue(new Error('CRM unavailable'))
    renderSummary({ ...noSessionCapabilities, canOperateCommercialWork: true, canManageOrderConfiguration: true })
    expect(await screen.findByText('Operational attention queues are not enabled.')).toBeTruthy()
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'CRM recovery could not be loaded. Open the queue to retry.')
    expect(screen.queryByText('No work needs attention.')).toBeNull()
  })

  it('reports a loaded empty operational queue without fetching CRM recovery', async () => {
    renderSummary({ ...noSessionCapabilities, canReleasePSeqResults: true })
    await waitFor(() => expect(api.attention).toHaveBeenCalledOnce())
    expect(await screen.findByText('No work needs attention.')).toBeTruthy()
    expect(api.summaries).not.toHaveBeenCalled()
  })
})
