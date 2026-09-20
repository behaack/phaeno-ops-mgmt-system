import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { acceptLabQuote, declineLabChangeQuote, issuePlatformQuote, type LabServiceOrder, type OrderConfiguration, type Quote } from '#/api/order-management'
import { IssueLabChangeQuote, LabChangeQuotes } from './LabChangeQuotes'
import { currentLabQuote } from './use-quote-status'

const identity = vi.hoisted(() => ({ allowed: true }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ session: { selectedOrganization: { organizationId: 'org' }, memberships: [{ organizationId: 'org', isOrganizationAdmin: false }], capabilities: { canAcceptLabServiceQuotes: identity.allowed }, selectedDepartment: { purchaseOrderRequired: true } } }) }))
vi.mock('#/api/order-management', async original => ({ ...await original<typeof import('#/api/order-management')>(), acceptLabQuote: vi.fn(), declineLabChangeQuote: vi.fn(), issuePlatformQuote: vi.fn(), downloadLabQuotePdf: vi.fn() }))
const initial = { id: 'initial', purpose: 'Initial', status: 'Accepted', revision: 1 } as Quote
const change = { id: 'change', purpose: 'Change', status: 'Issued', revision: 2, total: 100, subtotal: 100, currency: 'USD', expiresAt: '2099-01-01T00:00:00Z', changeScopeSnapshotJson: JSON.stringify({ additionalSources: [{ biologicalSource: 'Mouse liver', specimenCount: 1 }] }) } as Quote
const order = { id: 'job', organizationId: 'org', orderNumber: 'TEST-CHANGE', version: 5, requestedSpecimenCount: 2, status: 'InProgress', quotes: [change, initial] } as LabServiceOrder
function renderQuotes(value = order) { return render(<QueryClientProvider client={new QueryClient()}><LabChangeQuotes order={value} onSaved={vi.fn().mockResolvedValue(undefined)} /></QueryClientProvider>) }

describe('separate Change-quote decisions', () => {
  beforeEach(() => { vi.clearAllMocks(); identity.allowed = true })
  it('keeps the original accepted quote as the main Job agreement', () => { expect(currentLabQuote(order.quotes)?.id).toBe('initial') })
  it('requires affirmative acceptance and the Department PO before committing the reviewed revision', async () => {
    vi.mocked(acceptLabQuote).mockResolvedValue(order)
    renderQuotes()
    fireEvent.click(screen.getByRole('button', { name: 'Review and accept addition' }))
    expect(screen.getByRole('button', { name: 'Accept addition' })).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByRole('textbox', { name: /Purchase order number/ }), { target: { value: 'PO-CHANGE' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Accept addition' }))
    await waitFor(() => expect(acceptLabQuote).toHaveBeenCalledWith('job', 'change', 5, 'PO-CHANGE'))
  })
  it('declines only the separate proposal', async () => {
    vi.mocked(declineLabChangeQuote).mockResolvedValue(order)
    renderQuotes(); fireEvent.click(screen.getByRole('button', { name: 'Decline addition' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Decline addition' }).at(-1)!)
    await waitFor(() => expect(declineLabChangeQuote).toHaveBeenCalledWith('job', 'change', 5))
    expect(acceptLabQuote).not.toHaveBeenCalled()
  })
  it.each(['Expired', 'Superseded', 'Declined', 'Accepted'])('does not offer acceptance for %s', status => {
    renderQuotes({ ...order, quotes: [{ ...change, status }] }); expect(screen.queryByRole('button', { name: 'Review and accept addition' })).toBeNull()
  })
  it('does not offer a decision to a member', () => { identity.allowed = false; renderQuotes(); expect(screen.queryByRole('button', { name: 'Review and accept addition' })).toBeNull() })
  it('retains the reviewed version and additive counts during issuance', async () => {
    vi.mocked(issuePlatformQuote).mockResolvedValue(order)
    const catalog = [{ id: '00000000-0000-4000-8000-000000000001', isPSeqLabService: true, isActive: true, salesUnit: 'specimen', basePrice: 100 }] as OrderConfiguration['catalogItems']
    render(<QueryClientProvider client={new QueryClient()}><IssueLabChangeQuote order={order} catalogItems={catalog} onSaved={vi.fn().mockResolvedValue(undefined)} /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Issue Change quote' }))
    fireEvent.change(screen.getByLabelText('Biological source *'), { target: { value: 'Mouse liver' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Issue Change quote' }).at(-1)!)
    await waitFor(() => expect(issuePlatformQuote).toHaveBeenCalledWith('lab', 'job', expect.objectContaining({ version: 5, purpose: 'Change', additionalSources: [{ biologicalSource: 'Mouse liver', specimenCount: 1 }], lines: [expect.objectContaining({ quantity: 1, unitPrice: 100 })] })))
  })
})
