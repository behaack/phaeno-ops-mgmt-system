import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LabServiceOrder, Quote } from '#/api/order-management'
import { CommercialControlPanel } from './OrderOperationsPage'

const session = vi.hoisted(() => ({ canOperateCommercialWork: true }))
vi.mock('#/features/auth/session-context', () => ({
  usePhaenoSession: () => ({ session: { capabilities: session } }),
  getSelectedMembership: vi.fn(),
}))
vi.mock('./operations/CancellationDecisionPanel', () => ({ CancellationDecisionPanel: () => null }))
vi.mock('./operations/PlatformQuoteDialog', () => ({
  PlatformQuoteDialog: ({ open, sourceQuote }: { open: boolean; sourceQuote?: Quote }) => open
    ? <div role="dialog">Reissue revision {sourceQuote?.revision}</div> : null,
}))

const quote = {
  id: 'quote-1', revision: 1, status: 'Expired',
  extensionRequest: { id: 'request-1', quoteId: 'quote-1', status: 'Pending', reason: 'More time for purchase approval.', requestedAt: '2026-09-08T12:00:00Z' },
} as Quote

describe('Commercial quote extension review', () => {
  beforeEach(() => { session.canOperateCommercialWork = true })

  it('shows the pending reason and opens the existing revision for authorized review', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined)
    renderPanel({ canManageQuotes: true }, onSaved)
    expect(screen.getByText('Quote extension requested')).toBeTruthy()
    expect(screen.getByText('More time for purchase approval.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Review extension' }))
    expect(await screen.findByRole('dialog')).toHaveProperty('textContent', 'Reissue revision 1')
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it.each([
    { capability: false, serverPermission: true },
    { capability: true, serverPermission: false },
  ])('keeps unauthorized staff review-only ($capability / $serverPermission)', ({ capability, serverPermission }) => {
    session.canOperateCommercialWork = capability
    renderPanel({ canManageQuotes: serverPermission })
    expect(screen.getByText('Quote extension requested')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Review extension' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reissue quote' })).toBeNull()
    expect(screen.getByText('An authorized Commercial Operator must review this request.')).toBeTruthy()
  })

  it('allows an authorized operator to reissue a quote without a pending request', () => {
    renderPanel({ canManageQuotes: true, quotes: [{ ...quote, extensionRequest: null }] })
    expect(screen.getByRole('button', { name: 'Reissue quote' })).toBeTruthy()
    expect(screen.queryByText('Quote extension requested')).toBeNull()
  })

  it('does not present reissue once the quote is accepted', () => {
    renderPanel({ canManageQuotes: false, status: 'PlacedAwaitingSamples', quotes: [{ ...quote, status: 'Accepted', extensionRequest: null }] })
    expect(screen.queryByRole('button', { name: 'Reissue quote' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Review extension' })).toBeNull()
  })
})

function renderPanel(overrides: Partial<LabServiceOrder>, onSaved = vi.fn().mockResolvedValue(undefined)) {
  const order = { id: 'order-1', status: 'QuoteIssued', requestedSpecimenCount: 3, quotes: [quote], cancellationRequests: [], ...overrides } as LabServiceOrder
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><CommercialControlPanel workflow="lab" item={order} catalogItems={[]} labWorkOrderId={null} onSaved={onSaved} /></QueryClientProvider>)
}
