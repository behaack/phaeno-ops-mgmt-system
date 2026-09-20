import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { CrmCompanyPerson } from '#/api/crm'
import { CrmPersonInvitationDialog, type PersonInvitationAction } from './CrmPersonInvitationDialog'
const api = vi.hoisted(() => ({ listInvitations: vi.fn(), listDepartments: vi.fn(), resendInvitation: vi.fn(), revokeInvitation: vi.fn() }))
vi.mock('#/api/organization-management', async original => ({ ...await original<typeof import('#/api/organization-management')>(), ...api }))
const person = { displayName: 'Simulated Invitee', email: 'invited@example.test', invitationId: 'invite' } as CrmCompanyPerson
const invitation = { id: 'invite', organizationId: 'organization', email: person.email, firstName: 'Simulated', lastName: 'Invitee', status: 'Pending', version: 2, isExpired: false, deliveryStatus: 'Accepted', hasHardBounce: false, isOrganizationAdmin: false, departments: [{ departmentId: 'research', departmentName: 'Research', isDepartmentAdmin: true }] }
beforeEach(() => {
  vi.resetAllMocks()
  api.listInvitations.mockResolvedValue([invitation])
  api.listDepartments.mockResolvedValue([{ id: 'research', name: 'Research', isActive: true }])
  api.resendInvitation.mockResolvedValue(undefined)
  api.revokeInvitation.mockResolvedValue(undefined)
})
afterEach(cleanup)
function show(action: PersonInvitationAction) {
  const onClose = vi.fn(), onCompleted = vi.fn().mockResolvedValue(undefined)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><CrmPersonInvitationDialog organizationId="organization" person={person} action={action} onClose={onClose} onCompleted={onCompleted} /></QueryClientProvider>)
  return { onClose, onCompleted }
}
it('opens editing directly without resend or revoke controls', async () => {
  show('edit')
  await screen.findByRole('checkbox', { name: 'Department administrator for Research' })
  expect(screen.getByRole('heading', { name: 'Edit invited access' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Resend|Revoke/ })).toBeNull()
  expect(api.resendInvitation).not.toHaveBeenCalled()
})
it('reviews revocation before an explicit confirmation', async () => {
  const result = show('revoke')
  await screen.findByText(/Its link will no longer grant access/)
  expect(api.revokeInvitation).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Resend invite' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Revoke invite' }))
  await waitFor(() => expect(api.revokeInvitation).toHaveBeenCalledExactlyOnceWith('invite'))
  await waitFor(() => expect(result.onClose).toHaveBeenCalledOnce())
})
it('shows expired access separately from delivery and retains resend failures', async () => {
  api.listInvitations.mockResolvedValue([{ ...invitation, isExpired: true }])
  api.resendInvitation.mockRejectedValueOnce(new Error('Invitation was sent recently. Wait before resending.'))
  show('resend')
  await screen.findByText('Invitation expired · Delivery: Accepted')
  fireEvent.click(screen.getByRole('button', { name: 'Resend invite' }))
  await screen.findByText('Invitation was sent recently. Wait before resending.')
  expect(api.listInvitations.mock.calls.length).toBeGreaterThan(1)
  expect(screen.getByText('Invitation expired · Delivery: Accepted')).toBeTruthy()
})
it('blocks resend after a hard bounce and offers safe cancellation', async () => {
  api.listInvitations.mockResolvedValue([{ ...invitation, hasHardBounce: true }])
  const result = show('resend')
  await screen.findByText(/Hard bounce: revoke this invitation/)
  expect(screen.getByRole('button', { name: 'Resend invite' })).toHaveProperty('disabled', true)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(result.onClose).toHaveBeenCalledOnce()
  expect(api.resendInvitation).not.toHaveBeenCalled()
})
