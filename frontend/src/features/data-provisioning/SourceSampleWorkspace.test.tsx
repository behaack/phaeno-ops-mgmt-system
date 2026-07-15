import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SourceSampleWorkspace } from './SourceSampleWorkspace'
import {
  PhaenoSessionContext,
  type PhaenoSessionContextValue,
} from '#/features/auth/session-context'

const mocks = vi.hoisted(() => ({
  archiveSource: vi.fn(),
  discardSourceDraft: vi.fn(),
  getSourceSample: vi.fn(),
  markSourceReady: vi.fn(),
  navigate: vi.fn(),
  updateSourceSample: vi.fn(),
  uploadSourceFile: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#back">{children}</a>,
  useNavigate: () => mocks.navigate,
}))

vi.mock('#/api/data-provisioning', () => ({
  archiveSource: mocks.archiveSource,
  discardSourceDraft: mocks.discardSourceDraft,
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
  getSourceSample: mocks.getSourceSample,
  markSourceReady: mocks.markSourceReady,
  updateSourceSample: mocks.updateSourceSample,
  uploadSourceFile: mocks.uploadSourceFile,
}))

describe('SourceSampleWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSourceSample.mockResolvedValue(createDraftSource())
    mocks.discardSourceDraft.mockResolvedValue(undefined)
    mocks.navigate.mockResolvedValue(undefined)
  })

  it('requires a reason and discards the current optimistic draft version', async () => {
    renderWorkspace()

    expect(
      await screen.findByRole('heading', { name: 'Synthetic source' }),
    ).toBeTruthy()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions' }), {
      button: 0,
      ctrlKey: false,
    })
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Discard draft' }),
    )

    const dialog = await screen.findByRole('dialog', {
      name: 'Discard “Synthetic source”?',
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Discard draft' }),
    )
    expect(await within(dialog).findByText('Reason is required.')).toBeTruthy()
    expect(mocks.discardSourceDraft).not.toHaveBeenCalled()

    fireEvent.change(within(dialog).getByLabelText(/reason/i), {
      target: { value: 'The synthetic draft is no longer needed.' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Discard draft' }),
    )

    await waitFor(() => {
      expect(mocks.discardSourceDraft).toHaveBeenCalledWith(
        'source-1',
        'The synthetic draft is no longer needed.',
        7,
      )
    })
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/data-provisioning' })
  })
})

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <PhaenoSessionContext.Provider value={createPlatformContext()}>
        <SourceSampleWorkspace sourceSampleId="source-1" />
      </PhaenoSessionContext.Provider>
    </QueryClientProvider>,
  )
}

function createDraftSource() {
  return {
    id: 'source-1',
    label: 'Synthetic source',
    description: 'Synthetic description',
    biologicalContext: 'Synthetic biological context',
    assayContext: 'Synthetic assay context',
    analysisSummary: 'Synthetic analysis',
    qcStatus: 'Pass',
    provenance: 'Generated fixture',
    isSynthetic: true,
    revision: 1,
    status: 'Draft' as const,
    ownershipBasis: 'Phaeno-created fixture',
    ownershipEvidenceReference: 'fixture:1',
    ownershipConfirmedByUserId: 'user-id',
    ownershipConfirmedAt: '2026-07-14T12:00:00Z',
    deidentificationMethod: 'No human data',
    deidentificationNotes: 'Not applicable',
    deidentificationConfirmedByUserId: 'user-id',
    deidentificationConfirmedAt: '2026-07-14T12:00:00Z',
    readyAt: null,
    archivedAt: null,
    files: [],
    createdAt: '2026-07-14T12:00:00Z',
    updatedAt: '2026-07-14T12:00:00Z',
    version: 7,
  }
}

function createPlatformContext(): PhaenoSessionContextValue {
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
