import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AcceptInvitePage } from './AcceptInvitePage'
import type { SessionResponse } from '#/api/session'
import { readStoredInviteToken, storeInviteToken } from '#/features/auth/invitation-storage'
import { PhaenoSessionProvider, usePhaenoSession } from '#/features/auth/session-context'
import { noSessionCapabilities } from '#/test-helpers/session'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), user: vi.fn(), getToken: vi.fn(), getSession: vi.fn(),
  previewInvitation: vi.fn(), acceptInvitation: vi.fn(), declineInvitation: vi.fn(),
  configureApiAuth: vi.fn(), navigate: vi.fn(),
}))

vi.mock('#/api/client', () => ({ configureApiAuth: mocks.configureApiAuth }))
vi.mock('#/api/session', () => ({ getSession: mocks.getSession }))
vi.mock('#/api/invitations', () => ({
  previewInvitation: mocks.previewInvitation,
  acceptInvitation: mocks.acceptInvitation,
  declineInvitation: mocks.declineInvitation,
}))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('./InvitationAuthentication', () => ({ InvitationAuthentication: () => null }))
vi.mock('@clerk/react', () => ({
  useAuth: mocks.auth,
  useUser: mocks.user,
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  SignOutButton: ({ children }: { children: ReactNode }) => children,
  SignIn: () => null,
  TaskSetupMFA: () => null,
}))

const invitation = {
  firstName: 'Joe', lastName: 'Blow', email: 'invited@example.com',
  organizationName: 'Research University', expiresAt: '2026-12-01T00:00:00Z',
}
const unauthorizedSession: SessionResponse = {
  state: 'unauthorized', user: null, memberships: [], isPlatformAdmin: false,
  selectedOrganization: null, selectedDepartment: null, capabilities: noSessionCapabilities,
}
const acceptedSession: SessionResponse = {
  ...unauthorizedSession,
  state: 'ready',
  user: { id: 'internal-joe', email: invitation.email, firstName: 'Joe', lastName: 'Blow', status: 'Active' },
  memberships: [{
    membershipId: 'joe-membership', organizationId: 'university',
    organizationName: invitation.organizationName, organizationKind: 'Customer',
    isOrganizationAdmin: false,
    departments: [{
      departmentId: 'general', departmentName: 'General', departmentCode: 'GENERAL',
      isDefault: true, isDepartmentAdmin: false,
    }],
  }],
  selectedOrganization: { organizationId: 'university', membershipId: 'joe-membership', isAvailable: true },
  selectedDepartment: {
    departmentId: 'general', organizationId: 'university', isAvailable: true, isDepartmentAdmin: false,
  },
}

const clients: QueryClient[] = []
beforeEach(() => {
  vi.resetAllMocks()
  window.localStorage.clear()
  window.sessionStorage.clear()
  window.history.replaceState({}, '', '/accept-invite')
  mocks.auth.mockReturnValue({ isLoaded: true, isSignedIn: true, userId: 'clerk-joe', getToken: mocks.getToken })
  mocks.user.mockReturnValue({
    isLoaded: true,
    user: {
      primaryEmailAddress: { emailAddress: invitation.email },
      emailAddresses: [{ emailAddress: invitation.email, verification: { status: 'verified' } }],
    },
  })
  mocks.getSession.mockResolvedValue(unauthorizedSession)
  mocks.previewInvitation.mockResolvedValue(invitation)
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
})

function setup(children: ReactNode, isPreSessionRoute = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  clients.push(client)
  const tree = () => <QueryClientProvider client={client}>
    <PhaenoSessionProvider isPreSessionRoute={isPreSessionRoute}>{children}</PhaenoSessionProvider>
  </QueryClientProvider>
  const view = render(tree())
  return { client, rerender: () => view.rerender(tree()) }
}

function SessionStatus() {
  const session = usePhaenoSession()
  return <output aria-label="Current session">
    {session.session?.state ?? 'loading'}:{session.selectedOrganizationId ?? 'none'}:{session.selectedDepartmentId ?? 'none'}
  </output>
}

function StatefulWorkspace() {
  const session = usePhaenoSession()
  const [draft, setDraft] = useState('')
  return <>
    <label>Draft<input value={draft} onChange={event => setDraft(event.target.value)} /></label>
    <button onClick={() => session.setSelectedOrganizationId('another-organization')}>Select another organization</button>
    <button onClick={() => session.setSelectedDepartmentId?.('another-department')}>Select another department</button>
    <SessionStatus />
  </>
}

describe('invitation completion across session changes', () => {
  it('keeps Welcome after accepting the first membership and selecting its default department', async () => {
    let consumed = false
    storeInviteToken('test-invitation-token')
    mocks.getSession.mockImplementation(async () => consumed ? acceptedSession : unauthorizedSession)
    mocks.previewInvitation.mockImplementation(async () => {
      if (consumed) throw new Error('This invitation is unavailable.')
      return invitation
    })
    mocks.acceptInvitation.mockImplementation(async () => {
      consumed = true
      return { organizationName: invitation.organizationName, status: 'Accepted' }
    })
    const { client } = setup(<><AcceptInvitePage /><SessionStatus /></>, true)

    await screen.findByText('unauthorized:none:none')
    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))

    await screen.findByText('ready:university:general')
    await waitFor(() => expect(client.isFetching()).toBe(0))
    expect(screen.getByRole('heading', { name: 'Welcome to Portal' })).toBeTruthy()
    expect(screen.getByText('You now have access to Research University.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Open your invitation email' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'We couldn’t open this invitation' })).toBeNull()
    expect(readStoredInviteToken()).toBeNull()
    expect(mocks.acceptInvitation).toHaveBeenCalledExactlyOnceWith({
      token: 'test-invitation-token', firstName: 'Joe', lastName: 'Blow',
    })
    expect(mocks.previewInvitation).toHaveBeenCalledExactlyOnceWith('test-invitation-token')
    expect(client.getQueryData(['session', 'clerk-joe', 'university', 'general'])).toEqual(acceptedSession)

    fireEvent.click(screen.getByRole('button', { name: 'Open Portal' }))
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/' })
  })

  it('preserves pre-session state for tenant selection but clears it when the signed-in identity changes', async () => {
    const { rerender } = setup(<StatefulWorkspace />, true)
    await screen.findByText('unauthorized:none:none')
    fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'Invitation in progress' } })

    fireEvent.click(screen.getByRole('button', { name: 'Select another organization' }))
    await screen.findByText('unauthorized:another-organization:none')
    fireEvent.click(screen.getByRole('button', { name: 'Select another department' }))
    await screen.findByText('unauthorized:another-organization:another-department')
    expect((screen.getByLabelText('Draft') as HTMLInputElement).value).toBe('Invitation in progress')

    mocks.auth.mockReturnValue({ isLoaded: true, isSignedIn: true, userId: 'clerk-other', getToken: mocks.getToken })
    rerender()
    await waitFor(() => expect((screen.getByLabelText('Draft') as HTMLInputElement).value).toBe(''))
  })

  it('continues clearing workspace state on organization and department changes by default', async () => {
    setup(<StatefulWorkspace />)
    await screen.findByText('unauthorized:none:none')
    fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'Old organization draft' } })

    fireEvent.click(screen.getByRole('button', { name: 'Select another organization' }))
    await screen.findByText('unauthorized:another-organization:none')
    expect((screen.getByLabelText('Draft') as HTMLInputElement).value).toBe('')
    fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'Old department draft' } })

    fireEvent.click(screen.getByRole('button', { name: 'Select another department' }))
    await screen.findByText('unauthorized:another-organization:another-department')
    expect((screen.getByLabelText('Draft') as HTMLInputElement).value).toBe('')
  })
})
