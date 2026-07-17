import type { OrganizationKind } from '#/api/session'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'

export const POMS_FULL_NAME = 'Phaeno Operations Management System'

const pomsBranding = {
  name: 'POMS',
  fullName: POMS_FULL_NAME,
} as const

const portalBranding = {
  name: 'Portal',
  fullName: 'Portal',
} as const

export function getApplicationBranding(
  organizationKind?: OrganizationKind | null,
) {
  return organizationKind === 'Phaeno' ? pomsBranding : portalBranding
}

export function useApplicationBranding() {
  const { session, selectedOrganizationId } = usePhaenoSession()
  const selectedMembership = getSelectedMembership(
    session,
    selectedOrganizationId,
  )

  return getApplicationBranding(selectedMembership?.organizationKind)
}
