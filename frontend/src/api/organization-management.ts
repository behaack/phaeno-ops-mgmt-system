import axios from 'axios'

import { api } from './client'
import type { OrganizationKind } from './session'

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: null | { code: string; message: string; details?: unknown }
}

export type PortalReadinessStatus =
  | 'NotReviewed'
  | 'Pending'
  | 'Ready'
  | 'Blocked'
export type PortalService = 'PSeqLabService' | 'PSeqKit'
export type EntitlementConfigurationStatus = 'Pending' | 'Ready' | 'Blocked'
export type RelationshipRequestType =
  | 'Onboarding'
  | 'Evaluation'
  | 'ServiceChange'
  | 'RelationshipChange'
  | 'SalesAssistedOrder'
  | 'Offboarding'
export type RelationshipRequestStatus =
  | 'PendingReview'
  | 'Approved'
  | 'Declined'
  | 'Applied'
  | 'Cancelled'

export type Organization = {
  id: string
  name: string
  description: string | null
  kind: OrganizationKind
  portalReadiness: PortalReadinessStatus
  portalReadinessNote: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  version: number
}

export type OrganizationSummary = {
  organizationId: string
  organizationName: string
  organizationKind: OrganizationKind
  isActive: boolean
  portalReadiness: PortalReadinessStatus
  portalReadinessNote: string | null
  administratorStatus: 'Active' | 'Invited' | 'Missing'
  activeMemberCount: number
  pendingInvitationCount: number
  effectiveServices: PortalService[]
  pendingRequestCount: number
}

export type ServiceEntitlement = {
  id: string
  organizationId: string
  service: PortalService
  effectiveFrom: string
  effectiveTo: string | null
  configurationStatus: EntitlementConfigurationStatus
  sourceRequestId: string | null
  approvedByUserId: string
  notes: string | null
  endReason: string | null
  isEffective: boolean
  isUsable: boolean
  createdAt: string
  updatedAt: string
  version: number
}

export type RelationshipRequest = {
  id: string
  requestNumber: string
  organizationId: string | null
  candidateOrganizationName: string
  requestType: RelationshipRequestType
  source: 'Manual' | 'HubSpot'
  status: RelationshipRequestStatus
  requestedOrganizationKind: OrganizationKind | null
  sourceReference: string | null
  summary: string
  internalNotes: string | null
  requestedByUserId: string
  reviewedByUserId: string | null
  reviewedAt: string | null
  decisionReason: string | null
  appliedByUserId: string | null
  appliedAt: string | null
  applicationNotes: string | null
  requestedServices: PortalService[]
  createdAt: string
  updatedAt: string
  version: number
}

export type OrganizationMembership = {
  id: string
  organizationId: string
  organizationName: string | null
  organizationKind: OrganizationKind | null
  isActive: boolean
  isOrganizationAdmin: boolean
  createdAt: string
  updatedAt: string
  version: number
}

export type OrganizationUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  status: 'Invited' | 'Active' | 'Disabled'
  memberships: OrganizationMembership[]
  version: number
}

export type Invitation = {
  id: string
  organizationId: string
  organizationName: string | null
  email: string
  isOrganizationAdmin: boolean
  status: 'Pending' | 'Accepted' | 'Revoked' | 'Declined'
  isExpired: boolean
  expiresAt: string
  sendCount: number
  lastSentAt: string | null
  lastSendError: string | null
  version: number
}

export async function listOrganizations(includeInactive = true) {
  const response = await api.get<Organization[]>('/organizations', {
    params: { includeInactive },
  })
  return response.data
}

export async function getOrganization(id: string) {
  const response = await api.get<Organization>(`/organizations/${id}`)
  return response.data
}

export async function createOrganization(input: {
  name: string
  description: string | null
  kind: Exclude<OrganizationKind, 'Phaeno'>
  portalReadiness: PortalReadinessStatus
  portalReadinessNote: string | null
}) {
  const response = await api.post<Organization>('/organizations', input)
  return response.data
}

export async function updateOrganization(
  id: string,
  input: {
    name: string
    description: string | null
    portalReadiness: PortalReadinessStatus
    portalReadinessNote: string | null
    version: number
  },
) {
  const response = await api.put<Organization>(`/organizations/${id}`, input)
  return response.data
}

export async function setOrganizationActive(id: string, active: boolean) {
  const response = await api.post<Organization>(
    `/organizations/${id}/${active ? 'reactivate' : 'deactivate'}`,
  )
  return response.data
}

export async function convertProspect(
  id: string,
  targetKind: 'Customer' | 'Partner',
  version: number,
) {
  const response = await api.post<Organization>(`/organizations/${id}/convert`, {
    targetKind,
    version,
  })
  return response.data
}

export async function getOrganizationSummary(id: string) {
  const response = await api.get<ApiEnvelope<OrganizationSummary>>(
    `/platform/relationships/organizations/${id}/summary`,
  )
  return unwrap(response.data)
}

export async function listEntitlements(id: string) {
  const response = await api.get<ApiEnvelope<ServiceEntitlement[]>>(
    `/platform/relationships/organizations/${id}/entitlements`,
  )
  return unwrap(response.data)
}

export async function createEntitlement(
  organizationId: string,
  input: {
    service: PortalService
    effectiveFrom: string
    effectiveTo: string | null
    configurationStatus: EntitlementConfigurationStatus
    sourceRequestId: string | null
    notes: string | null
  },
) {
  const response = await api.post<ApiEnvelope<ServiceEntitlement>>(
    `/platform/relationships/organizations/${organizationId}/entitlements`,
    input,
  )
  return unwrap(response.data)
}

export async function endEntitlement(
  organizationId: string,
  entitlementId: string,
  input: { effectiveTo: string; reason: string; version: number },
) {
  const response = await api.post<ApiEnvelope<ServiceEntitlement>>(
    `/platform/relationships/organizations/${organizationId}/entitlements/${entitlementId}/end`,
    input,
  )
  return unwrap(response.data)
}

export async function listRelationshipRequests(input?: {
  organizationId?: string
  status?: RelationshipRequestStatus
}) {
  const response = await api.get<ApiEnvelope<RelationshipRequest[]>>(
    '/platform/relationships/requests',
    { params: input },
  )
  return unwrap(response.data)
}

export async function createRelationshipRequest(input: {
  organizationId: string | null
  candidateOrganizationName: string | null
  requestType: RelationshipRequestType
  requestedOrganizationKind: OrganizationKind | null
  sourceReference: string | null
  summary: string
  internalNotes: string | null
  requestedServices: PortalService[]
}) {
  const response = await api.post<ApiEnvelope<RelationshipRequest>>(
    '/platform/relationships/requests',
    input,
  )
  return unwrap(response.data)
}

export async function decideRelationshipRequest(
  id: string,
  input: { approved: boolean; reason: string; version: number },
) {
  const response = await api.post<ApiEnvelope<RelationshipRequest>>(
    `/platform/relationships/requests/${id}/decision`,
    input,
  )
  return unwrap(response.data)
}

export async function applyRelationshipRequest(
  id: string,
  input: { notes: string; organizationId?: string | null; version: number },
) {
  const response = await api.post<ApiEnvelope<RelationshipRequest>>(
    `/platform/relationships/requests/${id}/applied`,
    input,
  )
  return unwrap(response.data)
}

export async function cancelRelationshipRequest(
  id: string,
  input: { reason: string; version: number },
) {
  const response = await api.post<ApiEnvelope<RelationshipRequest>>(
    `/platform/relationships/requests/${id}/cancel`,
    input,
  )
  return unwrap(response.data)
}

export async function listOrganizationUsers(organizationId: string) {
  const response = await api.get<OrganizationUser[]>(
    `/users/organization/${organizationId}`,
    { params: { includeInactive: true } },
  )
  return response.data
}

export async function listInvitations(organizationId: string) {
  const response = await api.get<Invitation[]>('/invitations', {
    params: { organizationId, includeExpired: true },
  })
  return response.data
}

export async function createInvitation(input: {
  organizationId: string
  email: string
  isOrganizationAdmin: boolean
}) {
  const response = await api.post<Invitation>('/invitations', input)
  return response.data
}

export async function revokeInvitation(id: string) {
  const response = await api.post<Invitation>(`/invitations/${id}/revoke`)
  return response.data
}

export async function updateMembershipRole(
  membershipId: string,
  isOrganizationAdmin: boolean,
) {
  const response = await api.patch(`/memberships/${membershipId}/role`, {
    isOrganizationAdmin,
  })
  return response.data
}

export async function deactivateMembership(membershipId: string) {
  const response = await api.post(`/memberships/${membershipId}/deactivate`)
  return response.data
}

export function apiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as ApiEnvelope<unknown> | undefined
    return envelope?.error?.message ?? error.message
  }

  return error instanceof Error ? error.message : 'The request could not be completed.'
}

function unwrap<T>(envelope: ApiEnvelope<T>) {
  if (!envelope.success || !envelope.data) {
    throw new Error(envelope.error?.message ?? 'The request could not be completed.')
  }
  return envelope.data
}
