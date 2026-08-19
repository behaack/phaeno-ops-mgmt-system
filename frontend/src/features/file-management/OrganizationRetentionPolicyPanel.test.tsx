import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OrganizationReleasedDeliverablePolicy } from '#/api/file-management'

import { OrganizationRetentionPolicyPanel } from './OrganizationRetentionPolicyPanel'

const api = vi.hoisted(() => ({
  getPolicy: vi.fn(),
  removeOverride: vi.fn(),
  upsertOverride: vi.fn(),
}))

vi.mock('#/api/file-management', () => ({
  fileManagementErrorMessage: (_error: unknown, fallback: string) => fallback,
  getOrganizationReleasedDeliverablePolicy: api.getPolicy,
  removeOrganizationReleasedDeliverablePolicyOverride: api.removeOverride,
  upsertOrganizationReleasedDeliverablePolicyOverride: api.upsertOverride,
}))

describe('OrganizationRetentionPolicyPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getPolicy.mockResolvedValue(configuration)
    api.upsertOverride.mockResolvedValue(configuration)
    api.removeOverride.mockResolvedValue({ ...configuration, override: null })
  })

  it('shows partial inheritance and saves only the organization-specific values', async () => {
    renderPanel()

    expect(await screen.findByRole('heading', { name: 'Released-deliverable retention' })).toBeTruthy()
    expect(screen.getAllByText('Organization override')).toHaveLength(1)
    expect(screen.getAllByText('Global')).toHaveLength(2)
    expect(screen.getByText('Active override revision 1. Blank override fields inherit the current global value.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Edit override' }))
    fireEvent.change(screen.getByLabelText(/Change reason/), {
      target: { value: 'Keep the customer retention exception current.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(api.upsertOverride).toHaveBeenCalledWith(
      configuration.organizationId,
      {
        standardRetentionDays: 45,
        undownloadedWarningLeadDays: null,
        undownloadedGraceDays: null,
        reason: 'Keep the customer retention exception current.',
        globalVersion: 1,
        overrideVersion: 1,
      },
    ))
  })

  it('requires a reason and removes the active override explicitly', async () => {
    renderPanel()

    await screen.findByRole('heading', { name: 'Released-deliverable retention' })
    fireEvent.click(screen.getByRole('button', { name: 'Remove override' }))
    const removeButton = screen.getByRole('button', { name: 'Remove override' })
    fireEvent.click(removeButton)

    expect(await screen.findByText('Enter a reason for removing this override.')).toBeTruthy()
    expect(api.removeOverride).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Change reason/), {
      target: { value: 'Return this account to the global policy.' },
    })
    fireEvent.click(removeButton)

    await waitFor(() => expect(api.removeOverride).toHaveBeenCalledWith(
      configuration.organizationId,
      {
        reason: 'Return this account to the global policy.',
        version: 1,
      },
    ))
  })
})

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <OrganizationRetentionPolicyPanel
        enabled
        organizationId={configuration.organizationId}
        organizationName={configuration.organizationName}
      />
    </QueryClientProvider>,
  )
}

const configuration: OrganizationReleasedDeliverablePolicy = {
  organizationId: '22222222-2222-4222-8222-222222222222',
  organizationName: 'Example Customer',
  organizationKind: 'Customer',
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
  override: {
    id: '33333333-3333-4333-8333-333333333333',
    organizationId: '22222222-2222-4222-8222-222222222222',
    revision: 1,
    standardRetentionDays: 45,
    undownloadedWarningLeadDays: null,
    undownloadedGraceDays: null,
    changeReason: 'Customer contract exception.',
    supersedesOverrideId: null,
    isActive: true,
    deactivatedAt: null,
    deactivatedByUserId: null,
    deactivationReason: null,
    createdAt: '2026-08-19T02:15:00Z',
    createdByUserId: 'user-id',
    version: 1,
  },
  effective: {
    standardRetentionDays: 45,
    standardRetentionSource: 'organizationOverride',
    undownloadedWarningLeadDays: 5,
    undownloadedWarningLeadSource: 'global',
    undownloadedGraceDays: 5,
    undownloadedGraceSource: 'global',
  },
  overrideHistory: [{
    id: '33333333-3333-4333-8333-333333333333',
    organizationId: '22222222-2222-4222-8222-222222222222',
    revision: 1,
    standardRetentionDays: 45,
    undownloadedWarningLeadDays: null,
    undownloadedGraceDays: null,
    changeReason: 'Customer contract exception.',
    supersedesOverrideId: null,
    isActive: true,
    deactivatedAt: null,
    deactivatedByUserId: null,
    deactivationReason: null,
    createdAt: '2026-08-19T02:15:00Z',
    createdByUserId: 'user-id',
    version: 1,
  }],
}
