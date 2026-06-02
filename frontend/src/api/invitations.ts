import { api } from './client'
import type { OrganizationKind } from './session'

export type InvitationStatus = 'Pending' | 'Accepted' | 'Revoked' | 'Declined'

export type Invitation = {
  id: string
  organizationId: string
  organizationName: string | null
  email: string
  normalizedEmail: string
  isOrganizationAdmin: boolean
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
  createdAt: string
  updatedAt: string
  version: number
}

export type AcceptedInvitation = Invitation & {
  organizationKind?: OrganizationKind
}

export async function createInvitation(input: {
  organizationId: string
  email: string
  isOrganizationAdmin: boolean
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
