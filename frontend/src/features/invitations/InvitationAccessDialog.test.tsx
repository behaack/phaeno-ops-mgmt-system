import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Invitation } from '#/api/organization-management'
import { InvitationAccessDialog } from './InvitationAccessDialog'

const api = vi.hoisted(() => ({ listDepartments: vi.fn(), listInvitations: vi.fn(), updateInvitationAccess: vi.fn() }))
vi.mock('#/api/organization-management', async original => ({ ...await original<typeof import('#/api/organization-management')>(), ...api }))
const invitation = { id: 'invite', organizationId: 'organization', firstName: 'Simulated', lastName: 'Invitee', email: 'invitee@example.test', status: 'Pending', version: 4, isOrganizationAdmin: false, departments: [{ departmentId: 'research', departmentName: 'Research', isDepartmentAdmin: false }] } as Invitation
beforeEach(() => {
  vi.resetAllMocks()
  api.listDepartments.mockResolvedValue([{ id: 'general', name: 'General', isActive: true, isDefault: true }, { id: 'research', name: 'Research', isActive: true }])
  api.listInvitations.mockResolvedValue([invitation])
  api.updateInvitationAccess.mockResolvedValue({ ...invitation, version: 5 })
})
afterEach(cleanup)
function show() {
  const onSaved = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><InvitationAccessDialog invitation={invitation} onClose={onClose} onSaved={onSaved} /></QueryClientProvider>)
  return { onSaved, onClose }
}
it('updates only the existing invitation intent using its reviewed version', async () => {
  const result = show()
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Department administrator for Research' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save invited access' }))
  await waitFor(() => expect(api.updateInvitationAccess).toHaveBeenCalledExactlyOnceWith('invite', { version: 4, isOrganizationAdmin: false, departments: [{ departmentId: 'research', isDepartmentAdmin: true }] }))
  await waitFor(() => expect(result.onClose).toHaveBeenCalledOnce())
  expect(result.onSaved).toHaveBeenCalledOnce()
})
it('prevents saving without departments and protects unsaved work on cancel', async () => {
  const result = show()
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Research' }))
  expect(screen.getByText('Select at least one department.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Save invited access' })).toHaveProperty('disabled', true)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByText('Discard your unsaved invitation changes?')).toBeTruthy()
  expect(result.onClose).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect(screen.getByRole('checkbox', { name: 'Research' })).toHaveProperty('checked', false)
  expect(api.updateInvitationAccess).not.toHaveBeenCalled()
})
it('preserves a conflicting draft until an explicit reload and then uses the newer version', async () => {
  api.updateInvitationAccess.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } })
  show()
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Department administrator for Research' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save invited access' }))
  await screen.findByRole('button', { name: 'Reload invitation' })
  expect(screen.getByRole('checkbox', { name: 'Department administrator for Research' })).toHaveProperty('checked', true)
  expect(screen.getByRole('button', { name: 'Save invited access' })).toHaveProperty('disabled', true)
  api.listInvitations.mockResolvedValue([{ ...invitation, version: 7 }])
  fireEvent.click(screen.getByRole('button', { name: 'Reload invitation' }))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Department administrator for Research' })).toHaveProperty('checked', false))
  fireEvent.click(screen.getByRole('radio', { name: 'Organization administrator — all departments' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save invited access' }))
  await waitFor(() => expect(api.updateInvitationAccess).toHaveBeenLastCalledWith('invite', { version: 7, isOrganizationAdmin: true, departments: [] }))
})
