import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Link, Outlet, RouterProvider } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '#/api/data-provisioning'
import { PortalConfirmation } from '#/components/PortalConfirmation'
import { DataProvisioningPage } from './DataProvisioningPage'

vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canViewDatasetConfiguration: true } } }) }))
vi.mock('#/api/data-provisioning', async original => ({ ...await original<typeof api>(), listDatasets: vi.fn(), listSourceSamples: vi.fn(), listOrganizations: vi.fn(), createSourceSample: vi.fn(), grantDataset: vi.fn() }))
vi.mock('#/api/organization-management', async original => ({ ...await original<typeof import('#/api/organization-management')>(), listDepartments: vi.fn().mockResolvedValue([]) }))
const organizationId = '11111111-1111-4111-8111-111111111111'
const versionId = '22222222-2222-4222-8222-222222222222'

function show(section: 'sources' | 'grants') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const root = createRootRoute({ component: () => <><Outlet /><PortalConfirmation /></> })
  const workspace = createRoute({ getParentRoute: () => root, path: '/', component: () => <><DataProvisioningPage section={section} onSectionChange={vi.fn()} /><Link to="/docs">Leave workspace</Link></> })
  const next = createRoute({ getParentRoute: () => root, path: '/docs', component: () => <p>Navigation completed</p> })
  const router = createRouter({ routeTree: root.addChildren([workspace, next]), history: createMemoryHistory({ initialEntries: ['/'] }) })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
  return router
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.listSourceSamples).mockResolvedValue([])
  vi.mocked(api.listOrganizations).mockResolvedValue([{ id: organizationId, name: 'Synthetic organization', kind: 'Customer' }] as Awaited<ReturnType<typeof api.listOrganizations>>)
  vi.mocked(api.listDatasets).mockResolvedValue([{ id: 'dataset', name: 'Synthetic package', isActive: true, eligibleVersionId: versionId,
    versions: [{ id: versionId, status: 'Published', versionNumber: 1 }] }] as api.CuratedDataset[])
})

describe('Data provisioning dialog lifecycle', () => {
  it('explicitly discards source registration and permits navigation after the dialog closes', async () => {
    show('sources')
    fireEvent.click(await screen.findByRole('button', { name: 'Register source' }))
    const dialog = screen.getByRole('dialog', { name: 'Register source sample' })
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Internal label/ }), { target: { value: 'Unsaved label' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('link', { name: 'Leave workspace' }))
    expect(await screen.findByText('Navigation completed')).toBeTruthy()
    expect(api.createSourceSample).not.toHaveBeenCalled()
  })

  it('keeps assignment open during a write, blocks navigation, and retains the draft on failure', async () => {
    let reject!: (reason: Error) => void
    vi.mocked(api.grantDataset).mockReturnValue(new Promise((_resolve, rejectWrite) => { reject = rejectWrite }))
    const router = show('grants')
    const open = await screen.findByRole('button', { name: 'Assign data' })
    await waitFor(() => expect(open).toHaveProperty('disabled', false))
    fireEvent.click(open)
    const dialog = screen.getByRole('dialog', { name: 'Assign curated sample data' })
    fireEvent.change(within(dialog).getByRole('combobox', { name: /^Organization/ }), { target: { value: organizationId } })
    fireEvent.change(within(dialog).getByRole('combobox', { name: /^Eligible package version/ }), { target: { value: versionId } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Assign exact version' }))
    await waitFor(() => expect(api.grantDataset).toHaveBeenCalledOnce())
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await act(async () => { void router.navigate({ to: '/docs' }) })
    expect(screen.queryByText('Navigation completed')).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Assign curated sample data' })).toBeTruthy()
    await act(async () => reject(new Error('Synthetic save failure')))
    await screen.findByRole('alert')
    expect(within(dialog).getByRole('combobox', { name: /^Eligible package version/ })).toHaveProperty('value', versionId)
  })
})
