const permissions = vi.hoisted(() => ({ canAccess: true, canAdminister: true }))
vi.mock('./use-crm-permissions', () => ({ useCrmPermissions: () => permissions }))
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CrmCompanyPeople } from './CrmCompanyPeople'
import { CrmCompanySales } from './CrmCompanySales'

const api = vi.hoisted(() => ({ listCompanyContacts: vi.fn(), listCrmCompanyPeople: vi.fn(), listCrmOpportunities: vi.fn(), associateCompanyContact: vi.fn(), listDepartments: vi.fn(), createInvitation: vi.fn() }))
vi.mock('#/api/crm', async (importOriginal) => ({ ...await importOriginal<typeof import('#/api/crm')>(), listCompanyContacts: api.listCompanyContacts, listCrmCompanyPeople: api.listCrmCompanyPeople, listCrmOpportunities: api.listCrmOpportunities, associateCompanyContact: api.associateCompanyContact }))
vi.mock('#/api/organization-management', async (importOriginal) => ({ ...await importOriginal<typeof import('#/api/organization-management')>(), listDepartments: api.listDepartments, createInvitation: api.createInvitation }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), Link: ({ children }: { children: ReactNode }) => <a href="/record">{children}</a> }))
vi.mock('./CrmAssociationRecordCombobox', () => ({ CrmAssociationRecordCombobox: ({ id, name }: { id: string; name: string }) => <input id={id} name={name} /> }))

const person = { recordKind: 'Contact', contactId: 'contact-1', contactAssociationId: 'association-1', displayName: 'Avery Scientist', email: 'avery@example.test', firstName: 'Avery', lastName: 'Scientist', isContactActive: true, portalAccessState: 'NotInvited', departments: [] }
const opportunity = { id: 'opportunity-1', name: 'RNA evaluation', ownerName: 'Phaeno owner', stageName: 'Discovery' }
const department = { id: 'department-1', name: 'Research', isDefault: true, isActive: true }

describe('Company People and Sales recovery', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    permissions.canAdminister = true
    api.listCompanyContacts.mockResolvedValue([])
    api.listCrmCompanyPeople.mockResolvedValue([])
    api.listCrmOpportunities.mockResolvedValue({ items: [] })
    api.listDepartments.mockResolvedValue([department])
    api.createInvitation.mockResolvedValue({ id: "invitation-1" })
  })

  it('keeps a dirty association on declined dismissal and resets a discarded draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mount()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add existing person' })).toHaveProperty('disabled', false))
    fireEvent.click(screen.getByRole('button', { name: 'Add existing person' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Associate contact' })).toHaveProperty('disabled', false))
    fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'Unfinished title' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Primary Company for this Contact' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(confirm).toHaveBeenCalledWith('Discard unsaved Company association changes?')
    expect(screen.getByLabelText('Job title')).toHaveProperty('value', 'Unfinished title')
    expect(api.associateCompanyContact).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Add existing person' }))
    expect(screen.getByLabelText('Job title')).toHaveProperty('value', '')
    expect(screen.getByRole('checkbox', { name: 'Primary Company for this Contact' }).getAttribute('data-state')).toBe('unchecked')
    confirm.mockRestore()
  })

  it('shows Commercial staff Contact relationships without querying Portal access or invitations', async () => {
    permissions.canAdminister = false
    api.listCompanyContacts.mockResolvedValue([{ id: 'association-1', contactId: 'contact-1', contactName: 'Avery Scientist', jobTitle: 'Scientist', relationshipRole: null, isPrimaryCompany: true, isActive: true }])
    mount('organization-1')
    expect(await screen.findByRole('link', { name: 'Avery Scientist' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Manage relationship' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'New person' })).toBeTruthy()
    expect(api.listCrmCompanyPeople).not.toHaveBeenCalled()
    expect(api.listDepartments).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Invite to Portal' })).toBeNull()
  })
  it('invites the selected Company Contact as its first Organization administrator', async () => {
    api.listCrmCompanyPeople.mockResolvedValue([person])
    mount('organization-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Invite to Portal' }))
    const dialog = within(screen.getByRole('dialog'))
    const recipient = within(await dialog.findByRole('region', { name: 'Recipient' }))
    expect(recipient.getByText(person.displayName)).toBeTruthy()
    expect(recipient.getByText(person.email)).toBeTruthy()
    expect(dialog.queryByRole('textbox')).toBeNull()
    fireEvent.click(dialog.getByRole('radio', { name: 'Organization administrator' }))
    fireEvent.click(dialog.getByRole('button', { name: 'Send invitation' }))
    await waitFor(() => expect(api.createInvitation).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'organization-1', crmContactId: person.contactId, email: person.email, isOrganizationAdmin: true, departments: [{ departmentId: department.id, isDepartmentAdmin: false }] })))
  })

  it('reviews the selected Contact and sends only ordinary Research membership intent', async () => {
    api.listCrmCompanyPeople.mockResolvedValue([person])
    api.listDepartments.mockResolvedValue([
      { id: 'general', name: 'General', isDefault: true, isActive: true },
      { ...department, isDefault: false },
    ])
    mount('organization-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Invite to Portal' }))
    const dialog = within(screen.getByRole('dialog'))
    const recipient = within(await dialog.findByRole('region', { name: 'Recipient' }))
    expect(recipient.getByText(person.email)).toBeTruthy()
    fireEvent.click(dialog.getByRole('checkbox', { name: 'General (default)' }))
    fireEvent.click(dialog.getByRole('checkbox', { name: 'Research' }))
    expect(dialog.getByRole('checkbox', { name: 'Department administrator for Research' })).toHaveProperty('checked', false)
    expect(api.createInvitation).not.toHaveBeenCalled()
    fireEvent.click(dialog.getByRole('button', { name: 'Send invitation' }))
    await waitFor(() => expect(api.createInvitation).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ organizationId: 'organization-1', crmContactId: person.contactId, email: person.email, isOrganizationAdmin: false, departments: [{ departmentId: department.id, isDepartmentAdmin: false }] })))
  })

  it('reviews the selected Contact and sends only ordinary Research membership intent', async () => {
    api.listCrmCompanyPeople.mockResolvedValue([person])
    api.listDepartments.mockResolvedValue([
      { id: 'general', name: 'General', isDefault: true, isActive: true },
      { ...department, isDefault: false },
    ])
    mount('organization-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Invite to Portal' }))
    const dialog = within(screen.getByRole('dialog'))
    const recipient = within(await dialog.findByRole('region', { name: 'Recipient' }))
    expect(recipient.getByText(person.email)).toBeTruthy()
    fireEvent.click(dialog.getByRole('checkbox', { name: 'General (default)' }))
    fireEvent.click(dialog.getByRole('checkbox', { name: 'Research' }))
    expect(dialog.getByRole('checkbox', { name: 'Department administrator for Research' })).toHaveProperty('checked', false)
    expect(api.createInvitation).not.toHaveBeenCalled()
    fireEvent.click(dialog.getByRole('button', { name: 'Send invitation' }))
    await waitFor(() => expect(api.createInvitation).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ organizationId: 'organization-1', crmContactId: person.contactId, email: person.email, isOrganizationAdmin: false, departments: [{ departmentId: department.id, isDepartmentAdmin: false }] })))
  })

  it('announces pending loads and guards association without showing empty collections', () => {
    api.listCompanyContacts.mockReturnValue(new Promise(() => {}))
    api.listCrmCompanyPeople.mockReturnValue(new Promise(() => {}))
    api.listCrmOpportunities.mockReturnValue(new Promise(() => {}))
    mount()
    for (const name of ['contacts', 'people', 'opportunities']) expect(screen.getByText(`Loading ${name}…`)).toBeTruthy()
    expect(screen.queryByText('No people are associated with this Company.')).toBeNull()
    expect(screen.queryByText('No opportunities recorded.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Add existing person' })).toHaveProperty('disabled', true)
  })

  it('recovers failed people, contacts and sales independently before reporting a successful empty response', async () => {
    api.listCompanyContacts.mockRejectedValueOnce(new Error('offline'))
    api.listCrmCompanyPeople.mockRejectedValueOnce(new Error('offline'))
    api.listCrmOpportunities.mockRejectedValueOnce(new Error('offline'))
    mount()
    for (const name of ['people', 'contacts', 'opportunities']) expect(await screen.findByText(`Could not load ${name}`)).toBeTruthy()
    expect(screen.queryByText('No people are associated with this Company.')).toBeNull()
    expect(screen.queryByText('No opportunities recorded.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Add existing person' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Retry contacts' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add existing person' })).toHaveProperty('disabled', false))
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add existing person' })).toHaveProperty('disabled', false))
    fireEvent.click(screen.getByRole('button', { name: 'Add existing person' }))
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
    expect(dialog.getByRole('checkbox', { name: 'Research (default)' })).toHaveProperty('checked', true)
    api.listDepartments.mockRejectedValueOnce(new Error('offline'))
    await act(async () => { await client.invalidateQueries({ queryKey: ['organization-departments'] }) })
    expect(await dialog.findByRole('alert')).toBeTruthy()
    expect(dialog.getByRole('button', { name: 'Send invitation' })).toHaveProperty('disabled', true)
    fireEvent.click(dialog.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Send invitation' })).toHaveProperty('disabled', false))
    expect(dialog.getByRole('checkbox', { name: 'Research (default)' })).toHaveProperty('checked', true)
  })
})

function mount(accessOrganizationId: string | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><CrmCompanyPeople companyId="company-1" accessOrganizationId={accessOrganizationId} /><CrmCompanySales companyId="company-1" /></QueryClientProvider>)
  return client
}

it('groups pending invitation actions and changes the badge after expiry', async () => {
  vi.resetAllMocks()
  permissions.canAdminister = true
  api.listDepartments.mockResolvedValue([department])
  api.listCrmOpportunities.mockResolvedValue({ items: [] })
  api.listCrmCompanyPeople.mockResolvedValue([{ ...person, invitationId: 'invite-1', portalAccessState: 'InvitationPending' }])
  api.listCompanyContacts.mockResolvedValue([{ id: person.contactAssociationId, contactId: person.contactId, isActive: true }])
  const client = mount('organization-1')
  await screen.findByText('Invitation pending')
  expect(screen.queryByRole('button', { name: 'Edit relationship' })).toBeNull()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Actions for Avery Scientist' }), { key: 'ArrowDown' })
  expect(await screen.findByRole('menuitem', { name: 'Edit relationship' })).toBeTruthy()
  expect(screen.getByRole('menuitem', { name: 'Edit invited access' })).toBeTruthy()
  expect(screen.getByRole('menuitem', { name: 'Resend invite' })).toBeTruthy()
  expect(screen.getByRole('menuitem', { name: 'Revoke invite' })).toBeTruthy()
  expect(screen.queryByRole('menuitem', { name: 'Manage access' })).toBeNull()
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
  api.listCrmCompanyPeople.mockResolvedValue([{ ...person, invitationId: 'invite-1', portalAccessState: 'InvitationExpired' }])
  await act(async () => { await client.invalidateQueries({ queryKey: ['crm-company-people', 'company-1'] }) })
  await screen.findByText('Invitation expired')
  expect(screen.queryByText('Invitation pending')).toBeNull()
})