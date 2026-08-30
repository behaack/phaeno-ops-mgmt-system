import { api } from './client'

export type OrderToCashFeatureFlags = {
  invitationDelivery: boolean
  derivedReadiness: boolean
  businessRoles: boolean
  governedPSeqResults: boolean
  nativePSeqAccountsReceivable: boolean
  attentionOperations: boolean
}

export type OperationalReadinessBlocker = {
  code: string
  label: string
  nextAction: string
  blocksStaging: boolean
  blocksQuoteOrCommitment: boolean
}

export type OperationalReadiness = {
  organizationId: string
  status: 'NeedsSetup' | 'Ready' | 'Blocked'
  canStageOrder: boolean
  canIssueQuoteOrCommit: boolean
  blockers: OperationalReadinessBlocker[]
  legacyInformationalStatus: string
  manualBlockNote: string | null
}

export type AttentionItem = {
  id: string
  category: string
  sourceType: string
  sourceId: string
  organizationId: string | null
  ownerRole: string
  status: 'Open' | 'InProgress' | 'Resolved'
  attemptCount: number
  nextAction: string
  lastError: string | null
  firstObservedAtUtc: string
  ageHours: number
  resolution: string | null
  version: number
}

export type Invoice = {
  id: string
  organizationId: string
  labServiceOrderId: string
  invoiceNumber: string
  status: 'Issued' | 'PartiallyPaid' | 'Paid' | 'Voided' | 'WrittenOff'
  subtotal: number
  tax: number
  adjustmentTotal: number
  total: number
  balance: number
  currency: string
  issuedAtUtc: string
  dueAtUtc: string
  closedAtUtc: string | null
  version: number
}

export type PaymentReceipt = {
  id: string
  organizationId: string
  receiptNumber: string
  payer: string
  amount: number
  unappliedAmount: number
  currency: string
  receivedAtUtc: string
  method: string
  bankReference: string
  externalId: string
  status: 'Unapplied' | 'PartiallyApplied' | 'Applied' | 'Reversed'
  version: number
}

export type AgingInvoice = {
  id: string
  organizationId: string
  invoiceNumber: string
  dueAtUtc: string
  balance: number
  currency: string
  daysPastDue: number
  bucket: string
}

export type ResultArtifact = {
  id: string
  artifactIdentity: string
  fileName: string
  mediaType: string
  sizeBytes: number
  sha256: string
  scanStatus: 'Pending' | 'Clean' | 'Infected' | 'Failed'
  scanDetails: string | null
}

export type ResultPackage = {
  id: string
  organizationId: string
  labServiceOrderId: string
  labWorkOrderId: string
  labSampleId: string | null
  packageVersion: number
  correctsPackageId: string | null
  pipelineName: string
  pipelineVersion: string
  manifestIdentity: string
  manifestSha256: string
  status:
    | 'Uploading'
    | 'Scanning'
    | 'ReadyForReview'
    | 'ScientificallyApproved'
    | 'ReadyForRelease'
    | 'Released'
    | 'Failed'
    | 'Withdrawn'
  failureReason: string | null
  scientificApprovalId: string | null
  scientificallyApprovedAtUtc: string | null
  releasedAtUtc: string | null
  withdrawnAtUtc: string | null
  withdrawalReason: string | null
  createdAt: string
  version: number
  artifacts: ResultArtifact[]
}

export async function getOrderToCashFeatures() {
  return (await api.get<OrderToCashFeatureFlags>('/order-to-cash/features')).data
}

export async function getOperationalReadiness(organizationId: string) {
  return (
    await api.get<OperationalReadiness>(
      `/order-to-cash/readiness/${organizationId}`,
    )
  ).data
}

export async function listAttentionItems(includeResolved = false) {
  return (
    await api.get<AttentionItem[]>('/order-to-cash/attention', {
      params: { includeResolved },
    })
  ).data
}

export async function listInvoices(organizationId?: string | null) {
  return (
    await api.get<Invoice[]>('/order-to-cash/ar/invoices', {
      params: { organizationId: organizationId || undefined },
    })
  ).data
}

export async function listPaymentReceipts(organizationId?: string | null) {
  return (
    await api.get<PaymentReceipt[]>('/order-to-cash/ar/receipts', {
      params: { organizationId: organizationId || undefined },
    })
  ).data
}

export async function listAgingInvoices() {
  return (await api.get<AgingInvoice[]>('/order-to-cash/ar/reports/aging')).data
}

export async function recordPaymentReceipt(input: {
  organizationId: string
  payer: string
  amount: number
  currency: 'USD'
  receivedAtUtc: string
  method: string
  bankReference: string
  evidenceReference: string | null
  externalId: string
  memo: string | null
}) {
  return (await api.post<PaymentReceipt>('/order-to-cash/ar/receipts', input)).data
}

export async function allocatePayment(input: {
  paymentReceiptId: string
  invoiceId: string
  amount: number
}) {
  await api.post('/order-to-cash/ar/allocations', input)
}

export async function listResultPackages(organizationId?: string | null) {
  return (
    await api.get<ResultPackage[]>('/order-to-cash/results/packages', {
      params: { organizationId: organizationId || undefined },
    })
  ).data
}

export async function releaseResultPackage(id: string, version: number) {
  return (
    await api.post<ResultPackage>(`/order-to-cash/results/packages/${id}/release`, {
      version,
      reason: 'Authorized customer publication.',
    })
  ).data
}

export async function downloadInvoiceDocument(id: string) {
  const response = await api.get<Blob>(
    `/order-to-cash/ar/invoices/${id}/document`,
    { responseType: 'blob' },
  )
  return response.data
}
