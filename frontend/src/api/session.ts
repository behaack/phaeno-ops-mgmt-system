import { api } from './client'

export type SessionState =
  | 'unauthorized'
  | 'disabled'
  | 'no_active_memberships'
  | 'organization_unavailable'
  | 'ready'

export type OrganizationKind = 'Phaeno' | 'Customer'

export type SessionUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  status: 'Invited' | 'Active' | 'Disabled'
}

export type SessionMembership = {
  membershipId: string
  organizationId: string
  organizationName: string
  organizationKind: OrganizationKind
  isOrganizationAdmin: boolean
}

export type SessionSelectedOrganization = {
  organizationId: string
  membershipId: string
  isAvailable: boolean
}

export type SessionCapabilities = {
  canInviteUsers: boolean
  canManageMembers: boolean
  canChangeMemberRoles: boolean
  canLeaveOrganization: boolean
  canManageOrganizations: boolean
  canManageAllUsers: boolean
  canDisableUsers: boolean
}

export type SessionResponse = {
  state: SessionState
  user: SessionUser | null
  memberships: SessionMembership[]
  isPlatformAdmin: boolean
  selectedOrganization: SessionSelectedOrganization | null
  capabilities: SessionCapabilities
}

export async function getSession() {
  const response = await api.get<SessionResponse>('/session')
  return response.data
}
