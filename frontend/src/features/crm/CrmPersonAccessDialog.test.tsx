import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { CrmCompanyPerson } from '#/api/crm'
import { CrmPersonAccessDialog } from './CrmPersonAccessDialog'

const api = vi.hoisted(() => ({ listOrganizationUsers: vi.fn(), listDepartments: vi.fn(), listInvitations: vi.fn(), resendInvitation: vi.fn(), revokeInvitation: vi.fn(), deactivateMembership: vi.fn() }))
vi.mock('#/api/organization-management', async importOriginal => ({ ...await importOriginal<typeof import('#/api/organization-management')>(), ...api }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ session: { user: { id: 'admin' } } }) }))
const person = { contactId: 'contact', displayName: 'Simulated Invitee', email: 'invited@example.test', invitationId: 'invite', portalUserId: null } as CrmCompanyPerson
const invitation = { id: 'invite', email: person.email, status: 'Pending', isExpired: false, deliveryStatus: 'Accepted', hasHardBounce: false, lastSendError: null }
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
  const deactivate = await screen.findByRole('button', { name: 'Deactivate membership' })
  deactivate.focus()
  fireEvent.click(deactivate)
  let review = screen.getByRole('region', { name: 'Confirm access change' })
  expect(within(review).getByText(/Simulated Invitee will lose access to this Company.*new invitation/)).toBeTruthy()
  fireEvent.click(within(review).getByRole('button', { name: 'Keep unchanged' }))
  expect(api.deactivateMembership).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(deactivate)
  fireEvent.click(deactivate)
  review = screen.getByRole('region', { name: 'Confirm access change' })
  fireEvent.click(within(review).getByRole('button', { name: 'Deactivate membership' }))
  await waitFor(() => expect(api.deactivateMembership).toHaveBeenCalledExactlyOnceWith('membership'))
  await screen.findByText('Membership inactive — a new invitation is required to restore access.')
  expect(screen.queryByRole('button', { name: /Reactivate|Restore/ })).toBeNull()
})

it('reviews the recipient and consequence before revocation, with cancel restoring focus', async () => {
  show()
  const revoke = await screen.findByRole('button', { name: 'Revoke invitation' })
  revoke.focus()
  fireEvent.click(revoke)
  let review = screen.getByRole('region', { name: 'Confirm access change' })
  expect(within(review).getByText(/invited@example.test.*current link will no longer grant access/)).toBeTruthy()
  expect(api.revokeInvitation).not.toHaveBeenCalled()
  fireEvent.click(within(review).getByRole('button', { name: 'Keep unchanged' }))
  expect(api.revokeInvitation).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(revoke)
  fireEvent.click(revoke)
  review = screen.getByRole('region', { name: 'Confirm access change' })
  api.listInvitations.mockResolvedValue([])
  fireEvent.click(within(review).getByRole('button', { name: 'Revoke invitation' }))
  await waitFor(() => expect(api.revokeInvitation).toHaveBeenCalledExactlyOnceWith('invite'))
  await screen.findByText(/No active membership or pending invitation/)
})

it('keeps pending access distinct from provider acceptance and reviews resend failures', async () => {
  api.resendInvitation.mockRejectedValueOnce(new Error('Invitation was sent recently. Wait before resending.'))
  show()
  expect(await screen.findByText('Pending · Delivery: Accepted')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Resend invitation' }))
  const review = screen.getByRole('region', { name: 'Confirm access change' })
  expect(within(review).getByText(/Send a renewed invitation to invited@example.test/)).toBeTruthy()
  expect(api.resendInvitation).not.toHaveBeenCalled()
  fireEvent.click(within(review).getByRole('button', { name: 'Resend invitation' }))
  await screen.findByText('Invitation was sent recently. Wait before resending.')
  expect(api.listInvitations.mock.calls.length).toBeGreaterThan(1)
  expect(screen.getByText('Pending · Delivery: Accepted')).toBeTruthy()
})

it('prevents resend after hard bounce and directs reviewed revoke then corrected reissue', async () => {
  api.listInvitations.mockResolvedValue([{ ...invitation, deliveryStatus: 'Bounced', hasHardBounce: true }])
  show()
  await screen.findByText(/Hard bounce: revoke this invitation, correct the Contact email/)
  expect(screen.getByRole('button', { name: 'Resend invitation' })).toHaveProperty('disabled', true)
  fireEvent.click(screen.getByRole('button', { name: 'Resend invitation' }))
  expect(api.resendInvitation).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Revoke invitation' }))
  expect(screen.getByRole('region', { name: 'Confirm access change' })).toBeTruthy()
  expect(api.revokeInvitation).not.toHaveBeenCalled()
})

it('shows expiration separately from queued delivery without inventing accepted access', async () => {
  api.listInvitations.mockResolvedValue([{ ...invitation, isExpired: true, deliveryStatus: 'Queued' }])
  show()
  await screen.findByText('Pending · Expired · Delivery: Queued')
  expect(screen.queryByText('Organization access')).toBeNull()
})
