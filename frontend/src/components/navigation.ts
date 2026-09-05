import {
  Activity,
  Database,
  BookOpenText,
  Library,
  LayoutDashboard,
  ClipboardList,
  Microscope,
  FlaskConical,
  FolderClock,
  Handshake,
  Package,
  PackageCheck,
  Settings,
  UsersRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import { departmentMessages } from '#/features/organizations/department-localization'

import type {
  OrganizationKind,
  SessionMembership,
  SessionResponse,
} from '#/api/session'

type NavigationContext = {
  selectedOrganizationKind?: OrganizationKind | null
  selectedMembership?: SessionMembership | null
}

export type NavigationGroup = 'workspace' | 'administration' | 'resources'

type MainMenuItem = {
  label: string
  to: string
  icon: LucideIcon
  group: NavigationGroup
  exact?: boolean
  visibleWhen?: (
    session: SessionResponse | null,
    context: NavigationContext,
  ) => boolean
}

export const mainMenuItems: readonly MainMenuItem[] = [
  {
    label: departmentMessages.departments,
    to: '/departments',
    icon: UsersRound,
    group: 'administration',
    visibleWhen: (session, context) => session?.state === 'ready'
      && isExternalOrganizationKind(context.selectedOrganizationKind)
      && Boolean(context.selectedMembership?.isOrganizationAdmin
        || context.selectedMembership?.departments?.some((department) => department.isDepartmentAdmin)),
  },
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
    group: 'workspace',
    exact: true,
  },
  {
    label: 'CRM',
    to: '/crm',
    icon: Handshake,
    group: 'workspace',
    visibleWhen: (session, context) =>
      isPhaenoEmployee(session) &&
      context.selectedOrganizationKind === 'Phaeno' &&
      Boolean(session?.capabilities.canManageOrganizations),
  },
  {
    label: 'Data provisioning',
    to: '/data-provisioning',
    icon: Database,
    group: 'resources',
    visibleWhen: (session, context) =>
      isPhaenoEmployee(session) &&
      context.selectedOrganizationKind === 'Phaeno' &&
      Boolean(session?.capabilities.canViewDatasetConfiguration),
  },
  {
    label: 'Data library',
    to: '/data-library',
    icon: Library,
    group: 'workspace',
    visibleWhen: (session, context) =>
      isExternalOrganizationKind(context.selectedOrganizationKind) &&
      Boolean(session?.capabilities.canViewOrganizationDatasets),
  },
  {
    label: 'Lab services',
    to: '/lab-services',
    icon: FlaskConical,
    group: 'workspace',
    visibleWhen: (session, context) =>
      context.selectedOrganizationKind === 'Customer' &&
      Boolean(session?.capabilities.canViewLabServiceOrders),
  },
  {
    label: 'Samples & shipping',
    to: '/sample-shipping',
    icon: PackageCheck,
    group: 'workspace',
    visibleWhen: (session, context) =>
      context.selectedOrganizationKind === 'Prospect' &&
      Boolean(session?.capabilities.canViewSampleShipping),
  },
  {
    label: 'Reagent orders',
    to: '/reagent-orders',
    icon: Package,
    group: 'workspace',
    visibleWhen: (session, context) =>
      context.selectedOrganizationKind === 'Partner' &&
      Boolean(session?.capabilities.canViewReagentOrders),
  },
  {
    label: 'Data assembly',
    to: '/data-assembly',
    icon: Workflow,
    group: 'workspace',
    visibleWhen: (session, context) =>
      context.selectedOrganizationKind === 'Partner' &&
      Boolean(session?.capabilities.canViewDataAssemblyRequests),
  },
  {
    label: 'Order ops',
    to: '/order-operations',
    icon: ClipboardList,
    group: 'workspace',
    visibleWhen: (session, context) =>
      context.selectedOrganizationKind === 'Phaeno' &&
      Boolean(session?.capabilities.canViewAllOperationalOrders),
  },
  {
    label: 'Lab ops',
    to: '/lab-operations',
    icon: Microscope,
    group: 'workspace',
    visibleWhen: (session, context) =>
      context.selectedOrganizationKind === 'Phaeno' &&
      Boolean(session?.capabilities.canManageLabOperations),
  },
  {
    label: 'Order configuration',
    to: '/order-configuration',
    icon: Settings,
    group: 'administration',
    visibleWhen: (session, context) =>
      context.selectedOrganizationKind === 'Phaeno' &&
      Boolean(session?.capabilities.canManageOrderConfiguration),
  },
  {
    label: 'File management',
    to: '/file-management',
    icon: FolderClock,
    group: 'administration',
    visibleWhen: (session, context) =>
      context.selectedOrganizationKind === 'Phaeno' &&
      Boolean(session?.capabilities.canManageFileManagementConfiguration),
  },
  {
    label: 'Docs',
    to: '/docs',
    icon: BookOpenText,
    group: 'workspace',
    visibleWhen: (_session, context) =>
      isExternalOrganizationKind(context.selectedOrganizationKind) ||
      context.selectedOrganizationKind === 'Phaeno',
  },
  {
    label: 'Project',
    to: '/about',
    icon: LayoutDashboard,
    group: 'resources',
  },
  {
    label: 'Query demo',
    to: '/demo/tanstack-query',
    icon: Activity,
    group: 'resources',
  },
] as const

export function getVisibleMainMenuItems(
  session: SessionResponse | null,
  context: NavigationContext = {},
  group?: NavigationGroup,
) {
  return mainMenuItems.filter(
    (item) =>
      (!group || item.group === group) &&
      (item.visibleWhen?.(session, context) ?? true),
  )
}

export function canManagePhaenoUsers(session: SessionResponse | null) {
  return (
    isPhaenoEmployee(session) &&
    (Boolean(session?.capabilities.canManageAllUsers) ||
      Boolean(session?.capabilities.canManageLabAccess))
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
