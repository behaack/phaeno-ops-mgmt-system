import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createCrmCompanyDepartment, type CrmCompany } from '#/api/crm'
import { CrmCompanyDepartments } from './CrmCompanyDepartments'

vi.mock('#/api/crm', async original => ({ ...await original<typeof import('#/api/crm')>(), createCrmCompanyDepartment: vi.fn() }))
vi.mock('#/features/organizations/OrganizationDepartmentsPanel', () => ({
  OrganizationDepartmentsPanel: ({ organizationId, manageMembers }: { organizationId: string; manageMembers: boolean }) =>
    <div>Saved departments: {organizationId}{manageMembers ? <button>Manage members</button> : null}</div>,
}))

const company = { id: 'company', name: 'Research Company', isActive: true, accessOrganizationId: null, setupOrganizationId: null } as CrmCompany
function mount(value = company) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  client.setQueryData(['crm-company', value.id], value)
  function Workspace() {
    const query = useQuery({ queryKey: ['crm-company', value.id], queryFn: () => Promise.resolve(value), enabled: false })
    return <CrmCompanyDepartments company={query.data!} />
  }
  render(<QueryClientProvider client={client}><Workspace /></QueryClientProvider>)
  return client
}

beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)

it('offers Add department directly and opening or cancelling does not write anything', () => {
  mount()
  expect(screen.queryByRole('button', { name: 'Open Company requests' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add department' }))
  expect(screen.getByRole('dialog')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(createCrmCompanyDepartment).not.toHaveBeenCalled()
})

it('saves to the Company, shows retained departments and keeps membership controls unavailable', async () => {
  const client = mount()
  vi.mocked(createCrmCompanyDepartment).mockResolvedValue({ id: 'department', organizationId: 'setup' } as Awaited<ReturnType<typeof createCrmCompanyDepartment>>)
  fireEvent.click(screen.getByRole('button', { name: 'Add department' }))
  fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Cardiology' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  await screen.findByText('Saved departments: setup')
  expect(createCrmCompanyDepartment).toHaveBeenCalledWith('company', expect.objectContaining({ name: 'Cardiology' }))
  expect(client.getQueryData<CrmCompany>(['crm-company', company.id])?.accessOrganizationId).toBeNull()
  expect(screen.queryByRole('button', { name: 'Manage members' })).toBeNull()
})

it('retains entered details after a failed save', async () => {
  mount()
  vi.mocked(createCrmCompanyDepartment).mockRejectedValue(new Error('Save unavailable'))
  fireEvent.click(screen.getByRole('button', { name: 'Add department' }))
  fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Cardiology' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  await waitFor(() => expect(createCrmCompanyDepartment).toHaveBeenCalledOnce())
  await screen.findByRole('alert')
  expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveProperty('value', 'Cardiology')
})

it('uses the approved scope and membership controls after approval', () => {
  mount({ ...company, accessOrganizationId: 'approved' })
  expect(screen.getByText('Saved departments: approved')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Manage members' })).toBeTruthy()
})

it('explains the disabled create action for an inactive Company', () => {
  mount({ ...company, isActive: false })
  expect(screen.getByRole('button', { name: 'Add department' })).toHaveProperty('disabled', true)
  expect(screen.getByText('Reactivate this Company to add departments.')).toBeTruthy()
})
