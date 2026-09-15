import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PhaenoSessionProvider, usePhaenoSession } from './session-context'
import { noSessionCapabilities } from '#/test-helpers/session'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getToken: vi.fn(), session: vi.fn() }))
vi.mock('@clerk/react', () => ({ useAuth: mocks.auth, ClerkProvider: ({ children }: { children: ReactNode }) => children, SignOutButton: ({ children }: { children: ReactNode }) => children, SignIn: () => null, TaskSetupMFA: () => null }))
vi.mock('#/api/client', () => ({ configureApiAuth: vi.fn() }))
vi.mock('#/api/session', () => ({ getSession: mocks.session }))
const orgKey = 'phaeno.selectedOrganizationId', departmentKey = 'phaeno.selectedDepartmentId'
const departments = [
  { departmentId: 'general', departmentName: 'General', departmentCode: 'GENERAL', isDefault: true, isDepartmentAdmin: true },
  { departmentId: 'research', departmentName: 'Research', departmentCode: 'RESEARCH', isDefault: false, isDepartmentAdmin: true },
]
const ready = { state: 'ready', user: { id: 'user', email: 'uat@example.test', firstName: 'UAT', lastName: 'Admin', status: 'Active' }, isPlatformAdmin: false,
  memberships: [{ membershipId: 'membership', organizationId: 'organization', organizationName: 'UAT', organizationKind: 'Customer', isOrganizationAdmin: true, departments }],
  selectedOrganization: { organizationId: 'organization', membershipId: 'membership', isAvailable: true }, selectedDepartment: null, capabilities: noSessionCapabilities }
const clients: QueryClient[] = []
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); localStorage.setItem(orgKey, 'organization'); localStorage.setItem(departmentKey, 'research'); mocks.session.mockResolvedValue(ready) })
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); localStorage.clear() })
function auth(isLoaded: boolean, isSignedIn?: boolean) { mocks.auth.mockReturnValue({ isLoaded, isSignedIn, userId: isSignedIn ? 'clerk-user' : undefined, getToken: mocks.getToken }) }
function Selected() { const session = usePhaenoSession(); return <output aria-label="Department">{session.selectedDepartmentId ?? 'none'}</output> }
function setup() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client); const tree = () => <StrictMode><QueryClientProvider client={client}><PhaenoSessionProvider><Selected /></PhaenoSessionProvider></QueryClientProvider></StrictMode>; const view = render(tree()); return () => view.rerender(tree()) }

it('preserves the chosen non-default Department while authentication initializes after a refresh', async () => {
  auth(false); const rerender = setup()
  expect(localStorage.getItem(departmentKey)).toBe('research')
  expect(mocks.session).not.toHaveBeenCalled()
  auth(true, true); rerender()
  await waitFor(() => expect(mocks.session).toHaveBeenCalled())
  await waitFor(() => expect(screen.getByLabelText('Department').textContent).toBe('research'))
  expect(localStorage.getItem(orgKey)).toBe('organization')
  expect(localStorage.getItem(departmentKey)).toBe('research')
})

it('clears remembered scope after authentication confirms sign-out', async () => {
  auth(false); const rerender = setup(); auth(true, false); rerender()
  await waitFor(() => expect(screen.getByLabelText('Department').textContent).toBe('none'))
  expect(localStorage.getItem(orgKey)).toBeNull(); expect(localStorage.getItem(departmentKey)).toBeNull()
})

it('replaces a remembered Department that is no longer permitted after session validation', async () => {
  mocks.session.mockResolvedValue({ ...ready, memberships: [{ ...ready.memberships[0], departments: [departments[0]] }] })
  auth(false); const rerender = setup(); auth(true, true); rerender()
  await waitFor(() => expect(screen.getByLabelText('Department').textContent).toBe('general'))
  expect(localStorage.getItem(departmentKey)).toBe('general')
})
