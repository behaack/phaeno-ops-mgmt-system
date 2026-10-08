import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { PaymentAllocationHistory, ReconciliationDetail } from '#/api/pseq-order-to-cash'
import { AllocationReversalDialog, ReconciliationDraftDialog } from './FinanceCorrections'
import { FinanceActionDialog } from './FinanceActionDialog'

const mocks = vi.hoisted(() => ({ reversePaymentAllocation: vi.fn(), listPaymentAllocations: vi.fn(), getReconciliation: vi.fn(), editReconciliationDraft: vi.fn(), cancelReconciliationDraft: vi.fn(), listMatchingInvoices: vi.fn(), allocatePayment: vi.fn(), listPaymentReceipts: vi.fn(), blocker: vi.fn(), saved: vi.fn(), close: vi.fn() }))
vi.mock('#/api/pseq-order-to-cash', () => mocks)
vi.mock('#/api/order-management', () => ({ getOrderErrorMessage: (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback, isOrderConcurrencyError: (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'concurrency_conflict') }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: mocks.blocker }))

const initial: PaymentAllocationHistory = {
  allocation: { id: 'allocation-1', paymentReceiptId: 'receipt-1', invoiceId: 'invoice-1', amount: 25, allocatedByUserId: 'operator-1', allocatedAtUtc: '2026-09-07T12:00:00Z', isReversed: false, version: 3, reversedByUserId: null, reversedAtUtc: null, reversalReason: null },
  invoice: { id: 'invoice-1', organizationId: 'customer-1', labServiceOrderId: 'order-1', invoiceNumber: 'INV-001', status: 'PartiallyPaid', issuedOn: '2026-09-01', dueOn: '2026-10-01', daysPastDue: 0, subtotal: 100, taxTotal: 0, adjustmentTotal: 0, total: 100, appliedTotal: 25, balance: 75, currency: 'USD', version: 8 },
  receipt: { id: 'receipt-1', organizationId: 'customer-1', receiptNumber: 'PAY-001', source: 'Manual', externalId: 'external-1', payer: 'Research customer', amount: 100, appliedAmount: 25, unappliedAmount: 75, currency: 'USD', receivedOn: '2026-09-01', method: 'Wire', bankReference: 'Bank-001', status: 'PartiallyApplied', version: 7 },
  allocatedByName: 'Finance Operator', reversedByName: null,
}
const draft: ReconciliationDetail = {
  batch: { id: 'batch-1', batchNumber: 'REC-001', periodEnd: '2026-09-07', ledgerReceiptTotal: 100, bankTotal: 90, difference: -10, status: 'Draft', createdByUserId: 'operator-1', submittedByUserId: null, approvedByUserId: null, closeoutReportJson: null, version: 4 },
  items: [{ sourceType: 'PaymentReceipt', sourceId: initial.receipt.id, reference: initial.receipt.receiptNumber, amount: 100 }, { sourceType: 'PaymentAllocation', sourceId: initial.allocation.id, reference: initial.invoice.invoiceNumber, amount: 0 }, { sourceType: 'InvoiceAdjustment', sourceId: 'adjustment-1', reference: initial.invoice.invoiceNumber, amount: 0 }],
  receipts: [initial.receipt], changes: [],
}
function wrap(node: ReactNode) { const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>) }
const common = { returnFocus: null, onClose: mocks.close, onSaved: mocks.saved }
beforeEach(() => { vi.resetAllMocks(); mocks.saved.mockResolvedValue(undefined); mocks.listPaymentAllocations.mockResolvedValue([initial]); mocks.getReconciliation.mockResolvedValue(draft) })

describe('Finance correction workflow', () => {
  it('requires a reason and reverses using the reviewed allocation, receipt and invoice versions', async () => {
    mocks.reversePaymentAllocation.mockResolvedValue({})
    wrap(<AllocationReversalDialog initial={initial} {...common} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reverse allocation' }))
    await screen.findByText('Reason is required.'); expect(mocks.reversePaymentAllocation).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Applied to the wrong invoice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reverse allocation' }))
    await waitFor(() => expect(mocks.reversePaymentAllocation).toHaveBeenCalledWith(initial.allocation.id, { reason: 'Applied to the wrong invoice', allocationVersion: 3, receiptVersion: 7, invoiceVersion: 8 }))
    await waitFor(() => expect(mocks.close).toHaveBeenCalledOnce())
  })

  it('retains a reversal reason on conflict and requires explicit review before using refreshed versions', async () => {
    const changed = { ...initial, allocation: { ...initial.allocation, version: 4 }, receipt: { ...initial.receipt, version: 9 }, invoice: { ...initial.invoice, version: 10 } }
    mocks.listPaymentAllocations.mockResolvedValue([changed]); mocks.reversePaymentAllocation.mockRejectedValueOnce({ code: 'concurrency_conflict' }).mockResolvedValue({})
    wrap(<AllocationReversalDialog initial={initial} {...common} />)
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Correct the match' } }); fireEvent.click(screen.getByRole('button', { name: 'Reverse allocation' }))
    await screen.findByRole('button', { name: 'Use reviewed record' })
    expect(screen.getByRole('button', { name: 'Reverse allocation' })).toHaveProperty('disabled', true)
    expect(screen.getByLabelText(/Reason/)).toHaveProperty('value', 'Correct the match')
    fireEvent.click(screen.getByRole('button', { name: 'Use reviewed record' })); fireEvent.click(screen.getByRole('button', { name: 'Reverse allocation' }))
    await waitFor(() => expect(mocks.reversePaymentAllocation).toHaveBeenLastCalledWith(initial.allocation.id, { reason: 'Correct the match', allocationVersion: 4, receiptVersion: 9, invoiceVersion: 10 }))
  })

  it('keeps a pending reversal open and blocks duplicate submission and navigation', async () => {
    let finish!: (value: unknown) => void
    mocks.reversePaymentAllocation.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    wrap(<AllocationReversalDialog initial={initial} {...common} />)
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Correct allocation' } }); fireEvent.click(screen.getByRole('button', { name: 'Reverse allocation' }))
    await screen.findByRole('button', { name: 'Saving…' })
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
    expect(screen.getByLabelText(/Reason/).matches(':disabled')).toBe(true)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(mocks.close).not.toHaveBeenCalled()
    expect(mocks.blocker.mock.lastCall![0].shouldBlockFn()).toBe(true)
    await act(async () => { finish({}) })
  })

  it('edits a reconciliation with a reason and retains existing allocation and adjustment links on failure', async () => {
    mocks.editReconciliationDraft.mockRejectedValue(new Error('Could not save correction'))
    wrap(<ReconciliationDraftDialog initial={draft} receipts={[]} cancel={false} {...common} />)
    fireEvent.change(screen.getByLabelText(/Bank total/), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Corrected bank total' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save draft changes' }))
    await screen.findByText('Could not save correction')
    expect(mocks.editReconciliationDraft).toHaveBeenCalledWith(draft.batch.id, { version: 4, reason: 'Corrected bank total', periodEnd: '2026-09-07', bankTotal: 100, paymentReceiptIds: ['receipt-1'], paymentAllocationIds: ['allocation-1'], invoiceAdjustmentIds: ['adjustment-1'] })
    expect(screen.getByLabelText(/Bank total/)).toHaveProperty('value', '100'); expect(screen.getByLabelText(/Reason/)).toHaveProperty('value', 'Corrected bank total')
    expect(mocks.close).not.toHaveBeenCalled()
  })

  it('does not allow a correction after refreshed review shows the batch was submitted', async () => {
    mocks.editReconciliationDraft.mockRejectedValue({ code: 'concurrency_conflict' })
    mocks.getReconciliation.mockResolvedValue({ ...draft, batch: { ...draft.batch, version: 5, status: 'Submitted' } })
    wrap(<ReconciliationDraftDialog initial={draft} receipts={[]} cancel={false} {...common} />)
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Review this discrepancy' } }); fireEvent.click(screen.getByRole('button', { name: 'Save draft changes' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Use reviewed record' }))
    await screen.findByText('Only a draft reconciliation can be edited or cancelled.')
    expect(screen.getByRole('button', { name: 'Save draft changes' })).toHaveProperty('disabled', true)
    expect(screen.getByLabelText(/Reason/)).toHaveProperty('value', 'Review this discrepancy')
  })

  it('protects a dirty cancellation and keeps financial source data out of the cancellation request', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mocks.cancelReconciliationDraft.mockResolvedValue({})
    wrap(<ReconciliationDraftDialog initial={draft} receipts={[]} cancel {...common} />)
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Duplicate working batch' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(confirm).toHaveBeenCalled(); expect(mocks.close).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reconciliation draft' }))
    await waitFor(() => expect(mocks.cancelReconciliationDraft).toHaveBeenCalledWith(draft.batch.id, 4, 'Duplicate working batch'))
    confirm.mockRestore()
  })

  it('keeps the next invoice page when an unchanged search debounce expires', async () => {
    vi.useFakeTimers()
    try {
      const firstPage = Array.from({ length: 25 }, (_, index) => ({ ...initial.invoice, id: `invoice-${index}`, invoiceNumber: `INV-${index}` }))
      const later = { ...initial.invoice, id: 'invoice-26', invoiceNumber: 'INV-026' }
      mocks.listMatchingInvoices.mockImplementation((_id: string, _search: string, page: number) => Promise.resolve(page === 1 ? [later] : firstPage))
      wrap(<FinanceActionDialog action="allocation" apiEnabled customerId="" customers={[]} receipts={[initial.receipt]} payment={initial.receipt} {...common} />)
      await act(async () => { await vi.advanceTimersByTimeAsync(1) })
      fireEvent.click(screen.getByRole('button', { name: 'Next invoices' }))
      await act(async () => { await vi.advanceTimersByTimeAsync(1) })
      expect(screen.getByRole('option', { name: 'INV-026 · $75.00' })).toBeTruthy()
      await act(async () => { await vi.advanceTimersByTimeAsync(300) })
      expect(screen.getByText('Page 2')).toBeTruthy()
      expect(screen.getByRole('option', { name: 'INV-026 · $75.00' })).toBeTruthy()
      fireEvent.change(screen.getByLabelText('Search invoices'), { target: { value: ' ' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(300) })
      expect(screen.getByText('Page 2')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('pages and searches same-Customer invoices beyond the first25 while retaining the selected snapshot', async () => {
    const firstPage = Array.from({ length: 25 }, (_, index) => ({ ...initial.invoice, id: `invoice-${index}`, invoiceNumber: `INV-${index}` }))
    const later = { ...initial.invoice, id: 'invoice-26', invoiceNumber: 'INV-026', version: 26 }
    mocks.listMatchingInvoices.mockImplementation((_id: string, search: string, page: number) => Promise.resolve(search ? [] : page === 1 ? [later] : firstPage))
    mocks.allocatePayment.mockResolvedValue({})
    wrap(<FinanceActionDialog action="allocation" apiEnabled customerId="" customers={[]} receipts={[initial.receipt]} payment={initial.receipt} {...common} />)
    await screen.findByRole('option', { name: 'INV-0 · $75.00' })
    fireEvent.click(screen.getByRole('button', { name: 'Next invoices' })); await screen.findByRole('option', { name: 'INV-026 · $75.00' })
    expect(mocks.listMatchingInvoices).toHaveBeenCalledWith(initial.receipt.id, '', 1)
    fireEvent.change(screen.getByLabelText(/^Invoice/), { target: { value: later.id } })
    fireEvent.change(screen.getByLabelText('Search invoices'), { target: { value: 'no-match' } })
    await waitFor(() => expect(mocks.listMatchingInvoices).toHaveBeenCalledWith(initial.receipt.id, 'no-match', 0))
    expect(screen.getByRole('option', { name: 'INV-026 · $75.00' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Amount \(USD\)/), { target: { value: '10' } }); fireEvent.click(screen.getByRole('button', { name: 'Allocate payment' }))
    await waitFor(() => expect(mocks.allocatePayment).toHaveBeenCalledWith(initial.receipt.id, { invoiceId: later.id, amount: 10, receiptVersion: 7, invoiceVersion: 26 }))
  })
})
