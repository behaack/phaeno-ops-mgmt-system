import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CrmCompanyPeople } from './CrmCompanyPeople'
import { CrmCompanySales } from './CrmCompanySales'

const api = vi.hoisted(() => ({ listCompanyContacts: vi.fn(), listCrmCompanyPeople: vi.fn(), listCrmOpportunities: vi.fn(), associateCompanyContact: vi.fn(), listDepartments: vi.fn() }))
vi.mock('#/api/crm', async (importOriginal) => ({ ...await importOriginal<typeof import('#/api/crm')>(), listCompanyContacts: api.listCompanyContacts, listCrmCompanyPeople: api.listCrmCompanyPeople, listCrmOpportunities: api.listCrmOpportunities, associateCompanyContact: api.associateCompanyContact }))
vi.mock('#/api/organization-management', async (importOriginal) => ({ ...await importOriginal<typeof import('#/api/organization-management')>(), listDepartments: api.listDepartments }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="/record">{children}</a> }))
vi.mock('./CrmAssociationRecordCombobox', () => ({ CrmAssociationRecordCombobox: ({ id, name }: { id: string; name: string }) => <input id={id} name={name} /> }))

const person = { recordKind: 'Contact', contactId: 'contact-1', contactAssociationId: 'association-1', displayName: 'Avery Scientist', email: 'avery@example.test', firstName: 'Avery', lastName: 'Scientist', isContactActive: true, portalAccessState: 'NotInvited', departments: [] }
const opportunity = { id: 'opportunity-1', name: 'RNA evaluation', ownerName: 'Phaeno owner', stageName: 'Discovery' }
const department = { id: 'department-1', name: 'Research', isDefault: true, isActive: true }

describe('Company People and Sales recovery', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.listCompanyContacts.mockResolvedValue([])
    api.listCrmCompanyPeople.mockResolvedValue([])
    api.listCrmOpportunities.mockResolvedValue({ items: [] })
    api.listDepartments.mockResolvedValue([department])
  })

  it('announces pending loads and guards association without showing empty collections', () => {
    api.listCompanyContacts.mockReturnValue(new Promise(() => {}))
    api.listCrmCompanyPeople.mockReturnValue(new Promise(() => {}))
    api.listCrmOpportunities.mockReturnValue(new Promise(() => {}))
    mount()
    for (const name of ['contacts', 'people', 'opportunities']) expect(screen.getByText(`Loading ${name}…`)).toBeTruthy()
    expect(screen.queryByText('No people are associated with this Company.')).toBeNull()
    expect(screen.queryByText('No opportunities recorded.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Associate contact' })).toHaveProperty('disabled', true)
  })

  it('recovers failed people, contacts and sales independently before reporting a successful empty response', async () => {
    api.listCompanyContacts.mockRejectedValueOnce(new Error('offline'))
    api.listCrmCompanyPeople.mockRejectedValueOnce(new Error('offline'))
    api.listCrmOpportunities.mockRejectedValueOnce(new Error('offline'))
    mount()
    for (const name of ['people', 'contacts', 'opportunities']) expect(await screen.findByText(`Could not load ${name}`)).toBeTruthy()
    expect(screen.queryByText('No people are associated with this Company.')).toBeNull()
    expect(screen.queryByText('No opportunities recorded.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Associate contact' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Retry contacts' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Associate contact' })).toHaveProperty('disabled', false))
    expect(screen.getByText('Could not load people')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry people' }))
    expect(await screen.findByText('No people are associated with this Company.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry opportunities' }))
    expect(await screen.findByText('No opportunities recorded.')).toBeTruthy()
  })

  it('keeps cached people and sales visible with warnings when refresh fails', async () => {
    api.listCrmCompanyPeople.mockResolvedValueOnce([person])
    api.listCrmOpportunities.mockResolvedValueOnce({ items: [opportunity] })
    const client = mount()
    expect(await screen.findByRole('link', { name: person.displayName })).toBeTruthy()
    expect(await screen.findByRole('link', { name: /RNA evaluation/ })).toBeTruthy()
    api.listCrmCompanyPeople.mockRejectedValue(new Error('offline'))
    api.listCrmOpportunities.mockRejectedValue(new Error('offline'))
    await act(async () => { await Promise.all([client.invalidateQueries({ queryKey: ['crm-company-people'] }), client.invalidateQueries({ queryKey: ['crm-company-opportunities'] })]) })
    expect(await screen.findByText('Could not load people')).toBeTruthy()
    expect(await screen.findByText('Could not load opportunities')).toBeTruthy()
    expect(screen.getAllByText(/Previously loaded records are shown/)).toHaveLength(2)
    expect(screen.getByRole('link', { name: person.displayName })).toBeTruthy()
    expect(screen.getByRole('link', { name: /RNA evaluation/ })).toBeTruthy()
    expect(screen.queryByText('No opportunities recorded.')).toBeNull()
  })

  it('preserves an open association form and blocks submission until failed contact exclusions recover', async () => {
    const client = mount()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Associate contact' })).toHaveProperty('disabled', false))
    fireEvent.click(screen.getByRole('button', { name: 'Associate contact' }))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Job title'), { target: { value: 'Lab director' } })
    api.listCompanyContacts.mockRejectedValueOnce(new Error('offline'))
    await act(async () => { await client.invalidateQueries({ queryKey: ['crm-company-contacts'] }) })
    expect(await dialog.findByText('Could not load contacts')).toBeTruthy()
    expect(dialog.getByRole('button', { name: 'Associate contact' })).toHaveProperty('disabled', true)
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
    expect(api.associateCompanyContact).not.toHaveBeenCalled()
    fireEvent.click(dialog.getByRole('button', { name: 'Retry contacts' }))
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Associate contact' })).toHaveProperty('disabled', false))
    expect(dialog.getByLabelText('Job title')).toHaveProperty('value', 'Lab director')
  })

  it('explains unavailable department choices and recovers invitation selections without closing the dialog', async () => {
    api.listCrmCompanyPeople.mockResolvedValue([person])
    api.listDepartments.mockRejectedValueOnce(new Error('offline'))
    const client = mount('organization-1')
    expect(await screen.findByText('Could not load departments')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Invite to Portal' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry departments' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Invite to Portal' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('checkbox', { name: 'Research (default)' }).getAttribute('aria-checked')).toBe('true')
    api.listDepartments.mockRejectedValueOnce(new Error('offline'))
    await act(async () => { await client.invalidateQueries({ queryKey: ['organization-departments'] }) })
    expect(await dialog.findByText('Could not load departments')).toBeTruthy()
    expect(dialog.getByRole('button', { name: 'Send invitation' })).toHaveProperty('disabled', true)
    fireEvent.click(dialog.getByRole('button', { name: 'Retry departments' }))
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Send invitation' })).toHaveProperty('disabled', false))
    expect(dialog.getByRole('checkbox', { name: 'Research (default)' }).getAttribute('aria-checked')).toBe('true')
  })
})

function mount(accessOrganizationId: string | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><CrmCompanyPeople companyId="company-1" accessOrganizationId={accessOrganizationId} /><CrmCompanySales companyId="company-1" /></QueryClientProvider>)
  return client
}
