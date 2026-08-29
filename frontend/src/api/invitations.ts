import { api } from './client'
import type { OrganizationKind } from './session'

export type InvitationStatus = 'Pending' | 'Accepted' | 'Revoked' | 'Declined'
export type BusinessRole =
  | 'CommercialOperator'
  | 'ResultReleaseManager'
  | 'BillingOperator'
  | 'CashOperator'
  | 'CashReconciler'
export type InvitationDeliveryStatus =
  | 'Queued'
  | 'Sending'
  | 'Accepted'
  | 'Delivered'
  | 'Bounced'
  | 'Failed'
  | 'NeedsAttention'

export type Invitation = {
  id: string
  organizationId: string
  organizationName: string | null
  email: string
  normalizedEmail: string
  firstName: string
  lastName: string
  isOrganizationAdmin: boolean
  labRoles: Array<
    | 'Operator'
    | 'Supervisor'
    | 'ProtocolAdministrator'
    | 'ScientificReviewer'
    | 'OperationsAdministrator'
  >
  businessRoles: BusinessRole[]
  status: InvitationStatus
  isExpired: boolean
  expiresAt: string
  acceptedAt: string | null
  acceptedByUserId: string | null
  revokedAt: string | null
  revokedByUserId: string | null
  declinedAt: string | null
  declinedByUserId: string | null
  lastSentAt: string | null
  lastSentByUserId: string | null
  sendCount: number
  lastEmailProviderMessageId: string | null
  lastSendError: string | null
  deliveryStatus: InvitationDeliveryStatus | null
  deliveryAttemptCount: number
  deliveryQueuedAt: string | null
  deliveryUpdatedAt: string | null
  deliveredAt: string | null
  bouncedAt: string | null
  hasHardBounce: boolean
  createdAt: string
  updatedAt: string
  version: number
}

export type AcceptedInvitation = Invitation & {
  organizationKind?: OrganizationKind
}

export async function createInvitation(input: {
  organizationId: string
  firstName: string
  lastName: string
  email: string
  isOrganizationAdmin: boolean
  labRoles: Invitation['labRoles']
  businessRoles?: Invitation['businessRoles']
}) {
  const response = await api.post<Invitation>('/invitations', input)
  return response.data
}

export async function acceptInvitation(input: {
  token: string
  firstName: string
  lastName: string
}) {
  const response = await api.post<AcceptedInvitation>('/invitations/accept', input)
  return response.data
}

export async function declineInvitation(token: string) {
  const response = await api.post<Invitation>('/invitations/decline', { token })
  return response.data
}
