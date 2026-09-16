import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SourceSampleWorkspace } from './SourceSampleWorkspace'
import {
  PhaenoSessionContext,
  type PhaenoSessionContextValue,
} from '#/features/auth/session-context'
import { noSessionCapabilities } from '#/test-helpers/session'

const mocks = vi.hoisted(() => ({
  archiveSource: vi.fn(),
  discardSourceDraft: vi.fn(),
  getSourceSample: vi.fn(),
  markSourceReady: vi.fn(),
  retrySourceFileScan: vi.fn(),
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
  retrySourceFileScan: mocks.retrySourceFileScan,
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

  it.each([
    { status: 'Draft', scan: 'Pending', visible: true },
    { status: 'Draft', scan: 'Unavailable', visible: true },
    { status: 'Draft', scan: 'Rejected', visible: false },
    { status: 'Draft', scan: 'Clean', visible: false },
    { status: 'Ready', scan: 'Unavailable', visible: false },
  ])('limits scan retry to recoverable draft files ($status / $scan)', async ({ status, scan, visible }) => {
    mocks.getSourceSample.mockResolvedValue({ ...createDraftSource(), status, files: [scanFile(scan)] })
    renderWorkspace()
    await screen.findByRole('heading', { name: 'Synthetic source' })
    expect(Boolean(screen.queryByRole('button', { name: 'Retry scan for test.txt' }))).toBe(visible)
  })

  it('retries the saved bytes with the reviewed source version and preserves unsaved metadata without silently upgrading its version', async () => {
    mocks.getSourceSample.mockResolvedValue({ ...createDraftSource(), files: [scanFile('Unavailable')] })
    mocks.retrySourceFileScan.mockImplementation(async () => {
      const refreshed = { ...createDraftSource(), version: 8, files: [scanFile('Clean')] }
      mocks.getSourceSample.mockResolvedValue(refreshed)
      return refreshed
    })
    mocks.updateSourceSample.mockRejectedValue(new Error('concurrency conflict'))
    renderWorkspace()
    await screen.findByRole('heading', { name: 'Synthetic source' })
    fireEvent.change(screen.getByLabelText(/Sample description/), { target: { value: 'Unsaved description' } })
    fireEvent.click(screen.getByRole('button', { name: 'Retry scan for test.txt' }))
    await screen.findByText('Clean', { exact: true })
    expect(mocks.retrySourceFileScan).toHaveBeenCalledWith('source-1', 'file-1', 7)
    expect(screen.getByLabelText(/Sample description/)).toHaveProperty('value', 'Unsaved description')
    expect(screen.getByRole('button', { name: 'Mark ready' })).toHaveProperty('disabled', true)
    expect(screen.getByText('Save your draft changes before marking this source ready.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(mocks.updateSourceSample).toHaveBeenCalledWith('source-1', expect.objectContaining({ description: 'Unsaved description', version: 7 })))
    expect(screen.getByLabelText(/Sample description/)).toHaveProperty('value', 'Unsaved description')
  })

  it('requires a reason and discards the current optimistic draft version', async () => {
    renderWorkspace()

    expect(
      await screen.findByRole('heading', { name: 'Synthetic source' }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }))

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
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/data-provisioning', search: { section: 'sources' } })
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

function scanFile(scanStatus: string) {
  return { id: 'file-1', fileName: 'test.txt', fileKind: 'plain_text_fixture', contentType: 'text/plain', sizeBytes: 8, sha256: 'a'.repeat(64), scanStatus, scanMessage: null }
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
