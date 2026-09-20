import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { AcceptInvitePage } from './AcceptInvitePage'
import { readStoredInviteToken, storeInviteToken, readInviteRegistrationTicket } from '#/features/auth/invitation-storage'

const mocks = vi.hoisted(() => ({
  previewInvitation: vi.fn(), acceptInvitation: vi.fn(), declineInvitation: vi.fn(),
  session: vi.fn(), user: vi.fn(), signIn: vi.fn(), navigate: vi.fn(),
}))
vi.mock('#/api/invitations', () => mocks)
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: mocks.session }))
vi.mock('./InvitationAuthentication', () => ({ InvitationAuthentication: ({ invitation }: { invitation: { email: string } }) => <button onClick={() => mocks.signIn(invitation.email)}>Continue with {invitation.email}</button> }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('@clerk/react', () => ({
  useUser: mocks.user,
  SignIn: (props: { initialValues: { emailAddress: string } }) => {
    mocks.signIn(props)
    return <input aria-label="Email address" defaultValue={props.initialValues.emailAddress} />
  },
  SignOutButton: ({ children }: { children: ReactNode }) => children,
}))
const invitation = { version: 4, isOrganizationAdmin: false, departments: [{ departmentId: 'research', departmentName: 'Research', isDepartmentAdmin: false }], firstName: 'Joe', lastName: 'Blow', email: 'invited@example.com', organizationName: 'Research University', expiresAt: '2026-12-01T00:00:00Z' }
const signedOut = { authConfigured: true, clerkLoaded: true, signedIn: false, authProvider: 'clerk', session: null }
beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  window.history.replaceState({}, '', '/accept-invite')
  storeInviteToken('test-invitation-token')
  mocks.session.mockReturnValue(signedOut)
  mocks.user.mockReturnValue({ isLoaded: true, user: { primaryEmailAddress: { emailAddress: invitation.email }, emailAddresses: [{ emailAddress: invitation.email, verification: { status: 'verified' } }] } })
  mocks.previewInvitation.mockResolvedValue(invitation)
  mocks.acceptInvitation.mockResolvedValue({ organizationName: invitation.organizationName })
  mocks.declineInvitation.mockResolvedValue({})
})
afterEach(cleanup)
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><AcceptInvitePage /></QueryClientProvider>)
  return client
}

describe('invitation acceptance', () => {
  it('shows known identity and passes the fixed email to authentication without accepting', async () => {
    const client = setup()
    await screen.findByRole('heading', { name: 'Joe, you’re invited to Research University' })
    fireEvent.click(screen.getByRole('button', { name: `Continue with ${invitation.email}` }))
    expect(screen.queryByLabelText('Email address')).toBeNull()
    expect(mocks.signIn).toHaveBeenCalledWith(invitation.email)
    expect(mocks.acceptInvitation).not.toHaveBeenCalled()
    expect(JSON.stringify(client.getQueryCache().getAll().map(query => query.queryKey))).not.toContain('test-invitation-token')
    expect(readStoredInviteToken()).toBe('test-invitation-token')
  })
  it('captures a newer URL token, strips it, and restores it after a page reload', async () => {
    window.history.replaceState({ key: 'retained' }, '', '/accept-invite?token=new-test-token')
    setup()
    await screen.findByText('Joe Blow')
    expect(mocks.previewInvitation).toHaveBeenCalledWith('new-test-token')
    expect(window.location.search).toBe('')
    expect(window.history.state).toEqual({ key: 'retained' })
    cleanup()
    setup()
    await screen.findByText('Joe Blow')
    expect(readStoredInviteToken()).toBe('new-test-token')
  })
  it('captures and scrubs a provider ticket, binds it to the saved invitation, and clears it on replacement', async () => {
    window.history.replaceState({}, '', '/accept-invite?__clerk_ticket=private-ticket&__clerk_status=sign_up')
    const client = setup()
    await screen.findByText('Joe Blow')
    expect(window.location.search).toBe('')
    expect(readInviteRegistrationTicket()).toBe('private-ticket')
    expect(JSON.stringify(client.getQueryCache().getAll().map(query => query.queryKey))).not.toContain('private-ticket')
    storeInviteToken('replacement-invitation')
    expect(readInviteRegistrationTicket()).toBeNull()
  })
  it('blocks an account without the verified invited email', async () => {
    mocks.session.mockReturnValue({ ...signedOut, signedIn: true })
    mocks.user.mockReturnValue({ isLoaded: true, user: { primaryEmailAddress: { emailAddress: 'other@example.com' }, emailAddresses: [{ emailAddress: 'other@example.com', verification: { status: 'verified' } }] } })
    setup()
    await screen.findByText('Use your invited account')
    expect(screen.getByRole('button', { name: 'Switch account' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).toBeNull()
    expect(mocks.acceptInvitation).not.toHaveBeenCalled()
    expect(readStoredInviteToken()).toBe('test-invitation-token')
    expect(readStoredInviteToken()).toBe('test-invitation-token')
  })
  it('accepts explicitly with a verified secondary email and the known name', async () => {
    mocks.session.mockReturnValue({ ...signedOut, signedIn: true })
    mocks.user.mockReturnValue({ isLoaded: true, user: { primaryEmailAddress: { emailAddress: 'primary@example.com' }, emailAddresses: [{ emailAddress: invitation.email.toUpperCase(), verification: { status: 'verified' } }] } })
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))
    expect(screen.queryByLabelText(/First name/)).toBeNull()
    await screen.findByRole('heading', { name: 'Welcome to Portal' })
    expect(mocks.acceptInvitation).toHaveBeenCalledWith({ token: 'test-invitation-token', firstName: 'Joe', lastName: 'Blow', version: 4 })
    expect(readStoredInviteToken()).toBeNull()
  })
  it('does not treat an unverified invited address as a match', async () => {
    mocks.session.mockReturnValue({ ...signedOut, signedIn: true })
    mocks.user.mockReturnValue({ isLoaded: true, user: { primaryEmailAddress: { emailAddress: invitation.email }, emailAddresses: [{ emailAddress: invitation.email, verification: { status: 'unverified' } }] } })
    setup()
    await screen.findByText('Use your invited account')
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).toBeNull()
  })
  it('provides recovery without opening sign-in when the link is unavailable', async () => {
    mocks.previewInvitation.mockRejectedValue(new Error('This invitation is unavailable.'))
    setup()
    await screen.findByRole('alert')
    expect(screen.queryByRole('button', { name: /Continue with/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(mocks.previewInvitation).toHaveBeenCalledTimes(2))
    expect(mocks.signIn).not.toHaveBeenCalled()
  })
  it('keeps the invitation available after acceptance fails', async () => {
    mocks.session.mockReturnValue({ ...signedOut, signedIn: true })
    mocks.acceptInvitation.mockRejectedValue(new Error('Invitation expired.'))
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))
    await screen.findByText('Invitation expired.')
    expect(readStoredInviteToken()).toBe('test-invitation-token')
  })
  it('declines only on an explicit click and clears the saved invitation', async () => {
    mocks.session.mockReturnValue({ ...signedOut, signedIn: true })
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Decline invitation' }))
    await screen.findByRole('heading', { name: 'Invitation declined' })
    expect(mocks.declineInvitation).toHaveBeenCalledWith('test-invitation-token')
    expect(readStoredInviteToken()).toBeNull()
  })
  it('explains a missing link without calling the preview API', async () => {
    window.sessionStorage.clear()
    setup()
    await screen.findByRole('heading', { name: 'Open your invitation email' })
    expect(mocks.previewInvitation).not.toHaveBeenCalled()
  })
})

it('requires explicit acceptance again after access changed since the recipient review', async () => {
  mocks.session.mockReturnValue({ ...signedOut, signedIn: true })
  mocks.acceptInvitation.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } })
  setup()
  await screen.findByRole('button', { name: 'Accept invitation' })
  mocks.previewInvitation.mockResolvedValue({ ...invitation, version: 5, isOrganizationAdmin: true })
  fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }))
  await screen.findByText(/The invitation changed. Review the updated access/)
  await screen.findByText('Organization administrator — all departments')
  expect(mocks.acceptInvitation).toHaveBeenCalledTimes(1)
  expect(readStoredInviteToken()).toBe('test-invitation-token')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Accept invitation' })).toHaveProperty('disabled', false))
  fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }))
  await screen.findByRole('heading', { name: 'Welcome to Portal' })
  expect(mocks.acceptInvitation).toHaveBeenLastCalledWith({ token: 'test-invitation-token', firstName: 'Joe', lastName: 'Blow', version: 5 })
})