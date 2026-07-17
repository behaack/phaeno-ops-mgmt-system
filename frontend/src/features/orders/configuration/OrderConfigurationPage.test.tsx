import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  PhaenoSessionContext,
  type PhaenoSessionContextValue,
} from '#/features/auth/session-context'
import { noSessionCapabilities } from '#/test-helpers/session'
import { OrderConfigurationPage } from './OrderConfigurationPage'

describe('OrderConfigurationPage', () => {
  it('moves all configuration subjects into the shared workspace sidebar', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <PhaenoSessionContext.Provider value={createPlatformContext()}>
          <OrderConfigurationPage />
        </PhaenoSessionContext.Provider>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Order configuration' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {
      name: 'Open Order configuration navigation; current selection: Defaults',
    }))

    expect(screen.getByRole('navigation', {
      name: 'Order configuration sections',
    })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Defaults/ }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: /^Analyses/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^PSeq kits/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Assembly/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Credit & QBO/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /^PSeq kits/ }))
    expect(screen.getByRole('button', {
      name: 'Open Order configuration navigation; current selection: PSeq kits',
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
      },
    },
    isLoading: false,
    error: null,
    selectedOrganizationId: 'phaeno-id',
    setSelectedOrganizationId: () => undefined,
  }
}
