import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  it('explains that approval enables pending Company-owned Portal access', () => {
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
      screen.getByRole('dialog', { name: 'Approve and enable Portal access' }),
    ).toBeTruthy()
    expect(screen.getByText(/enables Portal access on this Company with pending readiness/)).toBeTruthy()
    expect(screen.getByText(/Customer ordering authorization follows the selection below/)).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Ordering authorized' })).toHaveProperty('dataset')
    expect(screen.getByRole('checkbox', { name: 'Ordering authorized' }).getAttribute('data-state')).toBe('checked')
    expect(screen.getByRole('button', { name: 'Approve and enable access' })).toBeTruthy()
  })

  it('submits ordering authorization on by default and allows staff to turn it off', async () => {
    const onSubmit = vi.fn()
    render(
      <RequestActionDialog
        action="approve"
        isPending={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        request={onboardingRequest}
      />,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: 'Ordering authorized' }))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Create the account without ordering access.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Approve and enable access' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      explanation: 'Create the account without ordering access.',
      orderingAuthorized: false,
      organizationId: undefined,
    }))
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

    expect(screen.getByRole('dialog', { name: 'Complete Portal access request' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Complete request' })).toBeTruthy()
  })
})
