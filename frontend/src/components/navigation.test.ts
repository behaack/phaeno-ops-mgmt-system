import { describe, expect, it } from 'vitest'

import {
  getVisibleMainMenuItems,
  isExternalOrganizationKind,
} from './navigation'
import type { OrganizationKind, SessionResponse } from '#/api/session'

describe('data navigation permissions', () => {
  it('shows provisioning only in the Phaeno context', () => {
    const session = createSession('Phaeno', {
      canViewDatasetConfiguration: true,
      canViewOrganizationDatasets: false,
    })

    const labels = getVisibleMainMenuItems(session, {
      selectedOrganizationKind: 'Phaeno',
      selectedMembership: session.memberships[0],
    }).map((item) => item.label)

    expect(labels).toContain('Data provisioning')
    expect(labels).not.toContain('Data library')
  })

  it.each<OrganizationKind>(['Prospect', 'Customer', 'Partner'])(
    'shows the Data Library for an active %s organization context',
    (kind) => {
      const session = createSession(kind, {
        canViewDatasetConfiguration: false,
        canViewOrganizationDatasets: true,
      })

      const labels = getVisibleMainMenuItems(session, {
        selectedOrganizationKind: kind,
        selectedMembership: session.memberships[1],
      }).map((item) => item.label)

      expect(labels).toContain('Data library')
      expect(labels).not.toContain('Data provisioning')
      expect(isExternalOrganizationKind(kind)).toBe(true)
    },
  )
})

describe('order navigation permissions', () => {
  it('shows laboratory services only in an authorized Customer context', () => {
    const session = createSession('Customer', {
      canViewLabServiceOrders: true,
    })

    const labels = getVisibleMainMenuItems(session, {
      selectedOrganizationKind: 'Customer',
      selectedMembership: session.memberships[1],
    }).map((item) => item.label)

    expect(labels).toContain('Lab services')
    expect(labels).not.toContain('Reagent orders')
    expect(labels).not.toContain('Data assembly')
    expect(labels).not.toContain('Order ops')
  })

  it('shows reagent and assembly work only in an authorized Partner context', () => {
    const session = createSession('Partner', {
      canViewReagentOrders: true,
      canViewDataAssemblyRequests: true,
    })

    const labels = getVisibleMainMenuItems(session, {
      selectedOrganizationKind: 'Partner',
      selectedMembership: session.memberships[1],
    }).map((item) => item.label)

    expect(labels).toContain('Reagent orders')
    expect(labels).toContain('Data assembly')
    expect(labels).not.toContain('Lab services')
    expect(labels).not.toContain('Order configuration')
  })

  it('shows operations and configuration only in the authorized Phaeno context', () => {
    const session = createSession('Phaeno', {
      canViewAllOperationalOrders: true,
      canManageOrderConfiguration: true,
      canManageLabOperations: true,
    })

    const labels = getVisibleMainMenuItems(session, {
      selectedOrganizationKind: 'Phaeno',
      selectedMembership: session.memberships[0],
    }).map((item) => item.label)

    expect(labels).toContain('Order ops')
    expect(labels).toContain('Lab ops')
    expect(labels).toContain('Order configuration')
    expect(labels).not.toContain('Lab services')
    expect(labels).not.toContain('Reagent orders')
  })
})

describe('documentation navigation permissions', () => {
  it.each<OrganizationKind>(['Prospect', 'Customer', 'Partner', 'Phaeno'])(
    'shows Docs for an active %s organization context',
    (kind) => {
      const session = createSession(kind, {})

      const labels = getVisibleMainMenuItems(session, {
        selectedOrganizationKind: kind,
        selectedMembership:
          kind === 'Phaeno' ? session.memberships[0] : session.memberships[1],
      }).map((item) => item.label)

      expect(labels).toContain('Docs')
    },
  )
})

describe('navigation placement', () => {
  it('keeps frequent Phaeno work in the toolbar and moves secondary destinations to the menu', () => {
    const session = createSession('Phaeno', {
      canManageOrganizations: true,
      canViewDatasetConfiguration: true,
      canViewAllOperationalOrders: true,
      canManageLabOperations: true,
      canManageOrderConfiguration: true,
    })
    const context = {
      selectedOrganizationKind: 'Phaeno' as const,
      selectedMembership: session.memberships[0],
    }

    expect(
      getVisibleMainMenuItems(session, context, 'workspace').map(
        (item) => item.label,
      ),
    ).toEqual(['Dashboard', 'Order ops', 'Lab ops', 'Docs'])
    expect(
      getVisibleMainMenuItems(session, context, 'administration').map(
        (item) => item.label,
      ),
    ).toEqual(['Accounts', 'Order configuration'])
    expect(
      getVisibleMainMenuItems(session, context, 'resources').map(
        (item) => item.label,
      ),
    ).toEqual(['Data provisioning', 'Project', 'Query demo'])
  })
})

function createSession(
  selectedKind: OrganizationKind,
  capabilityOverrides: Partial<SessionResponse['capabilities']>,
): SessionResponse {
  const externalMembership = {
    membershipId: 'external-membership',
    organizationId: 'c5cb2666-e556-4f96-aa1a-81cd61466336',
    organizationName: 'Example organization',
    organizationKind: selectedKind,
    isOrganizationAdmin: true,
  }
  return {
    state: 'ready',
    user: {
      id: 'user-id',
      email: 'user@example.com',
      firstName: 'Example',
      lastName: 'User',
      status: 'Active',
    },
    memberships: [
      {
        membershipId: 'phaeno-membership',
        organizationId: 'phaeno-id',
        organizationName: 'Phaeno',
        organizationKind: 'Phaeno',
        isOrganizationAdmin: true,
      },
      externalMembership,
    ],
    isPlatformAdmin: true,
    selectedOrganization: {
      organizationId:
        selectedKind === 'Phaeno'
          ? 'phaeno-id'
          : externalMembership.organizationId,
      membershipId:
        selectedKind === 'Phaeno'
          ? 'phaeno-membership'
          : externalMembership.membershipId,
      isAvailable: true,
    },
    capabilities: {
      canInviteUsers: true,
      canManageMembers: true,
      canChangeMemberRoles: true,
      canLeaveOrganization: true,
      canManageOrganizations: true,
      canManageAllUsers: true,
      canDisableUsers: true,
      canViewDatasetConfiguration: false,
      canManageDatasetDrafts: false,
      canPublishDatasets: false,
      canProvisionOrganizationData: false,
      canViewOrganizationDatasets: false,
      canViewLabServiceOrders: false,
      canCreateLabServiceRequests: false,
      canSubmitLabServiceRequests: false,
      canAcceptLabServiceQuotes: false,
      canRequestLabServiceCancellation: false,
      canViewSampleProgress: false,
      canDownloadLabResults: false,
      canViewReagentOrders: false,
      canCreateReagentOrders: false,
      canPlaceReagentOrders: false,
      canApproveReagentSubstitutions: false,
      canRequestReagentCancellation: false,
      canViewDataAssemblyRequests: false,
      canCreateDataAssemblyRequests: false,
      canSubmitDataAssemblyRequests: false,
      canAcceptDataAssemblyQuotes: false,
      canRequestDataAssemblyCancellation: false,
      canDownloadDataAssemblyOutputs: false,
      canViewAllOperationalOrders: false,
      canManageOrderConfiguration: false,
      canQuoteLabServiceWork: false,
      canManageLabOperations: false,
      canOperateLabWork: false,
      canSuperviseLabWork: false,
      canManageLabProtocols: false,
      canReviewLabWork: false,
      canManageLabAccess: false,
      canManageReagentFulfillment: false,
      canManageDataAssembly: false,
      canManageOrderIntegrations: false,
      canViewOrderAudit: false,
      ...capabilityOverrides,
    },
  }
}
