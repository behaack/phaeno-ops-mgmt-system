import { api } from './client'

export type SessionState =
  | 'unauthorized'
  | 'disabled'
  | 'no_active_memberships'
  | 'organization_unavailable'
  | 'ready'

export type OrganizationKind = 'Phaeno' | 'Prospect' | 'Customer' | 'Partner'

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
  canViewDatasetConfiguration: boolean
  canManageDatasetDrafts: boolean
  canPublishDatasets: boolean
  canProvisionOrganizationData: boolean
  canViewOrganizationDatasets: boolean
  canViewLabServiceOrders: boolean
  canCreateLabServiceRequests: boolean
  canSubmitLabServiceRequests: boolean
  canAcceptLabServiceQuotes: boolean
  canRequestLabServiceCancellation: boolean
  canViewSampleProgress: boolean
  canDownloadLabResults: boolean
  canViewReagentOrders: boolean
  canCreateReagentOrders: boolean
  canPlaceReagentOrders: boolean
  canApproveReagentSubstitutions: boolean
  canRequestReagentCancellation: boolean
  canViewDataAssemblyRequests: boolean
  canCreateDataAssemblyRequests: boolean
  canSubmitDataAssemblyRequests: boolean
  canAcceptDataAssemblyQuotes: boolean
  canRequestDataAssemblyCancellation: boolean
  canDownloadDataAssemblyOutputs: boolean
  canViewAllOperationalOrders: boolean
  canManageOrderConfiguration: boolean
  canQuoteLabServiceWork: boolean
  canManageLabOperations: boolean
  canManageReagentFulfillment: boolean
  canManageDataAssembly: boolean
  canManageOrderIntegrations: boolean
  canViewOrderAudit: boolean
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
