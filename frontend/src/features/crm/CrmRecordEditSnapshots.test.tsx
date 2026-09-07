vi.mock('./use-crm-permissions', () => ({ useCrmPermissions: () => ({ canAccess: true, canAdminister: true }) }))
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '#/api/crm'
import { CrmCompanyDetailPage } from './CrmCompanyDetailPage'
import { CrmContactDetailPage } from './CrmContactDetailPage'

vi.mock('#/api/crm', async importOriginal => ({ ...await importOriginal<typeof api>(), getCrmCompany: vi.fn(), getCrmContact: vi.fn(), listContactCompanies: vi.fn(), updateCrmCompany: vi.fn(), updateCrmContact: vi.fn(), assignCrmCompanyOwner: vi.fn(), setCrmCompanyActive: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), useNavigate: () => vi.fn(), useRouterState: ({ select }: { select: (state: { location: { search: object } }) => unknown }) => select({ location: { search: {} } }), Link: ({ children }: { children: ReactNode }) => <span>{children}</span> }))
vi.mock('./CrmCustomFields', () => ({ CrmCustomFields: () => null }))
vi.mock('./CrmRecordWork', () => ({ CrmRecordWork: () => null }))
vi.mock('./CrmCompanyRelationships', () => ({ CrmCompanyRelationships: () => null }))
vi.mock('./CrmCompanyPeople', () => ({ CrmCompanyPeople: () => null }))
vi.mock('./CrmCompanySales', () => ({ CrmCompanySales: () => null }))
vi.mock('./CrmMergeDialog', () => ({ CrmMergeDialog: () => null }))
vi.mock('#/features/organizations/OrganizationDetailPage', () => ({ OrganizationDetailPage: () => null }))
vi.mock('#/features/organizations/OrganizationDepartmentsPanel', () => ({ OrganizationDepartmentsPanel: () => null }))
vi.mock('./CrmOwnerSelect', () => ({ CrmOwnerSelect: ({ id, currentOwnerId, currentOwnerName }: { id: string; currentOwnerId?: string; currentOwnerName?: string }) => <><p>Reviewed owner: {currentOwnerName}</p><input id={id} name="ownerUserId" defaultValue={currentOwnerId} /></> }))

const company: api.CrmCompany = {
  id: 'company-1', name: 'Reviewed Research Company', websiteUrl: 'https://reviewed.example', domainName: null,
  phone: null, industry: null, description: null, addressLine1: null, addressLine2: null, city: null,
  region: null, postalCode: null, countryCode: null, employeeCount: null, lifecycleState: 'Target', source: null,
  tags: [], aliases: [], mergedIntoCompanyId: null, ownerUserId: 'owner-1', ownerName: 'Reviewed owner',
  accessOrganizationId: null, portalRelationship: null, portalReadiness: null, portalAccessStatus: 'NotEnabled',
  isActive: true, createdAt: '2026-09-01', updatedAt: '2026-09-01', version: 1,
}
const contact: api.CrmContact = {
  id: 'contact-1', firstName: 'Ada', lastName: 'Researcher', displayName: 'Ada Researcher', email: 'ada@example.test',
  phone: null, primaryCompanyName: null, primaryCompanyTitle: null, ownerUserId: 'owner-1', ownerName: 'Reviewed owner',
  communicationPreference: 'Unknown', lawfulContactBasis: null, communicationNotes: null, tags: [], aliases: [],
  mergedIntoContactId: null, isActive: true, createdAt: '2026-09-01', updatedAt: '2026-09-01', version: 4,
}
function mount(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
  return client
}

describe('CRM reviewed record snapshots', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(api.getCrmCompany).mockResolvedValue(company)
    vi.mocked(api.getCrmContact).mockResolvedValue(contact)
    vi.mocked(api.listContactCompanies).mockResolvedValue([])
  })

  it('preserves Company draft fields and its reviewed version through refresh and failed save, then captures a fresh snapshot on reopen', async () => {
    vi.mocked(api.updateCrmCompany).mockRejectedValue(new Error('Company changed'))
    const client = mount(<CrmCompanyDetailPage companyId={company.id} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText(/Company name/), { target: { value: 'Keep drafted Company name' } })
    act(() => client.setQueryData(['crm-company', company.id], { ...company, name: 'Refreshed Company', websiteUrl: 'https://refreshed.example', version: 2 }))
    expect(screen.getByLabelText(/Company name/)).toHaveProperty('value', 'Keep drafted Company name')
    expect(screen.getByLabelText('Website')).toHaveProperty('value', company.websiteUrl)
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.updateCrmCompany).toHaveBeenCalledWith(company.id, expect.objectContaining({ name: 'Keep drafted Company name', websiteUrl: company.websiteUrl, version: 1 })))
    await screen.findByText('Company changed')
    expect(screen.getByLabelText(/Company name/)).toHaveProperty('value', 'Keep drafted Company name')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText(/Company name/)).toHaveProperty('value', 'Refreshed Company')
    expect(screen.getByLabelText('Website')).toHaveProperty('value', 'https://refreshed.example')
  })

  it('preserves a Contact communication choice and reviewed version through refresh and failed save', async () => {
    vi.mocked(api.updateCrmContact).mockRejectedValue(new Error('Contact changed'))
    const client = mount(<CrmContactDetailPage contactId={contact.id} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Keep drafted name' } })
    fireEvent.change(screen.getByLabelText('Communication preference'), { target: { value: 'DoNotContact' } })
    act(() => client.setQueryData(['crm-contact', contact.id], { ...contact, communicationPreference: 'Permitted', firstName: 'Refreshed', version: 5 }))
    expect(screen.getByLabelText('Communication preference')).toHaveProperty('value', 'DoNotContact')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.updateCrmContact).toHaveBeenCalledWith(contact.id, expect.objectContaining({ firstName: 'Keep drafted name', communicationPreference: 'DoNotContact', version: 4 })))
    await screen.findByText('Contact changed')
    expect(screen.getByLabelText(/First name/)).toHaveProperty('value', 'Keep drafted name')
    expect(screen.getByLabelText('Communication preference')).toHaveProperty('value', 'DoNotContact')
  })

  it('keeps Company deactivation tied to the name, action, and version reviewed at confirmation-open', async () => {
    vi.mocked(api.setCrmCompanyActive).mockRejectedValue(new Error('Company changed'))
    const client = mount(<CrmCompanyDetailPage companyId={company.id} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }))
    act(() => client.setQueryData(['crm-company', company.id], { ...company, name: 'Refreshed Company', isActive: false, version: 2 }))
    const dialog = within(screen.getByRole('dialog', { name: 'Deactivate company' }))
    expect(dialog.getByText(/Deactivate Reviewed Research Company/)).toBeTruthy()
    fireEvent.click(dialog.getByRole('button', { name: 'Deactivate company' }))
    await waitFor(() => expect(api.setCrmCompanyActive).toHaveBeenCalledWith(company.id, false, 1))
  })

  it('keeps Company ownership reassignment tied to the reviewed owner and version', async () => {
    vi.mocked(api.assignCrmCompanyOwner).mockRejectedValue(new Error('Company changed'))
    const client = mount(<CrmCompanyDetailPage companyId={company.id} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Change owner' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Owner' }), { target: { value: 'owner-2' } })
    act(() => client.setQueryData(['crm-company', company.id], { ...company, ownerUserId: 'owner-3', ownerName: 'Refreshed owner', version: 2 }))
    const dialog = within(screen.getByRole('dialog', { name: 'Change Company owner' }))
    expect(dialog.getByText('Reviewed owner: Reviewed owner')).toBeTruthy()
    fireEvent.click(dialog.getByRole('button', { name: 'Change owner' }))
    await waitFor(() => expect(api.assignCrmCompanyOwner).toHaveBeenCalledWith(company.id, 'owner-2', 1))
    await screen.findByText('Company changed')
    expect(screen.getByRole('textbox', { name: 'Owner' })).toHaveProperty('value', 'owner-2')
  })
})
