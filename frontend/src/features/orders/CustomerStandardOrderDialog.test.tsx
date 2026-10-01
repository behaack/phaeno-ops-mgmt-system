import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabServiceOrder } from '#/api/order-management'
import { CustomerStandardOrderDialog } from './CustomerStandardOrderDialog'

const mocks = vi.hoisted(() => ({ offerings: vi.fn(), types: vi.fn(), locations: vi.fn(), create: vi.fn(), save: vi.fn(), review: vi.fn(), place: vi.fn(), get: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: () => ({ status: 'idle' }) }))
vi.mock('#/api/customer-standard-orders', () => ({ createCustomerStandardDraft: mocks.create, saveCustomerStandardDraft: mocks.save, reviewCustomerStandardDraft: mocks.review }))
vi.mock('#/api/order-bundles', () => ({ listLabServiceOfferings: mocks.offerings, placeStandardLabOrder: mocks.place }))
vi.mock('#/api/customer-delivery-locations', () => ({ getCustomerDeliveryLocations: mocks.locations }))
vi.mock('#/api/order-management', async original => ({ ...await original<typeof import('#/api/order-management')>(), listLabOrderSampleTypes: mocks.types, getLabOrder: mocks.get }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', selectedOrganizationId: 'org', selectedDepartmentId: 'dept', session: { capabilities: { canCreateLabServiceRequests: true }, selectedDepartment: { purchaseOrderRequired: false }, memberships: [{ organizationId: 'org', departments: [{ departmentId: 'dept', departmentName: 'Research' }] }] } }) }))
const service = '10000000-0000-4000-8000-000000000001', type = '10000000-0000-4000-8000-000000000002'
const offering = { id: service, name: 'PSeq', unitPrice: 850, currency: 'USD', maximumCustomerSamples: 3, supportedSampleTypes: [{ id: type, isAvailable: true }], maximumTurnaroundDays: 14, version: 2, offeringVersion: 1, catalogItemVersion: 3, priceProvenance: { source: 'Department' } }
const draft = { jobName: 'Study', offeringId: service, sampleTypeDefinitionId: type, sources: [{ biologicalSource: 'Human PBMC', specimenCount: 3 }], storageRequirements: null, safetyDeclaration: 'No known hazards', notes: '' }
const saved = { id: 'order', organizationId: 'org', version: 2, customerReference: 'Study', customerDraft: draft, sampleTypeDefinitionId: type, sampleTypeName: 'Total RNA' } as LabServiceOrder
function open(order?: LabServiceOrder) { const onSaved = vi.fn(); render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><CustomerStandardOrderDialog open order={order} onOpenChange={vi.fn()} onSaved={onSaved} /></QueryClientProvider>); return onSaved }
async function complete(samples = 3) {
  await screen.findByRole('option', { name: /PSeq/ })
  fireEvent.change(screen.getByRole('combobox', { name: /^Service/ }), { target: { value: service } })
  fireEvent.change(screen.getByRole('textbox', { name: /Job name/ }), { target: { value: 'Study' } })
  fireEvent.change(screen.getByRole('combobox', { name: /Sample type/ }), { target: { value: type } })
  fireEvent.change(screen.getByRole('textbox', { name: /Biological source/ }), { target: { value: 'Human PBMC' } })
  fireEvent.change(screen.getByRole('spinbutton', { name: /Samples/ }), { target: { value: String(samples) } })
  fireEvent.change(screen.getByRole('textbox', { name: /Safety declaration/ }), { target: { value: 'No known hazards' } })
}
describe('Customer standard ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.offerings.mockResolvedValue([offering]); mocks.types.mockResolvedValue([{ id: type, name: 'Total RNA', storageRequirements: 'Frozen' }])
    mocks.locations.mockResolvedValue([{ id: 'address', label: 'Research', isActive: true, isDefault: true, version: 4, recipient: 'Research', line1: '1 Lab Road', city: 'City', region: 'CA', postalCode: '90000' }])
    mocks.create.mockResolvedValue(saved); mocks.save.mockResolvedValue(saved)
    mocks.review.mockResolvedValue({ order: saved, preview: { offering, priceProvenance: { source: 'Department' }, specimenCount: 3, subtotal: 2550, tax: 0, total: 2550, currency: 'USD', canPlaceStandardOrder: true, blockers: [], reviewToken: 'review-evidence', orderVersion: 2, commercialProfileVersion: 5, departmentVersion: 6, organizationVersion: 7 } })
    mocks.place.mockResolvedValue({ ...saved, placedAt: '2026-09-30T12:00:00Z' })
  })
  it('saves incomplete Drafts without phases, prices or a run-count editor', async () => {
    const onSaved = open()
    expect(screen.getByRole('dialog', { name: 'New lab service order' })).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: /Job name/ }), { target: { value: 'Study' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ offeringId: null, sampleTypeDefinitionId: null, storageRequirements: null }), expect.any(String))
    expect(mocks.review).not.toHaveBeenCalled(); expect(mocks.place).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/Use phases|Sequencing runs|Propose.*price/)).toBeNull()
  })
  it('retains above-limit quantities and permits Draft saving while blocking review', async () => {
    open(); await complete(4)
    expect((screen.getByRole('button', { name: 'Review order' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('spinbutton', { name: /Samples/ }) as HTMLInputElement).value).toBe('4')
    expect(screen.getByText(/For orders above 3 samples/)).toBeTruthy()
    expect(mocks.place).not.toHaveBeenCalled()
  })
  it('reviews the inclusive limit and places only the accepted server evidence', async () => {
    const onSaved = open(); await complete()
    fireEvent.click(screen.getByRole('button', { name: 'Review order' }))
    await screen.findByRole('button', { name: 'Place order' })
    expect(screen.getByText('$2,550.00', { selector: 'dd' })).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: /I will send/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /I accept/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(mocks.place).toHaveBeenCalledWith('order', expect.objectContaining({ reviewToken: 'review-evidence', version: 2, kitDeliveryLocationVersion: 4, confirmedSampleTypeId: type }), expect.any(String))
  })
  it('merges untouched server changes and blocks retry until the refreshed Draft is reviewed', async () => {
    const latest = { ...saved, version: 3, customerDraft: { ...draft, sources: [{ biologicalSource: 'Human PBMC', specimenCount: 2 }], notes: 'Other administrator note' } }
    mocks.get.mockResolvedValue(latest)
    mocks.save.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { error: { code: 'concurrency_conflict' } } } })
      .mockResolvedValueOnce({ ...latest, customerDraft: { ...latest.customerDraft, notes: 'My new note' } })
    const onSaved = open(saved)
    await screen.findByRole('option', { name: /PSeq/ })
    fireEvent.change(screen.getByRole('textbox', { name: /Job notes/ }), { target: { value: 'My new note' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    const reviewed = await screen.findByRole('button', { name: 'I reviewed the refreshed Draft' })
    expect((screen.getByRole('spinbutton', { name: /Samples/ }) as HTMLInputElement).value).toBe('2')
    expect((screen.getByRole('textbox', { name: /Job notes/ }) as HTMLTextAreaElement).value).toBe('My new note')
    expect(screen.getByText('Other administrator note')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Latest saved Draft changes' }).closest('[data-slot="dialog-body"]')).not.toBeNull()
    expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Review order' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(reviewed)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /Job name/ })))
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(mocks.save).toHaveBeenLastCalledWith(saved.id, expect.objectContaining({ sources: latest.customerDraft.sources, notes: 'My new note' }), 3)
  })
})
