import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type {
  Organization,
  RelationshipRequest,
  ServiceEntitlement,
} from '#/api/organization-management'
import { EditEntitlementDialog } from './EditEntitlementDialog'

const organization: Organization = {
  id: '00000000-0000-0000-0000-000000000101',
  name: 'Johns Hopkins University',
  description: null,
  kind: 'Customer',
  portalReadiness: 'Pending',
  portalReadinessNote: null,
  isActive: true,
  createdAt: '2026-07-15T12:00:00Z',
  updatedAt: '2026-07-15T12:00:00Z',
  version: 1,
}

const entitlement: ServiceEntitlement = {
  id: '00000000-0000-0000-0000-000000000201',
  organizationId: organization.id,
  service: 'PSeqLabService',
  effectiveFrom: '2026-09-01T21:31:00Z',
  effectiveTo: null,
  configurationStatus: 'Pending',
  sourceRequestId: null,
  approvedByUserId: '00000000-0000-0000-0000-000000000301',
  notes: null,
  endReason: null,
  isEffective: true,
  isUsable: false,
  createdAt: '2026-09-02T21:31:34Z',
  updatedAt: '2026-09-02T21:31:34Z',
  version: 1,
}

const approvedRequest: RelationshipRequest = {
  id: '00000000-0000-0000-0000-000000000401',
  requestNumber: 'PRQ-APPROVED',
  organizationId: organization.id,
  candidateOrganizationName: organization.name,
  requestType: 'ServiceChange',
  source: 'FirstPartyCrm',
  status: 'Approved',
  requestedOrganizationKind: 'Customer',
  sourceReference: null,
  summary: 'Authorize PSeq Lab Service.',
  internalNotes: null,
  requestedByUserId: '00000000-0000-0000-0000-000000000301',
  reviewedByUserId: '00000000-0000-0000-0000-000000000302',
  reviewedAt: '2026-09-01T20:00:00Z',
  decisionReason: 'Approved.',
  appliedByUserId: null,
  appliedAt: null,
  applicationNotes: null,
  requestedServices: ['PSeqLabService'],
  createdAt: '2026-09-01T19:00:00Z',
  updatedAt: '2026-09-01T20:00:00Z',
  version: 2,
}

describe('EditEntitlementDialog', () => {
  it('updates the existing entitlement with a Ready status and approved source', async () => {
    const onSubmit = vi.fn()
    render(
      <EditEntitlementDialog
        entitlement={entitlement}
        organization={organization}
        requests={[approvedRequest]}
        isPending={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Edit service entitlement' })).toBeTruthy()
    expect(screen.getByLabelText('Service')).toHaveProperty('disabled', true)
    const source = screen.getByLabelText('Approved source request')
    expect(within(source).getByRole('option', { name: /PRQ-APPROVED/ })).toBeTruthy()

    fireEvent.change(screen.getByRole('combobox', { name: 'Service configuration' }), {
      target: { value: 'Ready' },
    })
    fireEvent.change(source, { target: { value: approvedRequest.id } })
    fireEvent.click(screen.getByRole('button', { name: 'Save entitlement' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        configurationStatus: 'Ready',
        sourceRequestId: approvedRequest.id,
      }),
      expect.anything(),
    ))
  })
})
