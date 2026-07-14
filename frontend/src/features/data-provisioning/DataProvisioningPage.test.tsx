import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataProvisioningPage } from './DataProvisioningPage'
import {
  PhaenoSessionContext,
  type PhaenoSessionContextValue,
} from '#/features/auth/session-context'

describe('DataProvisioningPage', () => {
  it('shows the Phaeno configuration surfaces without calling the API in mock mode', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const context = createPlatformContext()

    render(
      <QueryClientProvider client={queryClient}>
        <PhaenoSessionContext.Provider value={context}>
          <DataProvisioningPage />
        </PhaenoSessionContext.Provider>
      </QueryClientProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Data provisioning' }),
    ).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Source registry' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Curated catalog' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Organization grants' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Register source' }),
    ).toHaveProperty('disabled', true)
  })
})

function createPlatformContext(): PhaenoSessionContextValue {
  return {
    authConfigured: true,
    authProvider: 'mock',
    clerkLoaded: true,
    signedIn: true,
    session: {
      state: 'ready',
      user: {
        id: 'user-id',
        email: 'admin@phaeno.com',
        firstName: 'Phaeno',
        lastName: 'Admin',
        status: 'Active',
      },
      memberships: [
        {
          membershipId: 'membership-id',
          organizationId: 'phaeno-id',
          organizationName: 'Phaeno',
          organizationKind: 'Phaeno',
          isOrganizationAdmin: true,
        },
      ],
      isPlatformAdmin: true,
      selectedOrganization: {
        organizationId: 'phaeno-id',
        membershipId: 'membership-id',
        isAvailable: true,
      },
      capabilities: {
        canInviteUsers: true,
        canManageMembers: true,
        canChangeMemberRoles: true,
        canLeaveOrganization: false,
        canManageOrganizations: true,
        canManageAllUsers: true,
        canDisableUsers: true,
        canViewDatasetConfiguration: true,
        canManageDatasetDrafts: true,
        canPublishDatasets: true,
        canProvisionOrganizationData: true,
        canViewOrganizationDatasets: false,
      },
    },
    isLoading: false,
    error: null,
    selectedOrganizationId: 'phaeno-id',
    setSelectedOrganizationId: () => undefined,
  }
}
