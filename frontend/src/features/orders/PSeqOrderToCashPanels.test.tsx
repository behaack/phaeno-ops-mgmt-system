import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  FinanceOperationsPanel,
  OperationalAttentionPanel,
} from './PSeqOrderToCashPanels'
import type { AccountsReceivableCustomer, PaymentImportBatch } from '#/api/pseq-order-to-cash'

const mocks = vi.hoisted(() => ({
  listStageEligibleCustomers: vi.fn(),
  createStagedPSeqOrder: vi.fn(),
  listOperationalAttention: vi.fn(),
  assignOperationalAttention: vi.fn(),
  resolveOperationalAttention: vi.fn(),
  listResultPackages: vi.fn(),
  releaseResultPackage: vi.fn(),
  withdrawResultPackage: vi.fn(),
  getOrderConfiguration: vi.fn(),
  allocatePayment: vi.fn(),
  adjustInvoice: vi.fn(),
  authorizeResultReissue: vi.fn(),
  approveTaxDecision: vi.fn(),
  approveReconciliation: vi.fn(),
  confirmPaymentImport: vi.fn(),
  createReconciliation: vi.fn(),
  exportAccountsReceivableReport: vi.fn(),
  getAgingSummary: vi.fn(),
  listAccountsReceivableCustomers: vi.fn(),
  listInvoices: vi.fn(),
  listMatchingInvoices: vi.fn(),
  listPaymentReceipts: vi.fn(),
  listReconciliations: vi.fn(),
  previewPaymentImport: vi.fn(),
  recordPaymentReceipt: vi.fn(),
  recordPaymentReceiptWithEvidence: vi.fn(),
  downloadPaymentEvidence: vi.fn(),
  reversePaymentReceipt: vi.fn(),
  submitReconciliation: vi.fn(),
  updateBillingProfile: vi.fn(),
}))

const router = vi.hoisted(() => ({ search: {} as Record<string, string | number>, navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  useSearch: () => router.search,
  useBlocker: vi.fn(),
  useNavigate: () => router.navigate,
  Link: ({ children, to, params }: { children: ReactNode; to: string; params?: Record<string, string> }) =>
    <a href={Object.entries(params ?? {}).reduce((path, [key, value]) => path.replace(`$${key}`, value), to)}>{children}</a>,
}))

vi.mock('#/api/pseq-order-to-cash', () => mocks)

vi.mock('#/api/order-management', () => ({
  getOrderConfiguration: mocks.getOrderConfiguration,
  getOrderErrorMessage: (_error: unknown, fallback: string) => fallback,
}))

describe('PSeq order-to-cash panels', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetAllMocks()
    router.search = {}
    mocks.getOrderConfiguration.mockResolvedValue({ analyses: [] })
    mocks.listAccountsReceivableCustomers.mockResolvedValue([])
    mocks.listInvoices.mockResolvedValue([])
    mocks.getAgingSummary.mockResolvedValue({ current: 0, days1To30: 0, days31To60: 0, days61To90: 0, over90: 0, organizations: [] })
    mocks.listPaymentReceipts.mockResolvedValue([])
    mocks.listReconciliations.mockResolvedValue([])
  })

  it('filters recoverable retention notices in the Operations queue', async () => {
    mocks.listOperationalAttention.mockResolvedValue([])
    renderPanel(<OperationalAttentionPanel apiEnabled userId="operator-user" />)
    fireEvent.change(screen.getByLabelText('Queue'), { target: { value: 'RetentionNoticeFailure' } })
    await screen.findByText('No unresolved items in this queue.')
    expect(mocks.listOperationalAttention).toHaveBeenCalledWith('RetentionNoticeFailure')
  })

  it('exposes an explicit empty attention state after checking the queue', async () => {
    mocks.listOperationalAttention.mockResolvedValue([])

    renderPanel(
      <OperationalAttentionPanel apiEnabled userId="operator-user" />,
    )

    expect(
      await screen.findByText('No unresolved items in this queue.'),
    ).toBeTruthy()
    expect(screen.getByLabelText('Queue')).toBeTruthy()
  })

  it('opens Customer billing as a record before exposing the bounded edit form', async () => {
    mocks.listAccountsReceivableCustomers.mockResolvedValue([customer])
    renderPanel(<FinanceOperationsPanel apiEnabled canBill canManageCash={false} canReconcile={false} record={{ kind: 'customer', id: customer.organizationId }} />)

    expect(await screen.findByText('Ari Finance')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: /Billing contact name/ })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to Finance' }).getAttribute('href')).toBe('/order-operations')
    fireEvent.click(screen.getByRole('button', { name: 'Edit billing and tax' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByDisplayValue('Ari Finance')).toBeTruthy()
    expect(dialog.getByText('Finance approval required')).toBeTruthy()
    expect(dialog.getByRole('button', { name: 'Save changes' })).toHaveProperty('disabled', true)
    expect(dialog.getByRole('button', { name: 'Approve current tax decision' })).toHaveProperty('disabled', false)
    expect(screen.queryByRole('button', { name: 'Record receipt' })).toBeNull()
  })

  it('keeps billing discovery form-free and links to the Customer record', async () => {
    router.search = { financeSection: 'customers' }
    mocks.listAccountsReceivableCustomers.mockResolvedValue([customer])
    renderPanel(<FinanceOperationsPanel apiEnabled canBill canManageCash={false} canReconcile={false} />)

    expect((await screen.findByRole('link', { name: 'Atlas Research' })).getAttribute('href')).toBe('/order-operations/finance/customer/customer-id')
    expect(screen.queryByRole('textbox', { name: /Billing contact name/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Record receipt' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Import receipts' })).toBeNull()
  })

  it('shows a Cash Reconciler submitted batch details without Cash Operator controls', async () => {
    mocks.listReconciliations.mockResolvedValue([batch])
    renderPanel(<FinanceOperationsPanel apiEnabled canBill={false} canManageCash={false} canReconcile record={{ kind: 'reconciliation', id: batch.id }} />)

    expect(await screen.findByText(batch.batchNumber)).toBeTruthy()
    expect(mocks.listReconciliations).toHaveBeenCalledWith(batch.id)
    fireEvent.click(screen.getByRole('button', { name: 'Approve independently' }))
    await waitFor(() => expect(mocks.approveReconciliation).toHaveBeenCalledWith(batch.id, batch.version))
    expect(screen.queryByRole('button', { name: 'New reconciliation' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Submit balanced batch' })).toBeNull()
    expect(mocks.listPaymentReceipts).not.toHaveBeenCalled()
  })

  it('requires choosing the reconciliation record from the queue before approving', async () => {
    mocks.listReconciliations.mockResolvedValue([batch])
    renderPanel(<FinanceOperationsPanel apiEnabled canBill={false} canManageCash={false} canReconcile />)
    expect((await screen.findByRole('link', { name: batch.batchNumber })).getAttribute('href')).toBe('/order-operations/finance/reconciliation/batch-id')
    expect(screen.queryByRole('button', { name: 'Approve independently' })).toBeNull()
  })

  it('retains an invoice adjustment and reason when the save fails', async () => {
    mocks.listInvoices.mockResolvedValue([invoice])
    mocks.adjustInvoice.mockRejectedValue(new Error('Invoice changed'))
    renderPanel(<FinanceOperationsPanel apiEnabled canBill canManageCash={false} canReconcile={false} record={{ kind: 'invoice', id: invoice.id }} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Record adjustment' }))
    expect(mocks.listInvoices).toHaveBeenCalledWith(false, invoice.id, undefined)
    fireEvent.change(screen.getByLabelText(/Amount \(USD\)/), { target: { value: '35.50' } })
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Correct duplicate charge' } })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Record adjustment' }))

    expect(await screen.findByText('Action was not saved')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByLabelText(/Amount \(USD\)/)).toHaveProperty('value', '35.50')
    expect(screen.getByLabelText(/Reason/)).toHaveProperty('value', 'Correct duplicate charge')
    expect(mocks.adjustInvoice).toHaveBeenCalledWith(invoice.id, { kind: 'Credit', amount: 35.5, reason: 'Correct duplicate charge', invoiceVersion: invoice.version })
  })

  it('allocates from a receipt record using current same-Customer suggestions and retains a failed allocation', async () => {
    mocks.listPaymentReceipts.mockResolvedValue([{ id: 'receipt-id', organizationId: customer.organizationId, receiptNumber: 'PAY-100', source: 'Bank', externalId: 'EXT-1', payer: 'Atlas', amount: 100, appliedAmount: 0, unappliedAmount: 100, currency: 'USD', receivedOn: '2026-09-01', method: 'Wire', bankReference: 'BANK-1', status: 'Recorded', version: 7 }])
    mocks.listMatchingInvoices.mockResolvedValue([invoice])
    mocks.allocatePayment.mockRejectedValue(new Error('Receipt changed'))
    renderPanel(<FinanceOperationsPanel apiEnabled canBill={false} canManageCash canReconcile={false} record={{ kind: 'receipt', id: 'receipt-id' }} />)
    expect(await screen.findByText('PAY-100')).toBeTruthy()
    expect(mocks.listPaymentReceipts).toHaveBeenCalledWith(false, 'receipt-id', undefined)
    expect(screen.queryByLabelText(/Invoice/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Allocate to invoice' }))
    await screen.findByRole('option', { name: /INV-100/ })
    expect(mocks.listMatchingInvoices).toHaveBeenCalledWith('receipt-id')
    fireEvent.change(screen.getByLabelText(/Invoice/), { target: { value: invoice.id } })
    fireEvent.change(screen.getByLabelText(/Amount \(USD\)/), { target: { value: '25' } })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Allocate payment' }))
    expect(await screen.findByText('Action was not saved')).toBeTruthy()
    expect(screen.getByLabelText(/Invoice/)).toHaveProperty('value', invoice.id)
    expect(screen.getByLabelText(/Amount \(USD\)/)).toHaveProperty('value', '25')
    expect(mocks.allocatePayment).toHaveBeenCalledWith('receipt-id', { invoiceId: invoice.id, amount: 25, receiptVersion: 7, invoiceVersion: invoice.version })
  })

  it('validates an adjustment inline and focuses the first issue without sending a request', async () => {
    mocks.listInvoices.mockResolvedValue([invoice])
    renderPanel(<FinanceOperationsPanel apiEnabled canBill canManageCash={false} canReconcile={false} record={{ kind: 'invoice', id: invoice.id }} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Record adjustment' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('button', { name: 'Record adjustment' })).toHaveProperty('disabled', false)
    fireEvent.click(dialog.getByRole('button', { name: 'Record adjustment' }))
    const amount = screen.getByLabelText(/Amount \(USD\)/)
    await waitFor(() => expect(amount.getAttribute('aria-invalid')).toBe('true'))
    expect(amount.getAttribute('aria-describedby')).toBe('finance-amount-error')
    expect(document.activeElement).toBe(amount)
    expect(mocks.adjustInvoice).not.toHaveBeenCalled()
    fireEvent.change(amount, { target: { value: '30' } })
    await waitFor(() => expect(amount.getAttribute('aria-invalid')).toBe('false'))
  })

  it('warns before discarding a dirty Finance action and restores its trigger after Escape', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    mocks.listInvoices.mockResolvedValue([invoice])
    renderPanel(<FinanceOperationsPanel apiEnabled canBill canManageCash={false} canReconcile={false} record={{ kind: 'invoice', id: invoice.id }} />)
    const opener = await screen.findByRole('button', { name: 'Record adjustment' })
    opener.focus()
    fireEvent.click(opener)
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Keep my explanation' } })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(confirm).toHaveBeenCalledWith('Discard unsaved Finance changes?')
    expect(screen.getByLabelText(/Reason/)).toHaveProperty('value', 'Keep my explanation')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(opener))
    expect(mocks.adjustInvoice).not.toHaveBeenCalled()
  })

  it('keeps failed billing edits and treats restored original values as pristine', async () => {
    mocks.listAccountsReceivableCustomers.mockResolvedValue([customer])
    mocks.updateBillingProfile.mockRejectedValue(new Error('Profile changed'))
    renderPanel(<FinanceOperationsPanel apiEnabled canBill canManageCash={false} canReconcile={false} record={{ kind: 'customer', id: customer.organizationId }} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit billing and tax' }))
    const name = screen.getByLabelText(/Billing contact name/)
    fireEvent.change(name, { target: { value: 'New Finance Contact' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Billing configuration was not updated')).toBeTruthy()
    expect(name).toHaveProperty('value', 'New Finance Contact')
    expect(screen.getByRole('button', { name: 'Approve current tax decision' })).toHaveProperty('disabled', true)
    fireEvent.change(name, { target: { value: customer.billingContactName } })
    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveProperty('disabled', true)
  })

  it('validates Finance approval notes instead of silently disabling the action', async () => {
    mocks.listAccountsReceivableCustomers.mockResolvedValue([customer])
    renderPanel(<FinanceOperationsPanel apiEnabled canBill canManageCash={false} canReconcile={false} record={{ kind: 'customer', id: customer.organizationId }} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit billing and tax' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve current tax decision' }))
    const notes = screen.getByLabelText(/Finance approval notes/)
    await waitFor(() => expect(notes.getAttribute('aria-invalid')).toBe('true'))
    expect(document.activeElement).toBe(notes)
    expect(mocks.approveTaxDecision).not.toHaveBeenCalled()
  })

  it('validates empty receipt imports and associates errors with their fields', async () => {
    router.search = { financeSection: 'imports' }
    mocks.listAccountsReceivableCustomers.mockResolvedValue([customer])
    renderPanel(<FinanceOperationsPanel apiEnabled canBill={false} canManageCash canReconcile={false} />)
    await screen.findByRole('option', { name: customer.organizationName })
    expect(screen.getByRole('button', { name: 'Preview import' })).toHaveProperty('disabled', false)
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }))
    const customerControl = screen.getByLabelText(/Customer/)
    await waitFor(() => expect(customerControl.getAttribute('aria-invalid')).toBe('true'))
    expect(document.activeElement).toBe(customerControl)
    expect(screen.getByLabelText(/CSV content/).getAttribute('aria-describedby')).toBe('import-csv-error')
    expect(mocks.previewPaymentImport).not.toHaveBeenCalled()
  })

  it('does not present a failed Finance list as an empty result', async () => {
    mocks.listInvoices.mockRejectedValue(new Error('Unavailable'))
    renderPanel(<FinanceOperationsPanel apiEnabled canBill canManageCash={false} canReconcile={false} />)
    expect(await screen.findByText('Finance information is unavailable')).toBeTruthy()
    expect(screen.queryByText('No invoices match this view.')).toBeNull()
  })

  it('requires another preview after changing the reviewed import input', async () => {
    await renderImport()
    mocks.previewPaymentImport.mockResolvedValue(importBatch)
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }))
    expect(await screen.findByRole('button', { name: 'Confirm 1 receipts' })).toBeTruthy()
    expect(mocks.confirmPaymentImport).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Change input' }))
    fireEvent.change(screen.getByLabelText(/CSV content/), { target: { value: 'replacement csv' } })
    expect(screen.queryByRole('button', { name: 'Confirm 1 receipts' })).toBeNull()
    expect(screen.getByLabelText(/CSV content/)).toHaveProperty('value', 'replacement csv')
    expect(mocks.confirmPaymentImport).not.toHaveBeenCalled()
  })

  it('ignores an in-flight preview response for input that has changed', async () => {
    let completePreview!: (value: PaymentImportBatch) => void
    mocks.previewPaymentImport.mockReturnValue(new Promise<PaymentImportBatch>(resolve => { completePreview = resolve }))
    await renderImport()
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }))
    await waitFor(() => expect(mocks.previewPaymentImport).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText(/Source/), { target: { value: 'Corrected source' } })
    await act(async () => { completePreview(importBatch) })

    expect(screen.queryByRole('button', { name: 'Confirm 1 receipts' })).toBeNull()
    expect(screen.getByLabelText(/Source/)).toHaveProperty('value', 'Corrected source')
    expect(screen.getByLabelText(/CSV content/)).toHaveProperty('value', 'original csv')
    expect(mocks.confirmPaymentImport).not.toHaveBeenCalled()
  })

  it('preserves the reviewed batch after confirmation fails so the same batch can be retried', async () => {
    mocks.previewPaymentImport.mockResolvedValue(importBatch)
    mocks.confirmPaymentImport.mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValue({ ...importBatch, status: 'Confirmed' })
    await renderImport()
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm 1 receipts' }))
    expect(await screen.findByText('Import was not completed')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm 1 receipts' }))
    await waitFor(() => expect(mocks.confirmPaymentImport).toHaveBeenCalledTimes(2))
    for (const call of mocks.confirmPaymentImport.mock.calls) expect(call.slice(0, 2)).toEqual([importBatch.id, importBatch.version])
    expect(mocks.previewPaymentImport).toHaveBeenCalledOnce()
    expect(await screen.findByText('Receipts imported. Open Receipts to allocate cash.')).toBeTruthy()
  })

})

function renderPanel(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  )
}

const customer: AccountsReceivableCustomer = {
  organizationId: 'customer-id', organizationName: 'Atlas Research', billingContactName: 'Ari Finance', billingContactEmail: 'ari@example.com',
  billingAddressJson: JSON.stringify({ line1: '1 Main St', line2: null, city: 'Seattle', region: 'WA', postalCode: '98101', countryCode: 'US' }),
  paymentTermsDays: 30, taxDecision: 'NonTaxable', approvedTaxRate: null, taxExemptionEvidence: null, financeApprovedByUserId: null,
  financeApprovedAtUtc: null, financeApprovalNotes: null, configurationVersion: 2, profileVersion: 4,
}
const batch = {
  id: 'batch-id', batchNumber: 'REC-20260829-ABC', periodEnd: '2026-08-29', ledgerReceiptTotal: 100, bankTotal: 100, difference: 0,
  status: 'Submitted', createdByUserId: 'cash-operator', submittedByUserId: 'cash-operator', approvedByUserId: null, closeoutReportJson: null, version: 2,
}
const invoice = {
  id: 'invoice-id', organizationId: customer.organizationId, labServiceOrderId: 'order-id', invoiceNumber: 'INV-100', status: 'Issued',
  issuedOn: '2026-09-01', dueOn: '2026-10-01', total: 100, appliedTotal: 0, balance: 100, version: 3,
}
const importBatch: PaymentImportBatch = {
  id: 'import-id', source: 'Bank', payloadSha256: 'a'.repeat(64), rowCount: 1, totalAmount: 100, status: 'Previewed',
  previewJson: JSON.stringify([{ externalId: 'EXT-1', payer: 'Atlas', receivedOn: '2026-09-01', amount: 100, reference: 'REF-1' }]),
  previewedByUserId: 'operator-id', previewedAtUtc: '2026-09-07T12:00:00Z', confirmedByUserId: null, confirmedAtUtc: null, version: 2,
}
async function renderImport() {
  router.search = { financeSection: 'imports' }
  mocks.listAccountsReceivableCustomers.mockResolvedValue([customer])
  renderPanel(<FinanceOperationsPanel apiEnabled canBill={false} canManageCash canReconcile={false} />)
  await screen.findByRole('option', { name: customer.organizationName })
  fireEvent.change(screen.getByLabelText(/Customer/), { target: { value: customer.organizationId } })
  fireEvent.change(screen.getByLabelText(/Source/), { target: { value: 'Bank' } })
  fireEvent.change(screen.getByLabelText(/CSV content/), { target: { value: 'original csv' } })
}
