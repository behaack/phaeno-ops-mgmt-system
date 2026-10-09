import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataAssemblyDetailPage } from './DataAssemblyDetailPage'
import { LabServiceDetailPage } from './LabServiceDetailPage'
import { ReagentOrderDetailPage } from './ReagentOrderDetailPage'

const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), blocker: vi.fn() }))
vi.mock('#/api/customer-delivery-locations', () => ({
  getCustomerDeliveryLocations: async () => [{ id: '10000000-0000-4000-8000-000000000011', label: 'Training receiving', recipient: 'Training lab', line1: '1 Test Way', line2: null, city: 'Baltimore', region: 'MD', postalCode: '21201', countryCode: 'US', isActive: true, isDefault: true, version: 1 }],
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#orders">{children}</a>,
  useNavigate: () => vi.fn(), useBlocker: mocks.blocker,
}))
vi.mock('#/features/auth/session-context', () => ({
  usePhaenoSession: () => ({ authProvider: 'clerk', session: {
    capabilities: { canViewLabServiceOrders: true, canViewDataAssemblyRequests: true, canViewReagentOrders: true },
    selectedDepartment: { departmentId: 'department-1', purchaseOrderRequired: true },
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
  id: 'order-1', organizationId: 'customer-1', version: 3, orderNumber: 'ORDER-1', requestNumber: 'ASSEMBLY-1', projectReference: 'Assembly project',
  status: 'QuoteIssued', updatedAt: '2026-09-07T12:00:00Z', metadataJson: '{}', shippingAddressSnapshotJson: null,
  canAcceptQuote: true, canRequestCancellation: true, canWithdraw: true,
  sampleTypeDefinitionId: '10000000-0000-4000-8000-000000000012', sampleTypeName: 'Training RNA',
  requestedSpecimenCount: 7, sourceGroups: [{ id: 'source-1', biologicalSource: 'Human PBMCs', specimenCount: 7, version: 1 }],
  samples: [], resultFiles: [], resultReleases: [], inputRevisions: [], inputFiles: [], outputReleases: [],
  lines: [], timeline: [], documents: [], adjustments: [], shipments: [],
  quotes: [{ id: 'quote-1', revision: 1, status: 'Issued', expiresAt: '2099-10-07T12:00:00Z', deliveryTargetBusinessDays: 14,
    linesJson: '[]', currency: 'USD', subtotal: 50, tax: 0, total: 50 }],
}
const cases = [
  { name: 'Customer Lab services', page: <LabServiceDetailPage orderId={record.id} />, field: /Reason/, open: 'Request cancellation', keep: 'Keep order', save: 'Request cancellation' },
  { name: 'Partner Data assembly', page: <DataAssemblyDetailPage requestId={record.id} />, field: /Reason/, open: 'Request cancellation', keep: 'Keep request', save: 'Request cancellation' },
  { name: 'Partner Reagent orders', page: <ReagentOrderDetailPage orderId={record.id} />, field: /Reason/, open: 'Request cancellation', keep: 'Keep order', save: 'Request cancellation' },
  { name: 'Customer quote acceptance', page: <LabServiceDetailPage orderId={record.id} />, field: /Purchase order number/, open: 'Accept quote', keep: 'Keep reviewing', save: 'Confirm price and order' },
  { name: 'Partner quote acceptance', page: <DataAssemblyDetailPage requestId={record.id} />, field: /Purchase order number/, open: 'Accept quote', keep: 'Keep reviewing', save: 'Accept quote and queue work' },
]

async function headerAction(name: string) {
  await waitFor(() => expect(screen.queryByRole('button', { name }) ?? screen.queryAllByRole('button', { name: 'Actions' })[0]).toBeTruthy())
  const direct = screen.queryByRole('button', { name })
  if (direct) return direct
  const quoteActions = name === 'Accept quote' ? screen.getByRole('group', { name: 'Quote actions' }) : null
  fireEvent.pointerDown(quoteActions ? within(quoteActions).getByRole('button', { name: 'Actions' }) : screen.getAllByRole('button', { name: 'Actions' })[0], { button: 0, ctrlKey: false })
  return screen.findByRole('menuitem', { name })
}

function decisionBlocker() {
  // The embedded workspace also registers a navigation lock; exercise the order draft guard.
  return mocks.blocker.mock.calls.filter(([options]) => typeof options.enableBeforeUnload === 'function').at(-1)![0]
}

describe.each(cases)('$name decision dialog', ({ name, page, field, open, keep, save }) => {
  beforeEach(() => { vi.clearAllMocks(); mocks.blocker.mockReturnValue({ status: 'idle' }); mocks.read.mockResolvedValue(record); mocks.save.mockReset() })
  afterEach(() => { vi.restoreAllMocks() })

  async function openDialog() {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{page}</QueryClientProvider>)
    fireEvent.click(await headerAction(open))
    return await screen.findByRole('dialog')
  }

  it('retains edited entries after declined Close, footer, Escape and navigation, and resets after a confirmed discard', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const dialog = await openDialog()
    expect(within(dialog).getByRole('button', { name: save }).matches(':disabled')).toBe(true)
    fireEvent.change(within(dialog).getByLabelText(field), { target: { value: 'Keep this entry' } })
    const isLab = name.startsWith('Customer')
    const keepUnsaved = async () => {
      if (isLab) {
        const confirmation = screen.getByRole('dialog', { name: 'Discard unsaved order changes?' })
        fireEvent.click(within(confirmation).getByRole('button', { name: 'Keep reviewing' }))
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Discard unsaved order changes?' })).toBeNull())
      }
    }
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await keepUnsaved()
    fireEvent.click(within(dialog).getByRole('button', { name: keep }))
    await keepUnsaved()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await keepUnsaved()
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(within(dialog).getByLabelText(field)).toHaveProperty('value', 'Keep this entry')
    expect(decisionBlocker().shouldBlockFn()).toBe(true)
    expect(decisionBlocker().enableBeforeUnload()).toBe(true)
    if (isLab) expect(confirm).not.toHaveBeenCalled()
    else expect(confirm).toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(within(dialog).getByRole('button', { name: keep }))
    if (isLab) fireEvent.click(within(screen.getByRole('dialog', { name: 'Discard unsaved order changes?' })).getByRole('button', { name: 'Discard changes' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(await headerAction(open))
    expect(within(screen.getByRole('dialog')).getByLabelText(field)).toHaveProperty('value', '')
    expect(decisionBlocker().enableBeforeUnload()).toBe(false)
  })

  it('blocks repeat submission, editing and dismissal while pending, retains a failed draft, and closes after a successful retry', async () => {
    let rejectSave!: (error: Error) => void
    mocks.save.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject }))
    let dialog = await openDialog()
    let input = within(dialog).getByLabelText(field)
    fireEvent.change(input, { target: { value: 'Reviewed entry' } })
    if (name === 'Customer quote acceptance') {
      dialog = screen.getByRole('dialog')
      input = within(dialog).getByLabelText(field)
      fireEvent.change(input, { target: { value: 'Reviewed entry' } })
      expect(input).toHaveProperty('value', 'Reviewed entry')
      expect(within(dialog).queryByRole('combobox', { name: /Ship Transportation kits to/ })).toBeNull()
      const sampleTypeConfirmation = within(dialog).getByRole('checkbox', { name: /I confirm this is the Sample type/ })
      fireEvent.click(sampleTypeConfirmation.closest('label') as HTMLLabelElement)
      expect(sampleTypeConfirmation).toHaveProperty('checked', true)
    }
    await waitFor(() => expect(within(dialog).getByRole('button', { name: save }).matches(':disabled')).toBe(false))
    fireEvent.click(within(dialog).getByRole('button', { name: save }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
    expect(input.matches(':disabled')).toBe(true)
    expect(within(dialog).getByRole('button', { name: keep }).matches(':disabled')).toBe(true)
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull()
    expect(within(dialog).getAllByRole('button').every(button => button.matches(':disabled'))).toBe(true)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(decisionBlocker().shouldBlockFn()).toBe(true)
    expect(decisionBlocker().enableBeforeUnload()).toBe(true)
    expect(mocks.save).toHaveBeenCalledOnce()
    await act(async () => rejectSave(new Error('The request failed.')))
    await within(dialog).findByRole('alert')
    expect(input).toHaveProperty('value', 'Reviewed entry')
    expect(input.matches(':disabled')).toBe(false)
    mocks.save.mockResolvedValueOnce(record)
    fireEvent.click(within(dialog).getByRole('button', { name: save }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(mocks.save).toHaveBeenCalledTimes(2)
    expect(decisionBlocker().enableBeforeUnload()).toBe(false)
  })
})
