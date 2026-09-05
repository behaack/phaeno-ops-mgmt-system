import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OrganizationInvitationDialog } from './OrganizationInvitationDialog'

const mocks = vi.hoisted(() => ({ listDepartments: vi.fn() }))
vi.mock('#/api/organization-management', () => mocks)
const general = { id: 'general', name: 'General', isDefault: true, isActive: true }
const research = { id: 'research', name: 'Research', isDefault: false, isActive: true }

beforeEach(() => { vi.clearAllMocks(); mocks.listDepartments.mockResolvedValue([general, research]) })
afterEach(cleanup)

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const onOpenChange = vi.fn()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <OrganizationInvitationDialog organizationId="organization" error={null} isPending={false} onSubmit={onSubmit} onOpenChange={onOpenChange} />
  </QueryClientProvider>)
  return { onSubmit, onOpenChange }
}

async function fillPerson() {
  fireEvent.change(await screen.findByLabelText(/First name/), { target: { value: 'Ada' } })
  fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Researcher' } })
  fireEvent.change(screen.getByLabelText('Email', { exact: false }), { target: { value: 'ada@example.com' } })
}

describe('organization invitations retain explicit department intent', () => {
  it('requires a department and preserves the reviewed administrator assignment', async () => {
    const { onSubmit } = setup()
    await fillPerson()
    fireEvent.click(screen.getByRole('checkbox', { name: 'General (default)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
    await screen.findByText('Select at least one department before sending the invitation.')
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Research' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Department administrator for Research' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ departments: [{ departmentId: 'research', isDepartmentAdmin: true }] })))
  })

  it('preserves entered values and rejects a department removed after a failed submission', async () => {
    const onSubmit = vi.fn().mockImplementation(async () => { mocks.listDepartments.mockResolvedValue([general]); throw new Error('Changed') })
    setup(onSubmit)
    await fillPerson()
    fireEvent.click(screen.getByRole('checkbox', { name: 'General (default)' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Research' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Research' })).toBeNull())
    expect((screen.getByLabelText(/First name/) as HTMLInputElement).value).toBe('Ada')
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
    await screen.findByText('Department availability changed. Your entries are preserved. Review access before sending again.')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('requires review before discarding an unsent invitation', async () => {
    const { onOpenChange } = setup()
    await fillPerson()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByText('Discard this unsent invitation?')
    expect(onOpenChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('explains all-department access for an organization administrator', async () => {
    const { onSubmit } = setup()
    await fillPerson()
    fireEvent.change(screen.getByLabelText(/Role/), { target: { value: 'Administrator' } })
    expect(screen.getByText(/including departments added later/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ role: 'Administrator', departments: [{ departmentId: 'general', isDepartmentAdmin: false }] })))
  })
})
