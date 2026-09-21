import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  PhaenoSessionContext,
  type PhaenoSessionContextValue,
} from '#/features/auth/session-context'
import { noSessionCapabilities } from '#/test-helpers/session'
import { OrderConfigurationPage } from './OrderConfigurationPage'

describe('OrderConfigurationPage', () => {
  it('moves all configuration subjects into the shared workspace sidebar', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const root = createRootRoute()
    const route = createRoute({ getParentRoute: () => root, path: '/order-configuration', component: OrderConfigurationPage })
    const router = createRouter({ routeTree: root.addChildren([route]), history: createMemoryHistory({ initialEntries: ['/order-configuration'] }) })

    render(
      <QueryClientProvider client={queryClient}>
        <PhaenoSessionContext.Provider value={createPlatformContext()}>
          <RouterProvider router={router} />
        </PhaenoSessionContext.Provider>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('heading', { name: 'Order Settings' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {
      name: 'Open Order Settings navigation; current selection: Quote & workflow',
    }))

    expect(screen.getByRole('navigation', {
      name: 'Order Settings sections',
    })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Quote & workflow/ }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: /^Analyses/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Sample types/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Lab Service offerings/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Sample shipping/ })).toBeNull()
    expect(screen.getByRole('button', { name: /^PSeq kits/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Assembly/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Legacy links/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^File retention/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^PSeq kits/ }))
    expect(await screen.findByRole('button', {
      name: 'Open Order Settings navigation; current selection: PSeq kits',
    })).toBeTruthy()
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
      memberships: [{
        membershipId: 'membership-id',
        organizationId: 'phaeno-id',
        organizationName: 'Phaeno',
        organizationKind: 'Phaeno',
        isOrganizationAdmin: true,
      }],
      isPlatformAdmin: true,
      selectedOrganization: {
        organizationId: 'phaeno-id',
        membershipId: 'membership-id',
        isAvailable: true,
      },
      capabilities: {
        ...noSessionCapabilities,
        canManageOrderConfiguration: true,
        canManageFileManagementConfiguration: true,
      },
    },
    isLoading: false,
    error: null,
    selectedOrganizationId: 'phaeno-id',
    setSelectedOrganizationId: () => undefined,
  }
}
