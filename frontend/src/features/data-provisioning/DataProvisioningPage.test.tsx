import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataProvisioningPage } from './DataProvisioningPage'
import {
  PhaenoSessionContext,
  type PhaenoSessionContextValue,
} from '#/features/auth/session-context'
import { noSessionCapabilities } from '#/test-helpers/session'

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
    expect(
      screen.getByRole('button', { name: 'Register source' }),
    ).toHaveProperty('disabled', true)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open Data provisioning navigation; current selection: Source registry',
      }),
    )

    expect(
      screen.getByRole('navigation', { name: 'Data provisioning sections' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /^Source registry/ }).getAttribute('aria-current'),
    ).toBe('page')
    expect(
      screen.getByRole('button', { name: /^Curated catalog/ }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /^Organization grants/ }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Governance/ })).toBeTruthy()
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
        ...noSessionCapabilities,
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
