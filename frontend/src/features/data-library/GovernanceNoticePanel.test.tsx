import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '#/test-helpers/render-portal'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GovernanceNoticePanel } from './GovernanceNoticePanel'

const mocks = vi.hoisted(() => ({
  listTenantActivityPage: vi.fn(),
  listTenantGovernanceIncidentsPage: vi.fn(),
  submitTenantGovernanceAttestation: vi.fn(),
}))

vi.mock('#/api/data-provisioning', () => ({
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
  listTenantActivityPage: mocks.listTenantActivityPage,
  listTenantGovernanceIncidentsPage: mocks.listTenantGovernanceIncidentsPage,
  submitTenantGovernanceAttestation: mocks.submitTenantGovernanceAttestation,
}))

describe('GovernanceNoticePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listTenantActivityPage.mockResolvedValue(testRecordPage([]))
    mocks.listTenantGovernanceIncidentsPage.mockResolvedValue(testRecordPage([
      {
        id: 'incident-1',
        category: 'Deidentification',
        status: 'ConfirmedUnsafe',
        externalGuidance: 'Delete every downloaded affected copy.',
        attestationDueAt: '2026-07-21T23:59:59Z',
        organizationStatus: 'AwaitingAttestation',
        reminderCount: 1,
        lastRemindedAt: '2026-07-15T12:00:00Z',
        attestedAt: null,
        createdAt: '2026-07-14T12:00:00Z',
        version: 4,
      },
    ]))
    mocks.submitTenantGovernanceAttestation.mockResolvedValue({})
  })

  it('requires remediation details and submits the current incident version', async () => {
    renderPanel()

    expect(await screen.findByText('Action required for withdrawn curated data')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Submit attestation' }))

    const dialog = await screen.findByRole('dialog', { name: 'Submit remediation attestation' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit attestation' }))
    expect(await within(dialog).findByText('Remediation details are required.')).toBeTruthy()
    expect(mocks.submitTenantGovernanceAttestation).not.toHaveBeenCalled()

    fireEvent.change(within(dialog).getByLabelText(/remediation details/i), {
      target: { value: 'Deleted all local and shared copies and confirmed backup expiry.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit attestation' }))

    await waitFor(() => {
      expect(mocks.submitTenantGovernanceAttestation).toHaveBeenCalledWith({
        incidentId: 'incident-1',
        notes: 'Deleted all local and shared copies and confirmed backup expiry.',
        version: 4,
      })
    })
  })
})

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <GovernanceNoticePanel
        apiEnabled
        isOrganizationAdmin
        selectedOrganizationId="organization-1"
      />
    </QueryClientProvider>,
  )
}

function testRecordPage<T>(items: T[]) { return { items, totalCount: items.length, page: 1, pageSize: 25 } }
