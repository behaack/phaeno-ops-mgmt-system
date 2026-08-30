import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OrderToCashPage } from './OrderToCashPage'

const mocks = vi.hoisted(() => ({
  getFeatures: vi.fn(),
  listAging: vi.fn(),
  listAttention: vi.fn(),
  listInvoices: vi.fn(),
  listReceipts: vi.fn(),
  listResults: vi.fn(),
  membership: {
    organizationId: 'phaeno-organization',
    organizationKind: 'Phaeno',
  },
}))

vi.mock('#/api/order-to-cash', () => ({
  allocatePayment: vi.fn(),
  downloadInvoiceDocument: vi.fn(),
  getOrderToCashFeatures: mocks.getFeatures,
  listAgingInvoices: mocks.listAging,
  listAttentionItems: mocks.listAttention,
  listInvoices: mocks.listInvoices,
  listPaymentReceipts: mocks.listReceipts,
  listResultPackages: mocks.listResults,
  recordPaymentReceipt: vi.fn(),
  releaseResultPackage: vi.fn(),
}))

vi.mock('#/features/auth/session-context', () => ({
  getSelectedMembership: () => mocks.membership,
  usePhaenoSession: () => ({
    selectedOrganizationId: mocks.membership.organizationId,
    session: {
      capabilities: {
        canOperateBilling: true,
        canOperateCash: true,
        canReleasePSeqResults: true,
      },
    },
  }),
}))

describe('OrderToCashPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.membership.organizationId = 'phaeno-organization'
    mocks.membership.organizationKind = 'Phaeno'
    mocks.listAging.mockResolvedValue([])
    mocks.listAttention.mockResolvedValue([])
    mocks.listInvoices.mockResolvedValue([])
    mocks.listReceipts.mockResolvedValue([])
    mocks.listResults.mockResolvedValue([])
  })

  it('explains that installed slices remain disabled when every flag is off', async () => {
    mocks.getFeatures.mockResolvedValue(flags())

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Order-to-cash is not enabled' }),
    ).toBeTruthy()
    expect(mocks.listInvoices).not.toHaveBeenCalled()
    expect(mocks.listResults).not.toHaveBeenCalled()
  })

  it('shows a failure instead of misreporting unavailable feature data as disabled', async () => {
    mocks.getFeatures.mockRejectedValue(new Error('feature lookup failed'))

    renderPage()

    expect(
      await screen.findByText('Order-to-cash availability could not be checked'),
    ).toBeTruthy()
    expect(screen.queryByText('Order-to-cash is not enabled')).toBeNull()
  })

  it('renders explicit empty states for enabled Phaeno operations', async () => {
    mocks.getFeatures.mockResolvedValue(
      flags({
        attentionOperations: true,
        governedPSeqResults: true,
        nativePSeqAccountsReceivable: true,
      }),
    )

    renderPage()

    expect(await screen.findByText('No owned attention items are open.')).toBeTruthy()
    expect(screen.getByText('No governed result packages are available.')).toBeTruthy()
    expect(screen.getByText('No PSeq invoices are available.')).toBeTruthy()
    expect(screen.getByText('No receipts recorded.')).toBeTruthy()
    expect(screen.getByText('No open invoice balances are aging.')).toBeTruthy()
  })
})

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={client}>
      <OrderToCashPage />
    </QueryClientProvider>,
  )
}

function flags(
  overrides: Partial<{
    invitationDelivery: boolean
    derivedReadiness: boolean
    businessRoles: boolean
    governedPSeqResults: boolean
    nativePSeqAccountsReceivable: boolean
    attentionOperations: boolean
  }> = {},
) {
  return {
    invitationDelivery: false,
    derivedReadiness: false,
    businessRoles: false,
    governedPSeqResults: false,
    nativePSeqAccountsReceivable: false,
    attentionOperations: false,
    ...overrides,
  }
}
