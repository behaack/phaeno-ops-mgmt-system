import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { RelationshipRequest } from '#/api/organization-management'
import { AccountCreationRecoveryDialog } from './AccountCreationRecoveryDialog'
import { isAccountReviewQueueRequest, RequestRow } from './OrganizationListPage'

const strandedRequest: RelationshipRequest = {
  id: '00000000-0000-0000-0000-000000000101',
  requestNumber: 'PRQ-STRANDED',
  organizationId: null,
  candidateOrganizationName: 'Johns Hopkins University',
  requestType: 'Onboarding',
  source: 'HubSpot',
  status: 'Approved',
  requestedOrganizationKind: 'Customer',
  sourceReference: 'hubspot-company:100;deal:200',
  summary: 'Create the requested customer account.',
  internalNotes: null,
  requestedByUserId: '00000000-0000-0000-0000-000000000201',
  reviewedByUserId: '00000000-0000-0000-0000-000000000202',
  reviewedAt: '2026-08-19T12:00:00Z',
  decisionReason: 'Approved for onboarding.',
  appliedByUserId: null,
  appliedAt: null,
  applicationNotes: null,
  requestedServices: ['PSeqLabService'],
  createdAt: '2026-08-19T12:00:00Z',
  updatedAt: '2026-08-19T12:00:00Z',
  version: 2,
}

describe('approved account-request recovery', () => {
  it('removes an approved associated request from the review queue', () => {
    expect(isAccountReviewQueueRequest({ ...strandedRequest, status: 'PendingReview' })).toBe(true)
    expect(isAccountReviewQueueRequest(strandedRequest)).toBe(true)
    expect(isAccountReviewQueueRequest({
      ...strandedRequest,
      organizationId: '00000000-0000-0000-0000-000000000301',
    })).toBe(false)
  })

  it('offers a remedy when an eligible approved request has no account', () => {
    const onCompleteAccountCreation = vi.fn()

    render(
      <RequestRow
        request={strandedRequest}
        disabled={false}
        onAction={vi.fn()}
        onCompleteAccountCreation={onCompleteAccountCreation}
      />,
    )

    expect(screen.getByText('Account creation incomplete')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Complete account creation' }))
    expect(onCompleteAccountCreation).toHaveBeenCalledOnce()
  })

  it('explains the bounded recovery before creating the account', () => {
    render(
      <AccountCreationRecoveryDialog
        request={strandedRequest}
        isPending={false}
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Complete account creation' })).toBeTruthy()
    expect(screen.getByText(/does not invite users, activate requested services/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create and open account' })).toBeTruthy()
  })
})
