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

const existingAccessScopeError = {
  isAxiosError: true,
  response: {
    data: {
      error: {
        code: 'existing_access_scope_confirmation_required',
        details: {
          organizationId: 'd1286bc1-208e-46f7-9642-91cc0a2de464',
          organizationKind: 'Customer',
          organizationName: 'Johns Hopkins University',
        },
        message: 'Confirm use of the existing access scope.',
      },
    },
  },
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
    expect(screen.getByText(/enables online access on this Company with pending readiness/)).toBeTruthy()
    expect(screen.getByText(/Product and service access remains controlled by separate entitlements/)).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: 'Ordering authorized' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Approve and enable access' })).toBeTruthy()
  })

  it('submits the approval reason without changing product access', async () => {
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

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Enable online access for the Company.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Approve and enable access' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      explanation: 'Enable online access for the Company.',
      organizationId: undefined,
    }))
  })

  it('requires explicit confirmation before reusing an unlinked access scope', async () => {
    const onSubmit = vi.fn()
    render(
      <RequestActionDialog
        action="approve"
        error={existingAccessScopeError}
        isPending={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        request={onboardingRequest}
      />,
    )

    expect(screen.getByText('Existing access scope found')).toBeTruthy()
    expect(screen.getByText(/preserve its users, orders, invitations, and history/)).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Reconnect the existing Johns Hopkins access scope.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Use existing access scope' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      existingOrganizationId: 'd1286bc1-208e-46f7-9642-91cc0a2de464',
      explanation: 'Reconnect the existing Johns Hopkins access scope.',
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
