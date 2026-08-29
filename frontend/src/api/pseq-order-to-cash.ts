import { api } from './client'
import type { LabSampleWrite, LabServiceOrder } from './order-management'

export type ReadinessBlocker = {
  code: string
  label: string
  nextAction: string
}

export type StageEligibleCustomer = {
  organizationId: string
  organizationName: string
  readiness: 'NeedsSetup' | 'Ready' | 'Blocked'
  canStageOrder: boolean
  canIssueQuote: boolean
  blockers: ReadinessBlocker[]
}

export type OperationalAttention = {
  id: string
  category: string
  organizationId: string | null
  sourceType: string
  sourceId: string
  status: string
  ownerUserId: string | null
  attemptCount: number
  summary: string
  nextAction: string
  resolution: string | null
  createdAt: string
  ageDays: number
  version: number
}

export type ResultArtifact = {
  id: string
  logicalRole: string
  fileName: string
  contentType: string
  sizeBytes: number
  sha256: string
  scanState: string
  scanCompletedAtUtc: string | null
  deletedAtUtc: string | null
}

export type ResultPackage = {
  id: string
  organizationId: string
  labServiceOrderId: string
  labWorkOrderId: string
  labSampleId: string
  packageVersion: number
  correctsPackageId: string | null
  state: string
  pipelineProviderKey: string
  pipelineSubmissionId: string
  manifestSha256: string
  expectedArtifactCount: number
  scientificApprovalId: string | null
  releasedAtUtc: string | null
  failureCode: string | null
  failureDetail: string | null
  retentionState: string | null
  version: number
  artifacts: ResultArtifact[]
}

export type CustomerResultPackage = {
  id: string
  labSampleId: string
  packageVersion: number
  state: string
  releasedAtUtc: string | null
  retentionState: string | null
  isDownloadAvailable: boolean
  artifacts: Array<{
    id: string
    logicalRole: string
    fileName: string
    contentType: string
    sizeBytes: number
    sha256: string
    deletedAtUtc: string | null
  }>
}

export type InvoiceReceivable = {
  id: string
  organizationId: string
  labServiceOrderId: string
  invoiceNumber: string
  status: string
  issuedOn: string
  dueOn: string
  daysPastDue: number
  subtotal: number
  taxTotal: number
  adjustmentTotal: number
  total: number
  appliedTotal: number
  balance: number
  currency: string
  version: number
}

export type PaymentReceipt = {
  id: string
  organizationId: string
  receiptNumber: string
  source: string
  externalId: string
  payer: string
  amount: number
  appliedAmount: number
  unappliedAmount: number
  currency: string
  receivedOn: string
  method: string
  bankReference: string
  status: string
  version: number
}

export type AgingSummary = {
  asOf: string
  current: number
  days1To30: number
  days31To60: number
  days61To90: number
  over90: number
  organizations: Array<{
    organizationId: string
    balance: number
    oldestDueOn: string
  }>
}

export type AccountsReceivableCustomer = {
  organizationId: string
  organizationName: string
  billingContactName: string | null
  billingContactEmail: string | null
  billingAddressJson: string | null
  paymentTermsDays: number
  taxDecision: 'Taxable' | 'Exempt' | 'NonTaxable' | null
  approvedTaxRate: number | null
  taxExemptionEvidence: string | null
  financeApprovedByUserId: string | null
  financeApprovedAtUtc: string | null
  financeApprovalNotes: string | null
  configurationVersion: number
  profileVersion: number | null
}

export type PaymentImportBatch = {
  id: string
  source: string
  payloadSha256: string
  rowCount: number
  totalAmount: number
  status: string
  previewJson: string
  previewedByUserId: string
  previewedAtUtc: string
  confirmedByUserId: string | null
  confirmedAtUtc: string | null
  version: number
}

export type ReconciliationBatch = {
  id: string
  batchNumber: string
  periodEnd: string
  ledgerReceiptTotal: number
  bankTotal: number
  difference: number
  status: string
  createdByUserId: string
  submittedByUserId: string | null
  approvedByUserId: string | null
  closeoutReportJson: string | null
  version: number
}

export async function listStageEligibleCustomers() {
  return (
    await api.get<StageEligibleCustomer[]>('/platform/pseq-staging/customers')
  ).data
}

export async function createStagedPSeqOrder(input: {
  organizationId: string
  customerReference?: string | null
  samples: LabSampleWrite[]
}) {
  return (await api.post<LabServiceOrder>('/platform/pseq-staging/orders', input))
    .data
}

export async function listOperationalAttention(category?: string) {
  return (
    await api.get<OperationalAttention[]>('/platform/operational-attention', {
      params: { category: category || undefined },
    })
  ).data
}

export async function assignOperationalAttention(
  id: string,
  ownerUserId: string | null,
  version: number,
) {
  return (
    await api.post<OperationalAttention>(
      `/platform/operational-attention/${id}/assign`,
      { ownerUserId, version },
    )
  ).data
}

export async function resolveOperationalAttention(
  id: string,
  resolution: string,
  version: number,
) {
  return (
    await api.post<OperationalAttention>(
      `/platform/operational-attention/${id}/resolve`,
      { resolution, version },
    )
  ).data
}

export async function listResultPackages(state?: string) {
  return (
    await api.get<ResultPackage[]>('/platform/pseq-result-packages', {
      params: { state: state || undefined },
    })
  ).data
}

export async function releaseResultPackage(id: string, version: number) {
  return (
    await api.post<ResultPackage>(`/platform/pseq-result-packages/${id}/release`, {
      version,
    })
  ).data
}

export async function withdrawResultPackage(
  id: string,
  version: number,
  reason: string,
) {
  return (
    await api.post<ResultPackage>(
      `/platform/pseq-result-packages/${id}/withdraw`,
      { version, reason },
    )
  ).data
}

export async function authorizeResultReissue(
  id: string,
  version: number,
  reason: string,
) {
  return (
    await api.post<ResultPackage>(
      `/platform/pseq-result-packages/${id}/authorize-reissue`,
      { version, reason },
    )
  ).data
}

export async function listCustomerResultPackages(orderId: string) {
  return (
    await api.get<CustomerResultPackage[]>(
      `/lab-service-orders/${orderId}/result-packages`,
    )
  ).data
}

export async function downloadCustomerResultArtifact(
  orderId: string,
  resultPackage: CustomerResultPackage,
  artifact: CustomerResultPackage['artifacts'][number],
) {
  const response = await api.get<Blob>(
    `/lab-service-orders/${orderId}/samples/${resultPackage.labSampleId}/result-packages/${resultPackage.id}/artifacts/${artifact.id}/download`,
    { responseType: 'blob' },
  )
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = artifact.fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function listInvoices(openOnly = false) {
  return (
    await api.get<InvoiceReceivable[]>('/platform/accounts-receivable/invoices', {
      params: { openOnly },
    })
  ).data
}

export async function listAccountsReceivableCustomers() {
  return (
    await api.get<AccountsReceivableCustomer[]>(
      '/platform/accounts-receivable/customers',
    )
  ).data
}

export async function updateBillingProfile(
  organizationId: string,
  input: {
    version: number
    billingContactName: string
    billingContactEmail: string
    billingAddressJson: string
    paymentTermsDays: number
    taxDecision: 'Taxable' | 'Exempt' | 'NonTaxable'
    approvedTaxRate: number | null
    taxExemptionEvidence: string | null
  },
) {
  return (
    await api.put(
      `/platform/order-configuration/commercial-profiles/${organizationId}/billing`,
      input,
    )
  ).data
}

export async function approveTaxDecision(
  organizationId: string,
  version: number,
  notes: string,
) {
  return (
    await api.post(
      `/platform/order-configuration/commercial-profiles/${organizationId}/tax-approval`,
      { version, notes },
    )
  ).data
}

export async function listCustomerInvoices() {
  return (await api.get<InvoiceReceivable[]>('/accounts-receivable/invoices')).data
}

export async function downloadCustomerInvoicePdf(invoice: InvoiceReceivable) {
  const response = await api.get<Blob>(
    `/accounts-receivable/invoices/${invoice.id}/pdf`,
    { responseType: 'blob' },
  )
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = `${invoice.invoiceNumber}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}

export async function getAgingSummary() {
  return (
    await api.get<AgingSummary>('/platform/accounts-receivable/aging')
  ).data
}

export async function listPaymentReceipts(unappliedOnly = false) {
  return (
    await api.get<PaymentReceipt[]>('/platform/accounts-receivable/receipts', {
      params: { unappliedOnly },
    })
  ).data
}

export async function recordPaymentReceipt(input: {
  organizationId: string
  externalId: string
  payer: string
  amount: number
  currency: 'USD'
  receivedOn: string
  method: string
  bankReference: string
  evidenceStorageKey: string
  memo?: string | null
}) {
  return (
    await api.post<PaymentReceipt>('/platform/accounts-receivable/receipts', input)
  ).data
}

export async function listMatchingInvoices(receiptId: string) {
  return (
    await api.get<InvoiceReceivable[]>(
      `/platform/accounts-receivable/receipts/${receiptId}/matching-suggestions`,
    )
  ).data
}

export async function allocatePayment(
  receiptId: string,
  input: {
    invoiceId: string
    amount: number
    receiptVersion: number
    invoiceVersion: number
  },
) {
  return (
    await api.post(
      `/platform/accounts-receivable/receipts/${receiptId}/allocations`,
      input,
    )
  ).data
}

export async function adjustInvoice(
  invoiceId: string,
  input: { kind: 'Credit' | 'Debit' | 'WriteOff'; amount: number; reason: string; invoiceVersion: number },
) {
  return (
    await api.post<InvoiceReceivable>(
      `/platform/accounts-receivable/invoices/${invoiceId}/adjustments`,
      input,
    )
  ).data
}

export async function reversePaymentReceipt(
  receiptId: string,
  version: number,
  reason: string,
) {
  return (
    await api.post<PaymentReceipt>(
      `/platform/accounts-receivable/receipts/${receiptId}/reverse`,
      { version, reason },
    )
  ).data
}

export async function exportAccountsReceivableReport(
  report: 'invoices' | 'aging' | 'receipts' | 'unapplied-cash' | 'reconciliations',
) {
  const response = await api.get<Blob>('/platform/accounts-receivable/export', {
    params: { report },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = `pseq-ar-${report}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export async function previewPaymentImport(input: {
  organizationId: string
  source: string
  csvText: string
}) {
  return (
    await api.post<PaymentImportBatch>(
      '/platform/accounts-receivable/imports/preview',
      input,
    )
  ).data
}

export async function confirmPaymentImport(id: string, version: number) {
  return (
    await api.post<PaymentImportBatch>(
      `/platform/accounts-receivable/imports/${id}/confirm`,
      { version },
    )
  ).data
}

export async function listReconciliations() {
  return (
    await api.get<ReconciliationBatch[]>(
      '/platform/accounts-receivable/reconciliations',
    )
  ).data
}

export async function createReconciliation(input: {
  periodEnd: string
  bankTotal: number
  paymentReceiptIds: string[]
  paymentAllocationIds: string[]
  invoiceAdjustmentIds: string[]
}) {
  return (
    await api.post<ReconciliationBatch>(
      '/platform/accounts-receivable/reconciliations',
      input,
    )
  ).data
}

export async function submitReconciliation(id: string, version: number) {
  return (
    await api.post<ReconciliationBatch>(
      `/platform/accounts-receivable/reconciliations/${id}/submit`,
      { version },
    )
  ).data
}

export async function approveReconciliation(id: string, version: number) {
  return (
    await api.post<ReconciliationBatch>(
      `/platform/accounts-receivable/reconciliations/${id}/approve`,
      { version },
    )
  ).data
}
