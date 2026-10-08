import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AuthGate, MfaSetupAccessState, PhaenoSessionProvider } from './session-context'
import { CrmCompanyPeople } from '#/features/crm/CrmCompanyPeople'
import { noSessionCapabilities } from '#/test-helpers/session'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), session: vi.fn(), associate: vi.fn(), signIn: vi.fn(), mfa: vi.fn() }))
vi.mock('@clerk/react', () => ({
  useAuth: mocks.auth,
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  SignOutButton: ({ children }: { children: ReactNode }) => children,
  SignIn: (props: unknown) => { mocks.signIn(props); return <div>Simulated provider sign-in</div> },
  TaskSetupMFA: (props: unknown) => { mocks.mfa(props); return <div>Simulated provider MFA task</div> },
}))
vi.mock('#/api/client', () => ({ configureApiAuth: vi.fn() }))
vi.mock('#/api/session', () => ({ getSession: mocks.session }))
vi.mock('#/features/crm/use-crm-permissions', () => ({ useCrmPermissions: () => ({ canAccess: true, canAdminister: true }) }))
vi.mock('#/api/crm', async original => ({ ...await original<typeof import('#/api/crm')>(), listCompanyContacts: async () => [], associateCompanyContact: mocks.associate }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), Link: ({ children }: { children: ReactNode }) => <a href="/record">{children}</a> }))
vi.mock('#/features/crm/CrmAssociationRecordCombobox', () => ({ CrmAssociationRecordCombobox: ({ id, name }: { id: string; name: string }) => <input id={id} name={name} /> }))

const ready = { state: 'ready', user: { id: 'simulated', email: 'simulated@example.test', firstName: 'SIMULATED', lastName: 'Tester', status: 'Active' }, isPlatformAdmin: true,
  memberships: [], selectedOrganization: null, selectedDepartment: null, capabilities: noSessionCapabilities }
const clients: QueryClient[] = []
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); sessionStorage.clear(); mocks.session.mockResolvedValue(ready) })
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); localStorage.clear(); sessionStorage.clear() })
function auth(isLoaded: boolean, isSignedIn?: boolean) {
  mocks.auth.mockReturnValue({ isLoaded, isSignedIn, userId: isSignedIn ? 'simulated-provider-user' : undefined, getToken: async () => null })
}
function setup(children: ReactNode = <div>Protected record content</div>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  clients.push(client)
  const tree = () => <QueryClientProvider client={client}><PhaenoSessionProvider><AuthGate>{children}</AuthGate></PhaenoSessionProvider></QueryClientProvider>
  const view = render(tree())
  return { client, rerender: () => view.rerender(tree()) }
}

it('withholds protected content through authentication and access bootstrap, then uses the current root sign-in entry', async () => {
  auth(false)
  const { rerender } = setup()
  expect(screen.getByRole('status').textContent).toBe('Checking sign-in status.')
  expect(screen.queryByText('Protected record content')).toBeNull()
  expect(mocks.session).not.toHaveBeenCalled()
  auth(true, false); rerender()
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy()
  expect(mocks.signIn).toHaveBeenCalledWith(expect.objectContaining({ routing: 'hash', fallbackRedirectUrl: '/', withSignUp: false }))
  let resolve!: (value: typeof ready) => void
  mocks.session.mockImplementation(() => new Promise<typeof ready>(done => { resolve = done }))
  auth(true, true); rerender()
  expect(screen.getByRole('heading', { name: 'Loading access' })).toBeTruthy()
  expect(screen.queryByText('Protected record content')).toBeNull()
  await act(async () => { resolve(ready) })
  expect(await screen.findByText('Protected record content')).toBeTruthy()
})

it('keeps access-check failure closed without showing protected records', async () => {
  auth(true, true); mocks.session.mockRejectedValue(new Error('SIMULATED access failure'))
  setup()
  expect(await screen.findByRole('heading', { name: 'Access check failed' })).toBeTruthy()
  expect(screen.queryByText('Protected record content')).toBeNull()
})

it('does not grant access while the provider is pending required MFA and delegates enrollment to its task component', () => {
  // Clerk's pending session maps to isSignedIn=false. Actual enrollment is an external acceptance gate.
  auth(true, false)
  setup()
  expect(screen.queryByText('Protected record content')).toBeNull()
  expect(mocks.session).not.toHaveBeenCalled()
  render(<MfaSetupAccessState />)
  expect(screen.getByRole('heading', { name: 'Secure your Portal account' })).toBeTruthy()
  expect(mocks.mfa).toHaveBeenCalledWith({ redirectUrlComplete: '/' })
})

it('retains an unsaved association after a rejected 401 save, then discards it when confirmed sign-out unmounts the workspace', async () => {
  const config = { headers: new AxiosHeaders() }
  mocks.associate.mockRejectedValue(new AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', config, undefined,
    { status: 401, statusText: 'Unauthorized', headers: {}, config, data: { success: false, error: { message: 'An active portal user is required.' } } }))
  auth(true, true)
  const { rerender } = setup(<CrmCompanyPeople companyId="simulated-company" accessOrganizationId={null} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add existing person' })).toHaveProperty('disabled', false))
  fireEvent.click(screen.getByRole('button', { name: 'Add existing person' }))
  const dialog = within(screen.getByRole('dialog'))
  await waitFor(() => expect(dialog.getByRole('button', { name: 'Associate contact' })).toHaveProperty('disabled', false))
  fireEvent.change(dialog.getByLabelText(/^Contact/), { target: { value: 'simulated-contact' } })
  fireEvent.change(dialog.getByLabelText('Job title'), { target: { value: 'SIMULATED unsaved title' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Associate contact' }))
  expect(await dialog.findByRole('alert')).toHaveProperty('textContent', 'An active portal user is required.')
  expect(mocks.associate).toHaveBeenCalledExactlyOnceWith('simulated-company', expect.objectContaining({ contactId: 'simulated-contact', jobTitle: 'SIMULATED unsaved title' }))
  expect(dialog.getByLabelText('Job title')).toHaveProperty('value', 'SIMULATED unsaved title')
  expect(dialog.getByRole('button', { name: 'Associate contact' })).toHaveProperty('disabled', false)
  auth(true, false); rerender()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy()
  auth(true, true); rerender()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add existing person' })).toHaveProperty('disabled', false))
  fireEvent.click(screen.getByRole('button', { name: 'Add existing person' }))
  expect(within(screen.getByRole('dialog')).getByLabelText('Job title')).toHaveProperty('value', '')
  expect(mocks.associate).toHaveBeenCalledTimes(1)
})
