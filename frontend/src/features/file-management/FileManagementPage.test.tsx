import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReleasedDeliverablePolicyConfiguration } from '#/api/file-management'
import {
  PhaenoSessionContext,
  type PhaenoSessionContextValue,
} from '#/features/auth/session-context'
import { noSessionCapabilities } from '#/test-helpers/session'

import { FileManagementPage } from './FileManagementPage'

const api = vi.hoisted(() => ({
  getPolicy: vi.fn(),
  updatePolicy: vi.fn(),
}))

vi.mock('#/api/file-management', () => ({
  fileManagementErrorMessage: (_error: unknown, fallback: string) => fallback,
  getReleasedDeliverablePolicy: api.getPolicy,
  updateReleasedDeliverablePolicy: api.updatePolicy,
}))

describe('FileManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getPolicy.mockResolvedValue(configuration)
    api.updatePolicy.mockResolvedValue(configuration)
  })

  it('shows the global defaults and records a reasoned replacement revision', async () => {
    renderPage(platformSession())

    expect(await screen.findByRole('heading', { name: 'Global released-deliverable policy' })).toBeTruthy()
    expect(screen.getByText('30 days')).toBeTruthy()
    expect(screen.getAllByText('5 days')).toHaveLength(2)
    expect(screen.getByText('Revision 1')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Edit global policy' }))
    fireEvent.change(screen.getByLabelText(/Standard retention/), { target: { value: '45' } })
    fireEvent.change(screen.getByLabelText(/Change reason/), {
      target: { value: 'Extend the standard pilot access window.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(api.updatePolicy).toHaveBeenCalledWith({
      standardRetentionDays: 45,
      undownloadedWarningLeadDays: 5,
      undownloadedGraceDays: 5,
      reason: 'Extend the standard pilot access window.',
      version: 1,
    }))
  })

  it('does not load configuration for a user without the management capability', () => {
    renderPage({
      ...platformSession(),
      session: {
        ...platformSession().session!,
        capabilities: noSessionCapabilities,
      },
    })

    expect(screen.getByText('A Phaeno platform administrator is required.')).toBeTruthy()
    expect(api.getPolicy).not.toHaveBeenCalled()
  })
})

function renderPage(session: PhaenoSessionContextValue) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <PhaenoSessionContext.Provider value={session}>
        <FileManagementPage />
      </PhaenoSessionContext.Provider>
    </QueryClientProvider>,
  )
}

function platformSession(): PhaenoSessionContextValue {
  return {
    authConfigured: true,
    authProvider: 'clerk',
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
        canManageFileManagementConfiguration: true,
      },
    },
    isLoading: false,
    error: null,
    selectedOrganizationId: 'phaeno-id',
    setSelectedOrganizationId: () => undefined,
  }
}

const configuration: ReleasedDeliverablePolicyConfiguration = {
  global: {
    id: '11111111-1111-4111-8111-111111111111',
    revision: 1,
    values: {
      standardRetentionDays: 30,
      undownloadedWarningLeadDays: 5,
      undownloadedGraceDays: 5,
    },
    changeReason: 'Initial standard policy.',
    supersedesPolicyId: null,
    isActive: true,
    deactivatedAt: null,
    deactivatedByUserId: null,
    deactivationReason: null,
    createdAt: '2026-08-19T02:00:00Z',
    createdByUserId: 'user-id',
    version: 1,
  },
  globalHistory: [],
}
