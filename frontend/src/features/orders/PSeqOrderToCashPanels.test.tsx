import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  FinanceOperationsPanel,
  OperationalAttentionPanel,
  PSeqStagingPanel,
  ResultReleasePanel,
} from './PSeqOrderToCashPanels'

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
  reversePaymentReceipt: vi.fn(),
  submitReconciliation: vi.fn(),
  updateBillingProfile: vi.fn(),
}))

vi.mock('#/api/pseq-order-to-cash', () => mocks)

vi.mock('#/api/order-management', () => ({
  getOrderConfiguration: mocks.getOrderConfiguration,
  getOrderErrorMessage: (_error: unknown, fallback: string) => fallback,
}))

describe('PSeq order-to-cash panels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrderConfiguration.mockResolvedValue({ analyses: [] })
    mocks.listAccountsReceivableCustomers.mockResolvedValue([])
    mocks.listInvoices.mockResolvedValue([])
    mocks.getAgingSummary.mockResolvedValue({ current: 0, days1To30: 0, days31To60: 0, days61To90: 0, over90: 0, organizations: [] })
    mocks.listPaymentReceipts.mockResolvedValue([])
    mocks.listReconciliations.mockResolvedValue([])
  })

  it('shows incomplete Customers and their staging blockers instead of hiding them', async () => {
    mocks.listStageEligibleCustomers.mockResolvedValue([
      {
        organizationId: 'blocked-customer',
        organizationName: 'Blocked Customer',
        readiness: 'NeedsSetup',
        canStageOrder: false,
        canIssueQuote: false,
        blockers: [
          {
            code: 'PSeqServiceEntitlementNotReady',
            label: 'PSeq service entitlement',
            nextAction: 'Mark service configuration Ready.',
          },
        ],
      },
    ])

    renderPanel(<PSeqStagingPanel apiEnabled />)

    const customer = await screen.findByRole('option', {
      name: 'Blocked Customer — NeedsSetup',
    })
    fireEvent.change(screen.getByLabelText('Customer'), {
      target: { value: customer.getAttribute('value') },
    })

    expect(screen.getByText('Internal staging blocked')).toBeTruthy()
    expect(screen.getByText(/Mark service configuration Ready/)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Create staged order' }),
    ).toHaveProperty('disabled', true)
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

  it('offers sample-level release without presenting a payment gate', async () => {
    mocks.listResultPackages.mockResolvedValue([
      {
        id: 'package-id',
        organizationId: 'customer-id',
        labServiceOrderId: 'order-id',
        labWorkOrderId: 'work-id',
        labSampleId: 'sample-id',
        packageVersion: 2,
        correctsPackageId: 'old-package-id',
        state: 'ScientificallyApproved',
        pipelineProviderKey: 'pipeline',
        pipelineSubmissionId: 'submission',
        manifestSha256: 'a'.repeat(64),
        expectedArtifactCount: 1,
        scientificApprovalId: 'approval-id',
        releasedAtUtc: null,
        failureCode: null,
        failureDetail: null,
        retentionState: null,
        version: 3,
        artifacts: [
          {
            id: 'artifact-id',
            logicalRole: 'report',
            fileName: 'result.pdf',
            contentType: 'application/pdf',
            sizeBytes: 10,
            sha256: 'b'.repeat(64),
            scanState: 'Clean',
            scanCompletedAtUtc: '2026-08-29T00:00:00Z',
            deletedAtUtc: null,
          },
        ],
      },
    ])

    renderPanel(<ResultReleasePanel apiEnabled />)

    expect(
      await screen.findByRole('button', { name: 'Release to Customer' }),
    ).toBeTruthy()
    expect(screen.getByText(/balance and credit status never gate release/i)).toBeTruthy()
    expect(screen.queryByText(/payment required/i)).toBeNull()
  })

  it('lets a Billing Operator configure and approve PSeq billing without platform configuration access', async () => {
    mocks.listAccountsReceivableCustomers.mockResolvedValue([
      {
        organizationId: 'customer-id',
        organizationName: 'Atlas Research',
        billingContactName: 'Ari Finance',
        billingContactEmail: 'ari@example.com',
        billingAddressJson: JSON.stringify({ line1: '1 Main St', line2: null, city: 'Seattle', region: 'WA', postalCode: '98101', countryCode: 'US' }),
        paymentTermsDays: 30,
        taxDecision: 'NonTaxable',
        approvedTaxRate: null,
        taxExemptionEvidence: null,
        financeApprovedByUserId: null,
        financeApprovedAtUtc: null,
        financeApprovalNotes: null,
        configurationVersion: 2,
        profileVersion: 4,
      },
    ])

    renderPanel(<FinanceOperationsPanel apiEnabled canBill canManageCash={false} canReconcile={false} />)

    await screen.findByRole('option', { name: 'Atlas Research' })
    fireEvent.change(screen.getByRole('combobox', { name: /Customer/ }), { target: { value: 'customer-id' } })
    expect(screen.getByDisplayValue('Ari Finance')).toBeTruthy()
    expect(screen.getByText('Finance approval required')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save billing configuration' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Approve current tax decision' })).toHaveProperty('disabled', true)
  })

  it('shows a Cash Reconciler submitted batches without Cash Operator controls', async () => {
    mocks.listReconciliations.mockResolvedValue([
      {
        id: 'batch-id',
        batchNumber: 'REC-20260829-ABC',
        periodEnd: '2026-08-29',
        ledgerReceiptTotal: 100,
        bankTotal: 100,
        difference: 0,
        status: 'Submitted',
        createdByUserId: 'cash-operator',
        submittedByUserId: 'cash-operator',
        approvedByUserId: null,
        closeoutReportJson: null,
        version: 2,
      },
    ])

    renderPanel(<FinanceOperationsPanel apiEnabled canBill={false} canManageCash={false} canReconcile />)

    expect(await screen.findByText(/REC-20260829-ABC/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Approve independently' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create reconciliation batch' })).toBeNull()
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
