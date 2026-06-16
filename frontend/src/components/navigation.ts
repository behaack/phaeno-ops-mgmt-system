import {
  Activity,
  Building2,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'

import type { SessionMembership, SessionResponse } from '#/api/session'

type NavigationContext = {
  selectedMembership?: SessionMembership | null
}

type MainMenuItem = {
  label: string
  to: string
  icon: LucideIcon
  exact?: boolean
  visibleWhen?: (
    session: SessionResponse | null,
    context: NavigationContext,
  ) => boolean
}

export const mainMenuItems: readonly MainMenuItem[] = [
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Customers',
    to: '/customers',
    icon: Building2,
    visibleWhen: (session, context) =>
      isPhaenoEmployee(session) &&
      context.selectedMembership?.organizationKind !== 'Customer' &&
      Boolean(session?.capabilities.canManageOrganizations),
  },
  {
    label: 'Project',
    to: '/about',
    icon: LayoutDashboard,
  },
  {
    label: 'Query demo',
    to: '/demo/tanstack-query',
    icon: Activity,
  },
] as const

export function getVisibleMainMenuItems(
  session: SessionResponse | null,
  context: NavigationContext = {},
) {
  return mainMenuItems.filter(
    (item) => item.visibleWhen?.(session, context) ?? true,
  )
}

export function canManagePhaenoUsers(session: SessionResponse | null) {
  return (
    isPhaenoEmployee(session) && Boolean(session?.capabilities.canManageAllUsers)
  )
}

export function isPhaenoEmployee(session: SessionResponse | null) {
  return Boolean(
    session?.memberships.some(
      (membership) => membership.organizationKind === 'Phaeno',
    ),
  )
}
