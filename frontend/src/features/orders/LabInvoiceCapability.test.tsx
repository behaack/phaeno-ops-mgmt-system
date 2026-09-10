import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { LabServiceDetailPage } from './LabServiceDetailPage'
import { bundleIds, bundleLabDraft } from '#/test-helpers/bundled-orders'

const mocks = vi.hoisted(() => ({ mayReadInvoices: false, invoices: vi.fn(), get: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="#job">{children}</a>, useNavigate: () => vi.fn(), useBlocker: vi.fn() }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canViewLabServiceOrders: true, canViewLabServiceInvoices: mocks.mayReadInvoices }, selectedOrganization: { organizationId: bundleIds.organization }, selectedDepartment: { departmentId: bundleIds.department } } }) }))
vi.mock('#/api/order-management', async original => ({ ...await original<typeof import('#/api/order-management')>(), getLabOrder: mocks.get }))
vi.mock('#/api/pseq-order-to-cash', async original => ({ ...await original<typeof import('#/api/pseq-order-to-cash')>(), listCustomerInvoices: mocks.invoices, listCustomerResultPackages: async () => [] }))
vi.mock('./StandardLabServicePanel', () => ({ StandardLabServicePanel: () => null }))
vi.mock('./LabServiceTimingPanel', () => ({ LabServiceTimingPanel: () => null }))
vi.mock('./LabJobSamplesPanel', () => ({ LabJobSamplesPanel: () => null }))
beforeEach(() => { vi.clearAllMocks(); mocks.mayReadInvoices = false; mocks.get.mockResolvedValue({ ...bundleLabDraft, canEdit: false, canSubmit: false, canWithdraw: false }); mocks.invoices.mockResolvedValue([]) })
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // A cached invoice must not be displayed if a refreshed session loses permission.
  client.setQueryData(['customer-invoices', bundleIds.organization, bundleIds.department], [{ id: bundleIds.catalog, labServiceOrderId: bundleIds.order, invoiceNumber: 'TRAINING-INVOICE', balance: 100, currency: 'USD', dueOn: '2026-10-07', status: 'Issued' }])
  render(<QueryClientProvider client={client}><LabServiceDetailPage orderId={bundleIds.order} /></QueryClientProvider>)
}
it('keeps Lab work available without fetching or displaying native invoices when the separate capability is absent', async () => {
  show()
  await screen.findByRole('heading', { name: bundleLabDraft.orderNumber })
  expect(mocks.invoices).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Download invoice PDF' })).toBeNull()
  expect(screen.queryByText(/TRAINING-INVOICE/)).toBeNull()
  expect(screen.queryByText('Invoice could not be loaded')).toBeNull()
  expect(screen.getByText('Contact Phaeno for billing records.')).toBeTruthy()
})
it('loads current native invoices when the server explicitly permits them', async () => {
  mocks.mayReadInvoices = true
  show()
  await waitFor(() => expect(mocks.invoices).toHaveBeenCalledTimes(1))
  await screen.findByText('No POMS invoice has been issued for this order.')
  expect(screen.queryByText('Contact Phaeno for billing records.')).toBeNull()
})
