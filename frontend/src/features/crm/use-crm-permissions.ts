import { useContext } from 'react'
import { PhaenoSessionContext } from '#/features/auth/session-context'

export function useCrmPermissions() {
  const context = useContext(PhaenoSessionContext)
  const session = context?.session
  const selected = session?.memberships.find(membership => membership.organizationId === context?.selectedOrganizationId)
  const isPhaeno = session?.state === 'ready' && selected?.organizationKind === 'Phaeno'
  return {
    canAccess: Boolean(isPhaeno && session?.capabilities.canAccessCrm),
    canAdminister: Boolean(isPhaeno && session?.capabilities.canAdministerCrm),
  }
}
