import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataLibraryPage } from './DataLibraryPage'
import {
  PhaenoSessionContext,
  type PhaenoSessionContextValue,
} from '#/features/auth/session-context'
import { noSessionCapabilities } from '#/test-helpers/session'

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
