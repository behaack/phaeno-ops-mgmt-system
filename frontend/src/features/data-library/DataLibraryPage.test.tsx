import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listDownloadHistory, listTenantDatasets, type DownloadAudit } from '#/api/data-provisioning'

import { DataLibraryPage } from './DataLibraryPage'
import {
  PhaenoSessionContext,
  type PhaenoSessionContextValue,
} from '#/features/auth/session-context'
import { noSessionCapabilities } from '#/test-helpers/session'

vi.mock('#/api/data-provisioning', async (importOriginal) => ({
  ...await importOriginal<typeof import('#/api/data-provisioning')>(),
  listDownloadHistory: vi.fn().mockResolvedValue([]),
  listTenantDatasets: vi.fn().mockResolvedValue([]),
  listTenantActivity: vi.fn().mockResolvedValue([]),
  listTenantGovernanceIncidents: vi.fn().mockResolvedValue([]),
}))

beforeEach(() => {
  vi.mocked(listDownloadHistory).mockReset().mockResolvedValue([])
  vi.mocked(listTenantDatasets).mockClear()
})

describe('DataLibraryPage', () => {
  it('explains that connected tenant data is paused in mock mode', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const sessionContext: PhaenoSessionContextValue = {
      authConfigured: true,
      authProvider: 'mock',
      clerkLoaded: true,
      signedIn: true,
      session: {
        state: 'ready',
        user: {
          id: 'user-id',
          email: 'member@example.com',
          firstName: 'Example',
          lastName: 'Member',
          status: 'Active',
        },
        memberships: [
          {
            membershipId: 'membership-id',
            organizationId: 'fd384baa-9ef7-40c7-8e36-71f948b9a3e1',
            organizationName: 'Example prospect',
            organizationKind: 'Prospect',
            isOrganizationAdmin: false,
          },
        ],
        isPlatformAdmin: false,
        selectedOrganization: {
          organizationId: 'fd384baa-9ef7-40c7-8e36-71f948b9a3e1',
          membershipId: 'membership-id',
          isAvailable: true,
        },
        capabilities: {
          ...noSessionCapabilities,
          canInviteUsers: false,
          canManageMembers: false,
          canChangeMemberRoles: false,
          canLeaveOrganization: true,
          canManageOrganizations: false,
          canManageAllUsers: false,
          canDisableUsers: false,
          canViewDatasetConfiguration: false,
          canManageDatasetDrafts: false,
          canPublishDatasets: false,
          canProvisionOrganizationData: false,
          canViewOrganizationDatasets: true,
        },
      },
      isLoading: false,
      error: null,
      selectedOrganizationId: 'fd384baa-9ef7-40c7-8e36-71f948b9a3e1',
      setSelectedOrganizationId: () => undefined,
    }

    render(
      <QueryClientProvider client={queryClient}>
        <PhaenoSessionContext.Provider value={sessionContext}>
          <DataLibraryPage />
        </PhaenoSessionContext.Provider>
      </QueryClientProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Data Library' }),
    ).toBeTruthy()
    expect(
      screen.getByText('Connected data is paused in mock-session mode'),
    ).toBeTruthy()
    expect(
      screen.queryByText('No sample data assigned yet'),
    ).toBeNull()
  })
})

function connectedContext(departmentId: string, isDepartmentAdmin: boolean, isOrganizationAdmin = false): PhaenoSessionContextValue {
  return {
    authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true,
    isLoading: false, error: null, selectedOrganizationId: 'organization', selectedDepartmentId: departmentId,
    setSelectedOrganizationId: () => undefined,
    session: {
      state: 'ready', user: { id: 'user', email: 'admin@example.test', firstName: 'Scope', lastName: 'Admin', status: 'Active' },
      memberships: [{ membershipId: 'membership', organizationId: 'organization', organizationName: 'Synthetic', organizationKind: 'Customer', isOrganizationAdmin }],
      isPlatformAdmin: false,
      selectedOrganization: { organizationId: 'organization', membershipId: 'membership', isAvailable: true },
      selectedDepartment: { departmentId, organizationId: 'organization', isAvailable: true, isDepartmentAdmin },
      capabilities: { ...noSessionCapabilities, canViewOrganizationDatasets: true },
    },
  }
}

function historyRow(email: string): DownloadAudit {
  return { id: email, datasetVersionId: 'version',
    userId: 'user', userEmail: email, kind: 'File', managedFileId: 'file', downloadedAt: '2026-09-04T12:00:00Z' }
}

function historyPage(context: PhaenoSessionContextValue, client: QueryClient) {
  return <QueryClientProvider client={client}><PhaenoSessionContext.Provider value={context}><DataLibraryPage /></PhaenoSessionContext.Provider></QueryClientProvider>
}

describe('department download history', () => {
  it('lets an assigned department admin load history with accurate legacy guidance', async () => {
    vi.mocked(listDownloadHistory).mockResolvedValue([historyRow('research@example.test')])
    render(historyPage(connectedContext('research', true), new QueryClient({ defaultOptions: { queries: { retry: false } } })))
    expect(await screen.findByText('research@example.test')).toBeTruthy()
    expect(screen.getByText('Department download history')).toBeTruthy()
    expect(screen.getByText(/unknown department are available to organization administrators/)).toBeTruthy()
    expect(listDownloadHistory).toHaveBeenCalledTimes(1)
  })

  it('keeps organization-admin access and explains legacy records', async () => {
    render(historyPage(connectedContext('research', false, true), new QueryClient({ defaultOptions: { queries: { retry: false } } })))
    await waitFor(() => expect(listDownloadHistory).toHaveBeenCalledTimes(1))
    expect(screen.getByText(/unknown department are also included for grants in this scope/)).toBeTruthy()
  })

  it('hides history and makes no history request for ordinary members', async () => {
    render(historyPage(connectedContext('research', false), new QueryClient({ defaultOptions: { queries: { retry: false } } })))
    await waitFor(() => expect(listTenantDatasets).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Department download history')).toBeNull()
    expect(listDownloadHistory).not.toHaveBeenCalled()
  })

  it('waits for matching server-confirmed department context during a switch', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const context = connectedContext('general', true, true)
    context.selectedDepartmentId = 'research'
    const page = render(historyPage(context, client))
    expect(screen.queryByText('Department download history')).toBeNull()
    expect(listDownloadHistory).not.toHaveBeenCalled()
    expect(listTenantDatasets).not.toHaveBeenCalled()
    page.rerender(historyPage(connectedContext('research', true, true), client))
    await waitFor(() => expect(listDownloadHistory).toHaveBeenCalledTimes(1))
  })

  it('removes previous department rows immediately while the next history request is pending', async () => {
    let resolveNext!: (rows: DownloadAudit[]) => void
    vi.mocked(listDownloadHistory).mockResolvedValueOnce([historyRow('general@example.test')])
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNext = resolve }))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    const page = render(historyPage(connectedContext('general', true), client))
    expect(await screen.findByText('general@example.test')).toBeTruthy()
    page.rerender(historyPage(connectedContext('research', true), client))
    expect(screen.queryByText('general@example.test')).toBeNull()
    await waitFor(() => expect(listDownloadHistory).toHaveBeenCalledTimes(2))
    await act(async () => resolveNext([historyRow('research@example.test')]))
    expect(await screen.findByText('research@example.test')).toBeTruthy()
    expect(screen.queryByText('general@example.test')).toBeNull()
    page.rerender(historyPage(connectedContext('research', false), client))
    expect(screen.queryByText('Department download history')).toBeNull()
    expect(screen.queryByText('research@example.test')).toBeNull()
  })
})
