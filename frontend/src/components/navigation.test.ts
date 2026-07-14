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
      ...capabilityOverrides,
    },
  }
}
