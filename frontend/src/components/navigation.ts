import {
  Activity,
  Building2,
  Database,
  Library,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'

import type {
  OrganizationKind,
  SessionMembership,
  SessionResponse,
} from '#/api/session'

type NavigationContext = {
  selectedOrganizationKind?: OrganizationKind | null
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
    label: 'Organizations',
    to: '/customers',
    icon: Building2,
    visibleWhen: (session, context) =>
      isPhaenoEmployee(session) &&
      context.selectedOrganizationKind === 'Phaeno' &&
      Boolean(session?.capabilities.canManageOrganizations),
  },
  {
    label: 'Data provisioning',
    to: '/data-provisioning',
    icon: Database,
    visibleWhen: (session, context) =>
      isPhaenoEmployee(session) &&
      context.selectedOrganizationKind === 'Phaeno' &&
      Boolean(session?.capabilities.canViewDatasetConfiguration),
  },
  {
    label: 'Data library',
    to: '/data-library',
    icon: Library,
    visibleWhen: (session, context) =>
      isExternalOrganizationKind(context.selectedOrganizationKind) &&
      Boolean(session?.capabilities.canViewOrganizationDatasets),
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

export function canManageUserScope(
  session: SessionResponse | null,
  selectedMembership?: SessionMembership | null,
  selectedOrganizationKind?: OrganizationKind | null,
) {
  if (isExternalOrganizationKind(selectedOrganizationKind)) {
    return (
      (Boolean(selectedMembership?.isOrganizationAdmin) &&
        Boolean(session?.capabilities.canManageMembers)) ||
      (isPhaenoEmployee(session) &&
        Boolean(session?.capabilities.canManageOrganizations))
    )
  }

  return canManagePhaenoUsers(session)
}

export function isExternalOrganizationKind(
  kind: OrganizationKind | null | undefined,
) {
  return kind === 'Prospect' || kind === 'Customer' || kind === 'Partner'
}

export function isPhaenoEmployee(session: SessionResponse | null) {
  return Boolean(
    session?.memberships.some(
      (membership) => membership.organizationKind === 'Phaeno',
    ),
  )
}
