import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { CrmCompanyPerson } from '#/api/crm'
import { CrmPersonAccessDialog } from './CrmPersonAccessDialog'

const api = vi.hoisted(() => ({ listOrganizationUsers: vi.fn(), listDepartments: vi.fn(), listInvitations: vi.fn(), resendInvitation: vi.fn(), revokeInvitation: vi.fn(), deactivateMembership: vi.fn(), updateMembershipRole: vi.fn() }))
vi.mock('#/api/organization-management', async importOriginal => ({ ...await importOriginal<typeof import('#/api/organization-management')>(), ...api }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ session: { user: { id: 'admin' } } }) }))
const person = { contactId: 'contact', displayName: 'Simulated Invitee', email: 'invited@example.test', invitationId: 'invite', portalUserId: null } as CrmCompanyPerson
const invitation = { organizationId: 'organization', firstName: 'Simulated', lastName: 'Invitee', version: 2, isOrganizationAdmin: false, departments: [{ departmentId: 'research', departmentName: 'Research', isDepartmentAdmin: true }], id: 'invite', email: person.email, status: 'Pending', isExpired: false, deliveryStatus: 'Accepted', hasHardBounce: false, lastSendError: null }
beforeEach(() => {
  vi.resetAllMocks()
  api.listOrganizationUsers.mockResolvedValue([])
  api.listDepartments.mockResolvedValue([{ id: 'research', name: 'Research', isActive: true }])
  api.listInvitations.mockResolvedValue([invitation])
  api.resendInvitation.mockResolvedValue(undefined)
  api.revokeInvitation.mockResolvedValue(undefined)
})
afterEach(cleanup)
function show(selectedPerson = person) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><CrmPersonAccessDialog organizationId="organization" person={selectedPerson} onClose={vi.fn()} /></QueryClientProvider>)
}

it('reviews membership-only deactivation and requires a new invitation before restoration', async () => {
  const membership = { id: 'membership', organizationId: 'organization', isActive: true, isOrganizationAdmin: false, departments: [] }
  api.listInvitations.mockResolvedValue([])
  api.listOrganizationUsers.mockResolvedValue([{ id: 'member', memberships: [membership] }])
  api.deactivateMembership.mockImplementation(async () => { api.listOrganizationUsers.mockResolvedValue([{ id: 'member', memberships: [{ ...membership, isActive: false }] }]) })
  show({ ...person, portalUserId: 'member', invitationId: null })
  const deactivate = await screen.findByRole('button', { name: 'Actions' })
  deactivate.focus()
  fireEvent.keyDown(deactivate, { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate membership' }))
  let review = screen.getByRole('region', { name: 'Confirm access change' })
  expect(within(review).getByText(/Simulated Invitee will lose access to this Company.*new invitation/)).toBeTruthy()
  fireEvent.click(within(review).getByRole('button', { name: 'Keep unchanged' }))
  expect(api.deactivateMembership).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(deactivate)
  fireEvent.keyDown(deactivate, { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate membership' }))
  review = screen.getByRole('region', { name: 'Confirm access change' })
  fireEvent.click(within(review).getByRole('button', { name: 'Deactivate membership' }))
  await waitFor(() => expect(api.deactivateMembership).toHaveBeenCalledExactlyOnceWith('membership'))
  await screen.findByText('Membership inactive — a new invitation is required to restore access.')
  expect(screen.queryByRole('button', { name: /Reactivate|Restore/ })).toBeNull()
})

it('changes an active role directly and never offers invitation controls', async () => {
  api.listOrganizationUsers.mockResolvedValue([{ id: 'member', memberships: [{ id: 'membership', organizationId: 'organization', isActive: true, isOrganizationAdmin: false, departments: [] }] }])
  api.updateMembershipRole.mockResolvedValue(undefined)
  show({ ...person, portalUserId: 'member', invitationId: null })
  await screen.findByRole('heading', { name: 'Manage access' })
  fireEvent.keyDown(await screen.findByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Make Organization administrator' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save role' }))
  await waitFor(() => expect(api.updateMembershipRole).toHaveBeenCalledExactlyOnceWith('membership', true))
  await screen.findByText(/Access updated. An informational email has been queued/)
  expect(api.listInvitations).not.toHaveBeenCalled()
  expect(api.resendInvitation).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: /Resend|Revoke/ })).toBeNull()
})