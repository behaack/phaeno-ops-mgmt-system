import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { RelationshipRequest } from '#/api/organization-management'
import { RequestActionDialog } from './RequestActionDialog'

const onboardingRequest: RelationshipRequest = {
  id: '00000000-0000-0000-0000-000000000101',
  requestNumber: 'PRQ-ONBOARDING',
  organizationId: null,
  candidateOrganizationName: 'Johns Hopkins University',
  requestType: 'Onboarding',
  source: 'HubSpot',
  status: 'PendingReview',
  requestedOrganizationKind: 'Customer',
  sourceReference: 'hubspot-company:100;deal:200',
  summary: 'Create the requested customer account.',
  internalNotes: null,
  requestedByUserId: '00000000-0000-0000-0000-000000000201',
  reviewedByUserId: null,
  reviewedAt: null,
  decisionReason: null,
  appliedByUserId: null,
  appliedAt: null,
  applicationNotes: null,
  requestedServices: ['PSeqLabService'],
  createdAt: '2026-08-19T12:00:00Z',
  updatedAt: '2026-08-19T12:00:00Z',
  version: 1,
}

describe('RequestActionDialog', () => {
  it('explains that approving a new-account request creates the pending account', () => {
    render(
      <RequestActionDialog
        action="approve"
        isPending={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        request={onboardingRequest}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'Approve and create Portal account' }),
    ).toBeTruthy()
    expect(screen.getByText(/creates the account with pending Portal readiness/)).toBeTruthy()
    expect(screen.getByText(/does not invite users, activate requested services, or create an order/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Approve and create account' })).toBeTruthy()
  })

  it('keeps approval-only language for a request tied to an existing account', () => {
    render(
      <RequestActionDialog
        action="approve"
        isPending={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        request={{
          ...onboardingRequest,
          organizationId: '00000000-0000-0000-0000-000000000301',
          requestType: 'ServiceChange',
        }}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Approve Portal request' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Approve request' })).toBeTruthy()
  })

  it('uses completion language for fulfilled approved work', () => {
    render(
      <RequestActionDialog
        action="apply"
        isPending={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        request={{
          ...onboardingRequest,
          organizationId: '00000000-0000-0000-0000-000000000301',
          status: 'Approved',
        }}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Complete account request' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Complete request' })).toBeTruthy()
  })
})
