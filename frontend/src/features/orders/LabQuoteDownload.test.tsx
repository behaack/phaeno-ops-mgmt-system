import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LabServiceOrder, Quote } from '#/api/order-management'
import { bundleLabDraft } from '#/test-helpers/bundled-orders'
import { LabServiceDetailPage } from './LabServiceDetailPage'

const mocks = vi.hoisted(() => ({ getOrder: vi.fn(), getPdf: vi.fn(), createUrl: vi.fn(), revokeUrl: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="#job">{children}</a>, useNavigate: () => vi.fn(), useBlocker: vi.fn() }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canViewLabServiceOrders: true, canViewLabServiceInvoices: false } } }) }))
vi.mock('#/api/client', () => ({ api: { get: mocks.getPdf } }))
vi.mock('#/api/order-management', async original => ({ ...await original<typeof import('#/api/order-management')>(), getLabOrder: mocks.getOrder }))
vi.mock('#/api/pseq-order-to-cash', () => ({ listCustomerInvoices: async () => [], listCustomerResultPackages: async () => [], downloadCustomerInvoicePdf: vi.fn(), downloadCustomerResultArtifact: vi.fn() }))
vi.mock('./StandardLabServicePanel', () => ({ StandardLabServicePanel: () => null }))
vi.mock('./LabServiceTimingPanel', () => ({ LabServiceTimingPanel: () => null }))
vi.mock('./LabJobSamplesPanel', () => ({ LabJobSamplesPanel: () => null }))

const issuedQuote: Quote = {
  id: 'issued-quote', revision: 2, purpose: 'Initial', status: 'Issued', linesJson: '[{"description":"PSeq Lab Service","quantity":9,"unitPrice":100}]',
  subtotal: 900, tax: 0, total: 900, currency: 'USD', issuedAt: '2026-09-04T14:22:00Z', expiresAt: '2026-10-04T14:22:00Z', acceptedAt: null, version: 1,
}
const job: LabServiceOrder = {
  ...bundleLabDraft, status: 'QuoteIssued', canEdit: false, canSubmit: false, canWithdraw: false, canAcceptQuote: false,
  quotes: [{ ...issuedQuote, id: 'superseded-quote', revision: 1, status: 'Superseded' }, issuedQuote],
  requestRevisions: [{ id: 'request-revision', revision: 1, previousRevisionId: null, snapshotJson: '{"customerReference":"Submitted reference"}', correctionReason: null, submittedByUserId: 'requester', submittedAt: '2026-09-03T10:00:00Z' }],
}

let downloads: string[]
beforeEach(() => {
  vi.clearAllMocks()
  downloads = []
  mocks.getOrder.mockResolvedValue(job)
  mocks.getPdf.mockReset()
  mocks.createUrl.mockReturnValue('blob:quote-download')
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = mocks.createUrl
    static revokeObjectURL = mocks.revokeUrl
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloads.push(this.download) })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

function show() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><LabServiceDetailPage orderId={job.id} /></QueryClientProvider>)
}

describe('Customer quote PDF download', () => {
  it('downloads the displayed issued revision as a PDF for a read-only member and prevents repeated clicks while pending', async () => {
    const pdf = new Blob(['%PDF-1.4\nSynthetic quote'], { type: 'application/pdf' })
    let finish!: (response: { data: Blob }) => void
    mocks.getPdf.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    show()
    const button = await screen.findByRole('button', { name: 'Download quote PDF' })
    expect(button.closest('[data-slot="card"]')).toBeNull()
    expect(screen.getByText('Revision 2')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Accept quote' })).toBeNull()
    fireEvent.click(button)
    await waitFor(() => expect(mocks.getPdf).toHaveBeenCalledWith(`/lab-service-orders/${job.id}/quotes/${issuedQuote.id}/pdf`, { responseType: 'blob' }))
    expect(button).toHaveProperty('disabled', true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    fireEvent.click(button)
    expect(mocks.getPdf).toHaveBeenCalledTimes(1)
    expect(downloads).toEqual([])
    await act(async () => finish({ data: pdf }))
    await waitFor(() => expect(button).toHaveProperty('disabled', false))
    expect(mocks.createUrl).toHaveBeenCalledWith(pdf)
    expect(downloads).toEqual([`${job.orderNumber}-quote-r2.pdf`])
    expect(mocks.revokeUrl).toHaveBeenCalledWith('blob:quote-download')
  })

  it('shows a persistent API envelope error without saving it as a file, then allows a successful retry', async () => {
    const envelope = JSON.stringify({ success: false, data: null, error: { code: 'quote_unavailable', message: 'This quote is temporarily unavailable. Try again.' } })
    const errorBody = new Blob([envelope], { type: 'application/json' })
    Object.defineProperty(errorBody, 'text', { value: async () => envelope })
    mocks.getPdf.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503, data: errorBody } })
    mocks.getPdf.mockResolvedValueOnce({ data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }) })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Download quote PDF' }))
    await screen.findByText('Quote could not be downloaded')
    expect(screen.getByText('This quote is temporarily unavailable. Try again.')).toBeTruthy()
    expect(downloads).toEqual([])
    const retry = screen.getByRole('button', { name: 'Download quote PDF' })
    expect(retry).toHaveProperty('disabled', false)
    fireEvent.click(retry)
    await waitFor(() => expect(downloads).toEqual([`${job.orderNumber}-quote-r2.pdf`]))
    expect(mocks.getPdf).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Quote could not be downloaded')).toBeNull()
  })

  it('uses recoverable fallback feedback for a non-JSON download failure', async () => {
    const errorBody = new Blob(['Service unavailable'], { type: 'text/plain' })
    Object.defineProperty(errorBody, 'text', { value: async () => 'Service unavailable' })
    mocks.getPdf.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503, data: errorBody } })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Download quote PDF' }))
    await screen.findByText('Quote could not be downloaded')
    expect(screen.getByText('Try Download quote PDF again. If the problem continues, contact Phaeno.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Download quote PDF' })).toHaveProperty('disabled', false)
    expect(downloads).toEqual([])
  })

  it('keeps submitted request snapshots as JSON and hides the quote action until a quote exists', async () => {
    mocks.getOrder.mockResolvedValueOnce({ ...job, quotes: [] })
    show()
    fireEvent.click(await screen.findByText('Order history'))
    fireEvent.click(await screen.findByRole('button', { name: 'Download snapshot' }))
    expect(downloads).toEqual([`${job.orderNumber}-request-r1.json`])
    expect(mocks.createUrl.mock.lastCall?.[0]).toHaveProperty('type', 'application/json')
    expect(mocks.getPdf).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Download quote PDF' })).toBeNull()
    expect(screen.getByText('Phaeno has not issued pricing yet.')).toBeTruthy()
  })
})
