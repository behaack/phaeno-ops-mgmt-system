import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { Route } from '#/routes/session-tasks.setup-mfa'
import { readStoredInviteToken, storeInviteToken } from './invitation-storage'

const mocks = vi.hoisted(() => ({ session: vi.fn(), navigate: vi.fn(), mfa: vi.fn() }))

vi.mock('@clerk/react', () => ({
  useSession: mocks.session,
  TaskSetupMFA: (props: { redirectUrlComplete: string }) => {
    mocks.mfa(props)
    return <div>Authenticator setup</div>
  },
}))
vi.mock('@tanstack/react-router', async original => ({
  ...await original<typeof import('@tanstack/react-router')>(),
  Navigate: (props: { to: string; replace: boolean }) => {
    mocks.navigate(props)
    return null
  },
}))

const SetupMfaRoute = Route.options.component!

beforeEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
})
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

it('waits for the provider session before choosing a destination', () => {
  storeInviteToken('saved-invitation')
  mocks.session.mockReturnValue({ isLoaded: false, session: undefined })

  render(<SetupMfaRoute />)

  expect(mocks.navigate).not.toHaveBeenCalled()
  expect(mocks.mfa).not.toHaveBeenCalled()
  expect(readStoredInviteToken()).toBe('saved-invitation')
})

it.each([
  { token: 'saved-invitation', destination: '/accept-invite' },
  { token: null, destination: '/' },
])('keeps the task and route completion destinations aligned: $destination', ({ token, destination }) => {
  if (token) storeInviteToken(token)
  mocks.session.mockReturnValue({ isLoaded: true, session: { currentTask: { key: 'setup-mfa' } } })

  const view = render(<SetupMfaRoute />)

  expect(screen.getByRole('heading', { name: 'Secure your Portal account' })).toBeTruthy()
  expect(mocks.mfa).toHaveBeenLastCalledWith({ redirectUrlComplete: destination })
  expect(mocks.navigate).not.toHaveBeenCalled()

  // The provider can clear currentTask before its task component redirects.
  mocks.session.mockReturnValue({ isLoaded: true, session: { currentTask: null } })
  view.rerender(<SetupMfaRoute />)

  expect(screen.queryByText('Authenticator setup')).toBeNull()
  expect(mocks.navigate).toHaveBeenLastCalledWith({ to: destination, replace: true })
  expect(readStoredInviteToken()).toBe(token)
})

it('resumes the saved invitation when reopening an already completed setup page', () => {
  storeInviteToken('saved-invitation')
  mocks.session.mockReturnValue({ isLoaded: true, session: { currentTask: null } })

  render(<SetupMfaRoute />)

  expect(mocks.mfa).not.toHaveBeenCalled()
  expect(mocks.navigate).toHaveBeenLastCalledWith({ to: '/accept-invite', replace: true })
  expect(readStoredInviteToken()).toBe('saved-invitation')
})

it('preserves the invitation for sign-in when the provider session is absent', () => {
  storeInviteToken('saved-invitation')
  mocks.session.mockReturnValue({ isLoaded: true, session: null })

  render(<SetupMfaRoute />)

  expect(mocks.mfa).not.toHaveBeenCalled()
  expect(mocks.navigate).toHaveBeenLastCalledWith({ to: '/accept-invite', replace: true })
  expect(readStoredInviteToken()).toBe('saved-invitation')
})

it('returns to Portal when no provider session or saved invitation remains', () => {
  mocks.session.mockReturnValue({ isLoaded: true, session: null })

  render(<SetupMfaRoute />)

  expect(mocks.mfa).not.toHaveBeenCalled()
  expect(mocks.navigate).toHaveBeenLastCalledWith({ to: '/', replace: true })
})
