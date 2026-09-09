import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabServiceOrder, Quote } from '#/api/order-management'
import { bundleLabDraft } from '#/test-helpers/bundled-orders'
import { LabServiceDetailPage } from './LabServiceDetailPage'

const mocks = vi.hoisted(() => ({ read: vi.fn(), extend: vi.fn(), accept: vi.fn(), withdraw: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="#job">{children}</a>, useBlocker: vi.fn() }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canViewLabServiceOrders: true, canViewLabServiceInvoices: false } } }) }))
vi.mock('#/api/order-management', async original => ({ ...await original<typeof import('#/api/order-management')>(), getLabOrder: mocks.read, requestLabQuoteExtension: mocks.extend, acceptLabQuote: mocks.accept, withdrawLabOrder: mocks.withdraw }))
vi.mock('#/api/pseq-order-to-cash', () => ({ listCustomerInvoices: async () => [], listCustomerResultPackages: async () => [], downloadCustomerInvoicePdf: vi.fn(), downloadCustomerResultArtifact: vi.fn() }))
vi.mock('./StandardLabServicePanel', () => ({ StandardLabServicePanel: () => null }))
vi.mock('./LabServiceTimingPanel', () => ({ LabServiceTimingPanel: () => null }))
vi.mock('./LabJobSamplesPanel', () => ({ LabJobSamplesPanel: () => null }))

const quote: Quote = { id: 'quote-1', revision: 1, status: 'Expired', purpose: 'Initial', issuedAt: '2020-09-04T14:00:00Z', expiresAt: '2020-10-04T14:00:00Z', acceptedAt: null, linesJson: '[{"description":"PSeq Lab Service","quantity":9,"unitPrice":100}]', subtotal: 900, tax: 0, total: 900, currency: 'USD', version: 1 }
const expired: LabServiceOrder = { ...bundleLabDraft, status: 'QuoteIssued', version: 3, quotes: [quote], canEdit: false, canSubmit: false, canWithdraw: false, canAcceptQuote: false, canManageQuotes: true, canRequestQuoteExtension: true }
const pending: LabServiceOrder = { ...expired, version: 4, canRequestQuoteExtension: false, quotes: [{ ...quote, extensionRequest: { id: 'extension-1', quoteId: quote.id, status: 'Pending', reason: 'Need time for approval', requestedAt: '2026-09-08T12:00:00Z', resolvedAt: null, replacementQuoteId: null } }] }
beforeEach(() => { vi.clearAllMocks(); mocks.read.mockResolvedValue(expired); mocks.extend.mockReset(); mocks.accept.mockReset(); mocks.withdraw.mockReset() })
afterEach(() => { vi.restoreAllMocks() })

function show(order = expired) {
  mocks.read.mockResolvedValue(order)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><LabServiceDetailPage orderId={order.id} /></QueryClientProvider>)
  return client
}
async function requestDialog() {
  fireEvent.click(await screen.findByRole('button', { name: 'Request extension' }))
  return screen.findByRole('dialog', { name: 'Request quote extension' })
}

describe('Lab quote acceptance and extensions', () => {
  it('places one obvious acceptance action alongside the valid quote for administrators', async () => {
    show({ ...expired, canAcceptQuote: true, canWithdraw: true, canRequestQuoteExtension: false, quotes: [{ ...quote, status: 'Issued', expiresAt: '2099-10-04T14:00:00Z' }] })
    const accept = await screen.findByRole('button', { name: 'Accept quote' })
    expect(screen.getAllByRole('button', { name: 'Accept quote' })).toHaveLength(1)
    expect(accept).toHaveProperty('disabled', false)
    expect(accept.closest('[data-slot="card"]')?.textContent).toContain('Quote and billing')
    const actions = screen.getByRole('group', { name: 'Quote actions' })
    expect(within(actions).getAllByRole('button').map(button => button.textContent)).toEqual(['Accept quote', 'Decline quote', 'Download quote PDF'])
    expect(screen.getAllByRole('button', { name: /^Decline quote$/ })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Request extension' })).toBeNull()
    fireEvent.click(accept)
    expect(await screen.findByRole('dialog', { name: /Accept quote for/ })).toBeTruthy()
  })

  it.each(['Issued', 'Expired'])('explains Member permissions for an %s quote without exposing administrator actions', async status => {
    show({ ...expired, canManageQuotes: false, canRequestQuoteExtension: false, quotes: [{ ...quote, status, expiresAt: status === 'Issued' ? '2099-10-04T14:00:00Z' : quote.expiresAt }] })
    expect(await screen.findByText(/An organization or department administrator must accept this quote/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Accept quote' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Request extension' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Download quote PDF' })).toHaveProperty('disabled', false)
  })

  it('marks expiration with red text and a warning, blocks acceptance and keeps the PDF and extension action available', async () => {
    show()
    const expiredDate = await screen.findByText(/Expired on/)
    expect(expiredDate.className).toContain('text-destructive')
    expect(expiredDate.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('Expired').className).toContain('destructive')
    const accept = screen.getByRole('button', { name: 'Accept quote' })
    expect(accept).toHaveProperty('disabled', true)
    expect(screen.getByText(/This quote has expired and cannot be accepted/)).toHaveProperty('id', accept.getAttribute('aria-describedby'))
    fireEvent.click(accept)
    expect(mocks.accept).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Download quote PDF' })).toHaveProperty('disabled', false)
    expect(screen.getByRole('button', { name: 'Request extension' })).toHaveProperty('disabled', false)
  })

  it('keeps an accepted quote Accepted after its original expiration date', async () => {
    show({ ...expired, status: 'PlacedAwaitingSamples', canRequestQuoteExtension: false, quotes: [{ ...quote, status: 'Accepted', acceptedAt: '2020-09-08T14:00:00Z' }] })
    expect(await screen.findByText('Accepted')).toBeTruthy()
    expect(screen.queryByText(/Expired on/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Accept quote' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Request extension' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Download quote PDF' })).toBeTruthy()
  })

  it.each(['Issued', 'Expired'])('describes quote decline as closing the request for an %s quote', async status => {
    show({ ...expired, canWithdraw: true, quotes: [{ ...quote, status, expiresAt: status === 'Issued' ? '2099-10-04T14:00:00Z' : quote.expiresAt }] })
    fireEvent.click(await screen.findByRole('button', { name: /^Decline quote$/ }))
    const dialog = await screen.findByRole('dialog', { name: `Decline quote for ${expired.orderNumber}` })
    expect(within(dialog).getByText('Declining this quote will close this request.')).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Decline quote and close request' })).toHaveProperty('disabled', false)
    expect(within(dialog).getByRole('button', { name: 'Keep reviewing' })).toBeTruthy()
    expect(within(dialog).getByLabelText(/Reason/)).toBeTruthy()
  })

  it('retains request withdrawal wording before a quote is issued', async () => {
    show({ ...expired, status: 'SubmittedForQuote', canWithdraw: true, quotes: [] })
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw request' }))
    const dialog = await screen.findByRole('dialog', { name: `Withdraw ${expired.orderNumber}` })
    expect(within(dialog).getByText('This closes the request before work is placed.')).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Withdraw request' })).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Keep order' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Decline quote$/ })).toBeNull()
  })

  it.each([
    { reason: 'Selected another vendor', explanation: '', expected: 'Selected another vendor' },
    { reason: 'Other', explanation: '  Approval is delayed.  ', expected: 'Other: Approval is delayed.' },
  ])('passes the selected $reason decline reason through the existing request-withdrawal action', async ({ reason, explanation, expected }) => {
    show({ ...expired, canWithdraw: true })
    fireEvent.click(await screen.findByRole('button', { name: /^Decline quote$/ }))
    const dialog = await screen.findByRole('dialog', { name: `Decline quote for ${expired.orderNumber}` })
    fireEvent.change(within(dialog).getByRole('combobox', { name: /Reason/ }), { target: { value: reason } })
    if (reason === 'Other') fireEvent.change(within(dialog).getByLabelText(/Please explain/), { target: { value: explanation } })
    mocks.withdraw.mockResolvedValueOnce({ ...expired, status: 'Cancelled', canWithdraw: false })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline quote and close request' }))
    await waitFor(() => expect(mocks.withdraw).toHaveBeenCalledExactlyOnceWith(expired.id, expired.version, expected))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(mocks.accept).not.toHaveBeenCalled()
    expect(mocks.extend).not.toHaveBeenCalled()
  })

  it('retains a failed request and its retry key, prevents duplicates while sending, then shows Extension requested', async () => {
    show()
    const dialog = await requestDialog()
    const reason = within(dialog).getByLabelText('Reason (optional)')
    fireEvent.change(reason, { target: { value: 'Need time for approval' } })
    let fail!: (reason: Error) => void
    mocks.extend.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request extension' }))
    await waitFor(() => expect(mocks.extend).toHaveBeenCalledOnce())
    expect(mocks.extend).toHaveBeenCalledWith(expired.id, quote.id, 3, 'Need time for approval', expect.any(String))
    const key = mocks.extend.mock.calls[0][4]
    expect(reason).toHaveProperty('disabled', true)
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sending request…' }))
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(mocks.extend).toHaveBeenCalledOnce()
    await act(async () => fail(new Error('Connection lost. Try again.')))
    await within(dialog).findByText('Connection lost. Try again.')
    expect(reason).toHaveProperty('value', 'Need time for approval')
    mocks.read.mockResolvedValue(pending)
    mocks.extend.mockResolvedValueOnce(pending)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request extension' }))
    const requested = await screen.findByRole('button', { name: 'Extension requested' })
    expect(requested).toHaveProperty('disabled', true)
    expect(mocks.extend.mock.calls[1][4]).toBe(key)
    expect(screen.queryByRole('button', { name: 'Request extension' })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows a saved pending request to Members without offering a duplicate request', async () => {
    show({ ...pending, canManageQuotes: false })
    expect(await screen.findByText('Extension requested')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Request extension' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Extension requested' })).toBeNull()
  })

  it('allows an optional empty reason and validates a long reason beside the field', async () => {
    show()
    const dialog = await requestDialog()
    const reason = within(dialog).getByLabelText('Reason (optional)')
    fireEvent.change(reason, { target: { value: 'a'.repeat(2001) } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request extension' }))
    expect(await within(dialog).findByText('Use 2,000 characters or fewer.')).toBeTruthy()
    expect(mocks.extend).not.toHaveBeenCalled()
    fireEvent.change(reason, { target: { value: '' } })
    mocks.read.mockResolvedValue(pending)
    mocks.extend.mockResolvedValueOnce(pending)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request extension' }))
    await waitFor(() => expect(mocks.extend).toHaveBeenCalledWith(expired.id, quote.id, 3, '', expect.any(String)))
  })

  it.each(['Cancel', 'Close', 'Escape'])('protects a dirty extension reason when closing with %s', async method => {
    show()
    const dialog = await requestDialog()
    fireEvent.change(within(dialog).getByLabelText('Reason (optional)'), { target: { value: 'Waiting for approval' } })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    if (method === 'Escape') fireEvent.keyDown(dialog, { key: 'Escape' })
    else fireEvent.click(within(dialog).getByRole('button', { name: method }))
    expect(confirm).toHaveBeenCalledWith('Discard the unsaved extension request?')
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(within(dialog).getByLabelText('Reason (optional)')).toHaveProperty('value', 'Waiting for approval')
    expect(mocks.extend).not.toHaveBeenCalled()
  })

  it('retains the reason and requires review after a concurrent Job change', async () => {
    show()
    const dialog = await requestDialog()
    fireEvent.change(within(dialog).getByLabelText('Reason (optional)'), { target: { value: 'Please review' } })
    mocks.read.mockResolvedValue({ ...expired, version: 4 })
    mocks.extend.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { error: { code: 'concurrency_conflict', message: 'The Job changed.' } } } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request extension' }))
    await within(dialog).findByText('The Job changed')
    expect(within(dialog).getByRole('button', { name: 'Request extension' })).toHaveProperty('disabled', true)
    expect(within(dialog).getByLabelText('Reason (optional)')).toHaveProperty('value', 'Please review')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Use current quote' }))
    expect(within(dialog).getByRole('button', { name: 'Request extension' })).toHaveProperty('disabled', false)
  })

  it('blocks acceptance when a newer revision arrives while its confirmation is open', async () => {
    const valid = { ...expired, canAcceptQuote: true, canRequestQuoteExtension: false, quotes: [{ ...quote, status: 'Issued', expiresAt: '2099-10-04T14:00:00Z' }] }
    const client = show(valid)
    fireEvent.click(await screen.findByRole('button', { name: 'Accept quote' }))
    const dialog = await screen.findByRole('dialog', { name: /Accept quote for/ })
    act(() => client.setQueryData(['lab-service-order', expired.id], { ...valid, version: 4, quotes: [{ ...valid.quotes[0], id: 'quote-2', revision: 2 }] }))
    expect(await within(dialog).findByText('The quote changed. Close this dialog and review the current revision.')).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Accept quote and place order' })).toHaveProperty('disabled', true)
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('updates and blocks an open acceptance confirmation when its deadline passes', async () => {
    const now = Date.now()
    const valid = { ...expired, canAcceptQuote: true, canRequestQuoteExtension: false, quotes: [{ ...quote, status: 'Issued', expiresAt: new Date(now + 60_000).toISOString() }] }
    show(valid)
    fireEvent.click(await screen.findByRole('button', { name: 'Accept quote' }))
    const dialog = await screen.findByRole('dialog', { name: /Accept quote for/ })
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now + 60_001)
    act(() => window.dispatchEvent(new Event('focus')))
    expect(within(dialog).getByRole('button', { name: 'Accept quote and place order' })).toHaveProperty('disabled', true)
    expect(within(dialog).getByText(/This quote has expired and cannot be accepted/)).toBeTruthy()
    expect(mocks.accept).not.toHaveBeenCalled()
    nowSpy.mockRestore()
  })
})
