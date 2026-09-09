import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataAssemblyDetailPage } from './DataAssemblyDetailPage'
import { LabServiceDetailPage } from './LabServiceDetailPage'
import { ReagentOrderDetailPage } from './ReagentOrderDetailPage'

const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), blocker: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#orders">{children}</a>,
  useNavigate: () => vi.fn(), useBlocker: mocks.blocker,
}))
vi.mock('#/features/auth/session-context', () => ({
  usePhaenoSession: () => ({ authProvider: 'clerk', session: {
    capabilities: { canViewLabServiceOrders: true, canViewDataAssemblyRequests: true, canViewReagentOrders: true },
    selectedDepartment: { purchaseOrderRequired: true },
  } }),
}))
vi.mock('#/api/order-management', async importOriginal => ({
  ...await importOriginal<typeof import('#/api/order-management')>(),
  getLabOrder: mocks.read, getAssemblyRequest: mocks.read, getReagentOrder: mocks.read,
  acceptLabQuote: mocks.save, acceptAssemblyQuote: mocks.save,
  requestLabCancellation: mocks.save, requestAssemblyCancellation: mocks.save, requestReagentCancellation: mocks.save,
  withdrawLabOrder: mocks.save, withdrawAssemblyRequest: mocks.save, cancelReagentOrder: mocks.save,
}))
vi.mock('#/api/pseq-order-to-cash', () => ({
  listCustomerInvoices: async () => [], listCustomerResultPackages: async () => [],
  downloadCustomerInvoicePdf: vi.fn(), downloadCustomerResultArtifact: vi.fn(),
}))
// Bundle panels have independent draft guards, covered in BundledOrders.
vi.mock('./StandardLabServicePanel', () => ({ StandardLabServicePanel: () => null }))
vi.mock('./LabServiceTimingPanel', () => ({ LabServiceTimingPanel: () => null }))
vi.mock('./KitAssemblyCasesPanel', () => ({ KitAssemblyCasesPanel: () => null }))
vi.mock('./RequestCustomWorkButton', () => ({ RequestCustomWorkButton: () => null }))
vi.mock('./LabJobSamplesPanel', () => ({ LabJobSamplesPanel: () => null }))
vi.mock('./LabManagedResultReleases', () => ({ LabManagedResultReleases: () => null }))
vi.mock('./GovernedResultPackagePanel', () => ({ GovernedResultPackagePanel: () => null }))
vi.mock('./ReleasedDeliverableRetentionNotice', () => ({ ReleasedDeliverableRetentionNotice: () => null }))

const record = {
  id: 'order-1', version: 3, orderNumber: 'ORDER-1', requestNumber: 'ASSEMBLY-1', projectReference: 'Assembly project',
  status: 'Quoted', updatedAt: '2026-09-07T12:00:00Z', metadataJson: '{}', shippingAddressSnapshotJson: null,
  canAcceptQuote: true, canRequestCancellation: true, canWithdraw: true,
  samples: [], resultFiles: [], resultReleases: [], inputRevisions: [], inputFiles: [], outputReleases: [],
  lines: [], timeline: [], documents: [], adjustments: [], shipments: [],
  quotes: [{ id: 'quote-1', revision: 1, status: 'Issued', expiresAt: '2026-10-07T12:00:00Z',
    linesJson: '[]', currency: 'USD', subtotal: 50, tax: 0, total: 50 }],
}
const cases = [
  { name: 'Customer Lab services', page: <LabServiceDetailPage orderId={record.id} />, field: /Reason/, open: 'Request cancellation', keep: 'Keep order', save: 'Request cancellation' },
  { name: 'Partner Data assembly', page: <DataAssemblyDetailPage requestId={record.id} />, field: /Reason/, open: 'Request cancellation', keep: 'Keep request', save: 'Request cancellation' },
  { name: 'Partner Reagent orders', page: <ReagentOrderDetailPage orderId={record.id} />, field: /Reason/, open: 'Request cancellation', keep: 'Keep order', save: 'Request cancellation' },
  { name: 'Customer quote acceptance', page: <LabServiceDetailPage orderId={record.id} />, field: /Purchase order number/, open: 'Accept quote', keep: 'Keep reviewing', save: 'Accept quote and place order' },
  { name: 'Partner quote acceptance', page: <DataAssemblyDetailPage requestId={record.id} />, field: /Purchase order number/, open: 'Accept quote', keep: 'Keep reviewing', save: 'Accept quote and queue work' },
]

describe.each(cases)('$name decision dialog', ({ page, field, open, keep, save }) => {
  beforeEach(() => { vi.clearAllMocks(); mocks.read.mockResolvedValue(record); mocks.save.mockReset() })
  afterEach(() => { vi.restoreAllMocks() })

  async function openDialog() {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{page}</QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: open }))
    return screen.getByRole('dialog')
  }

  it('retains edited entries after declined Close, footer, Escape and navigation, and resets after a confirmed discard', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const dialog = await openDialog()
    expect(within(dialog).getByRole('button', { name: save }).matches(':disabled')).toBe(true)
    fireEvent.change(within(dialog).getByLabelText(field), { target: { value: 'Keep this entry' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    fireEvent.click(within(dialog).getByRole('button', { name: keep }))
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(within(dialog).getByLabelText(field)).toHaveProperty('value', 'Keep this entry')
    expect(mocks.blocker.mock.lastCall![0].shouldBlockFn()).toBe(true)
    expect(mocks.blocker.mock.lastCall![0].enableBeforeUnload()).toBe(true)
    expect(confirm).toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(within(dialog).getByRole('button', { name: keep }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: open }))
    expect(within(screen.getByRole('dialog')).getByLabelText(field)).toHaveProperty('value', '')
    expect(mocks.blocker.mock.lastCall![0].enableBeforeUnload()).toBe(false)
  })

  it('blocks repeat submission, editing and dismissal while pending, retains a failed draft, and closes after a successful retry', async () => {
    let rejectSave!: (error: Error) => void
    mocks.save.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject }))
    const dialog = await openDialog()
    const input = within(dialog).getByLabelText(field)
    fireEvent.change(input, { target: { value: 'Reviewed entry' } })
    fireEvent.click(within(dialog).getByRole('button', { name: save }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
    expect(input.matches(':disabled')).toBe(true)
    expect(within(dialog).getByRole('button', { name: keep }).matches(':disabled')).toBe(true)
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull()
    expect(within(dialog).getAllByRole('button').every(button => button.matches(':disabled'))).toBe(true)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(mocks.blocker.mock.lastCall![0].shouldBlockFn()).toBe(true)
    expect(mocks.blocker.mock.lastCall![0].enableBeforeUnload()).toBe(true)
    expect(mocks.save).toHaveBeenCalledOnce()
    await act(async () => rejectSave(new Error('The request failed.')))
    await within(dialog).findByRole('alert')
    expect(input).toHaveProperty('value', 'Reviewed entry')
    expect(input.matches(':disabled')).toBe(false)
    mocks.save.mockResolvedValueOnce(record)
    fireEvent.click(within(dialog).getByRole('button', { name: save }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(mocks.save).toHaveBeenCalledTimes(2)
    expect(mocks.blocker.mock.lastCall![0].enableBeforeUnload()).toBe(false)
  })
})
