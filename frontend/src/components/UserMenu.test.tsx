import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { UserMenu } from './UserMenu'
import { PhaenoSessionContext } from '#/features/auth/session-context'
import type { SessionResponse } from '#/api/session'

const mocks = vi.hoisted(() => ({
  router: { navigate: vi.fn(), state: { location: { pathname: '/docs', state: {} as { phaenoScopeChange?: string } } } },
  selectOrganization: vi.fn(),
  selectDepartment: vi.fn(),
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
  { membershipId: 'm1', organizationId: 'phaeno', organizationName: 'Phaeno', organizationKind: 'Phaeno' as const, isOrganizationAdmin: true,
    departments: ['general', 'research'].map(departmentId => ({ departmentId, departmentName: departmentId === 'general' ? 'General' : 'Research', departmentCode: departmentId, isDefault: departmentId === 'general', isDepartmentAdmin: false })) },
  { membershipId: 'm2', organizationId: 'customer', organizationName: 'My Customer', organizationKind: 'Customer' as const, isOrganizationAdmin: true },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  mocks.router.state.location.pathname = '/docs'
  mocks.router.state.location.state = {}
  mocks.router.navigate.mockImplementation(async (options: { state: (previous: object) => { phaenoScopeChange: string } }) => {
    mocks.router.state.location.pathname = '/'
    mocks.router.state.location.state = options.state(mocks.router.state.location.state)
  })
})

afterEach(() => vi.unstubAllGlobals())

function openMenu(count = 2) {
  const session = { state: 'ready', memberships: memberships.slice(0, count), capabilities: {} } as SessionResponse
  render(<PhaenoSessionContext.Provider value={{
    authConfigured: true, authProvider: 'mock', clerkLoaded: true, signedIn: true,
    session, isLoading: false, error: null, selectedOrganizationId: 'phaeno',
    setSelectedOrganizationId: mocks.selectOrganization,
    selectedDepartmentId: 'general', setSelectedDepartmentId: mocks.selectDepartment,
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
  expect(mocks.router.navigate).toHaveBeenCalledWith({ to: '/', state: expect.any(Function) })
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

it('retains organization scope when a blocker cancels a switch already on Dashboard', async () => {
  mocks.router.state.location.pathname = '/'
  mocks.router.navigate.mockImplementation(async () => {})
  openMenu()
  fireEvent.change(await screen.findByRole('combobox', { name: 'Organization' }), { target: { value: 'customer' } })
  await waitFor(() => expect(mocks.router.navigate).toHaveBeenCalled())
  expect(mocks.selectOrganization).not.toHaveBeenCalled()
})

it('runs navigation guards before changing Department', async () => {
  openMenu()
  fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Research' }))
  await waitFor(() => expect(mocks.selectDepartment).toHaveBeenCalledWith('research'))
  expect(mocks.router.navigate.mock.invocationCallOrder[0]).toBeLessThan(mocks.selectDepartment.mock.invocationCallOrder[0])
})

it('retains Department scope when its navigation is cancelled', async () => {
  mocks.router.navigate.mockImplementation(async () => {})
  openMenu()
  fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Research' }))
  await waitFor(() => expect(mocks.router.navigate).toHaveBeenCalled())
  expect(mocks.selectDepartment).not.toHaveBeenCalled()
})

it('permits a later scope attempt when cancelled navigation leaves its promise pending', async () => {
  mocks.router.navigate.mockImplementationOnce(() => new Promise<void>(() => {}))
  openMenu()
  fireEvent.change(await screen.findByRole('combobox', { name: 'Organization' }), { target: { value: 'customer' } })
  await waitFor(() => expect(mocks.router.navigate).toHaveBeenCalledTimes(1))
  fireEvent.keyDown(screen.getByRole('button', { name: 'Open user menu' }), { key: 'Enter' })
  fireEvent.change(await screen.findByRole('combobox', { name: 'Organization' }), { target: { value: 'customer' } })
  await waitFor(() => expect(mocks.selectOrganization).toHaveBeenCalledWith('customer'))
})
