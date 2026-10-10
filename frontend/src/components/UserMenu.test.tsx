import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { UserMenu } from './UserMenu'
import { PhaenoSessionContext } from '#/features/auth/session-context'
import type { SessionResponse } from '#/api/session'

const mocks = vi.hoisted(() => ({
  router: { navigate: vi.fn(), state: { location: { pathname: '/docs' } } },
  selectOrganization: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => mocks.router,
  useRouterState: () => '/docs',
  Link: () => null,
}))
vi.mock('./MobileUserMenu', () => ({ MobileUserMenu: () => null }))
vi.mock('./theme-mode', () => ({ useThemeMode: () => ({ mode: 'auto', setMode: vi.fn() }) }))
vi.mock('./navigation', () => ({
  canManageUserScope: () => false,
  getVisibleMainMenuItems: () => [],
  isMainMenuRouteActive: () => false,
}))

const memberships = [
  { membershipId: 'm1', organizationId: 'phaeno', organizationName: 'Phaeno', organizationKind: 'Phaeno' as const, isOrganizationAdmin: true },
  { membershipId: 'm2', organizationId: 'customer', organizationName: 'My Customer', organizationKind: 'Customer' as const, isOrganizationAdmin: true },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  mocks.router.state.location.pathname = '/docs'
  mocks.router.navigate.mockImplementation(async () => { mocks.router.state.location.pathname = '/' })
})

afterEach(() => vi.unstubAllGlobals())

function openMenu(count = 2) {
  const session = { state: 'ready', memberships: memberships.slice(0, count), capabilities: {} } as SessionResponse
  render(<PhaenoSessionContext.Provider value={{
    authConfigured: true, authProvider: 'mock', clerkLoaded: true, signedIn: true,
    session, isLoading: false, error: null, selectedOrganizationId: 'phaeno',
    setSelectedOrganizationId: mocks.selectOrganization,
  }}><UserMenu /></PhaenoSessionContext.Provider>)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Open user menu' }), { key: 'Enter' })
}

it('offers only the account memberships and changes scope after reaching Dashboard', async () => {
  openMenu()
  const selector = await screen.findByRole('combobox', { name: 'Organization' })
  expect(screen.getAllByRole('option')).toHaveLength(2)
  expect(screen.getByRole('option', { name: 'Phaeno' })).toBeTruthy()
  fireEvent.change(selector, { target: { value: 'customer' } })
  await waitFor(() => expect(mocks.selectOrganization).toHaveBeenCalledWith('customer'))
  expect(mocks.router.navigate).toHaveBeenCalledWith({ to: '/' })
  expect(mocks.router.navigate.mock.invocationCallOrder[0]).toBeLessThan(mocks.selectOrganization.mock.invocationCallOrder[0])
})

it('retains the organization when a dirty-page navigation blocker cancels', async () => {
  mocks.router.navigate.mockImplementation(async () => {})
  openMenu()
  fireEvent.change(await screen.findByRole('combobox', { name: 'Organization' }), { target: { value: 'customer' } })
  await waitFor(() => expect(mocks.router.navigate).toHaveBeenCalled())
  expect(mocks.selectOrganization).not.toHaveBeenCalled()
})

it('omits organization selection for a single membership', () => {
  openMenu(1)
  expect(screen.queryByRole('combobox', { name: 'Organization' })).toBeNull()
})
