import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Organization, RelationshipRequest } from '#/api/organization-management'
import { EntitlementDialog } from './EntitlementDialog'

const organization: Organization = {
  id: '00000000-0000-0000-0000-000000000101',
  name: 'Atlas Research',
  description: null,
  kind: 'Customer',
  portalReadiness: 'Ready',
  portalReadinessNote: null,
  isActive: true,
  createdAt: '2026-07-15T12:00:00Z',
  updatedAt: '2026-07-15T12:00:00Z',
  version: 1,
}

describe('EntitlementDialog', () => {
  it('offers only approved or applied requests for the selected service', async () => {
    const onSubmit = vi.fn()
    const eligible = request({
      id: '00000000-0000-0000-0000-000000000201',
      requestNumber: 'PRQ-ELIGIBLE',
      status: 'Approved',
      requestedServices: ['PSeqLabService'],
    })
    const noService = request({
      id: '00000000-0000-0000-0000-000000000202',
      requestNumber: 'PRQ-NO-SERVICE',
      status: 'Applied',
      requestedServices: [],
    })
    const pending = request({
      id: '00000000-0000-0000-0000-000000000203',
      requestNumber: 'PRQ-PENDING',
      status: 'PendingReview',
      requestedServices: ['PSeqLabService'],
    })

    render(
      <EntitlementDialog
        open
        organization={organization}
        requests={[eligible, noService, pending]}
        isPending={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    const sourceRequest = screen.getByLabelText('Approved source request')
    expect(within(sourceRequest).getByRole('option', { name: /PRQ-ELIGIBLE/ })).toBeTruthy()
    expect(within(sourceRequest).queryByRole('option', { name: /PRQ-NO-SERVICE/ })).toBeNull()
    expect(within(sourceRequest).queryByRole('option', { name: /PRQ-PENDING/ })).toBeNull()

    fireEvent.change(sourceRequest, { target: { value: eligible.id } })
    fireEvent.click(screen.getByRole('button', { name: 'Add entitlement' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]?.[0].sourceRequestId).toBe(eligible.id)
  })
})

function request({
  id,
  requestNumber,
  requestedServices,
  status,
}: Pick<RelationshipRequest, 'id' | 'requestNumber' | 'requestedServices' | 'status'>): RelationshipRequest {
  return {
    id,
    requestNumber,
    organizationId: organization.id,
    candidateOrganizationName: organization.name,
    requestType: 'ServiceChange',
    source: 'Manual',
    status,
    requestedOrganizationKind: 'Customer',
    sourceReference: null,
    summary: 'Configure approved service.',
    internalNotes: null,
    requestedByUserId: '00000000-0000-0000-0000-000000000301',
    reviewedByUserId: status === 'PendingReview' ? null : '00000000-0000-0000-0000-000000000302',
    reviewedAt: status === 'PendingReview' ? null : '2026-07-15T12:00:00Z',
    decisionReason: status === 'PendingReview' ? null : 'Approved.',
    appliedByUserId: status === 'Applied' ? '00000000-0000-0000-0000-000000000302' : null,
    appliedAt: status === 'Applied' ? '2026-07-15T13:00:00Z' : null,
    applicationNotes: status === 'Applied' ? 'Applied.' : null,
    requestedServices,
    createdAt: '2026-07-15T11:00:00Z',
    updatedAt: '2026-07-15T12:00:00Z',
    version: 2,
  }
}
