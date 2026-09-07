import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Building2,
  ChartColumn,
  ClipboardCheck,
  ContactRound,
  House,
  ListTodo,
  Settings,
  Target,
  UserSearch,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useCrmPermissions } from './use-crm-permissions'

import {
  WorkspaceSidebar,
  type WorkspaceSidebarItem,
} from '#/components/WorkspaceSidebar'

type CrmSection =
  | 'home'
  | 'companies'
  | 'portalAccess'
  | 'contacts'
  | 'leads'
  | 'opportunities'
  | 'tasks'
  | 'reports'
  | 'administration'

const crmSections = [
  {
    value: 'home',
    label: 'Home',
    description: 'Attention, search, and recent commercial activity',
    icon: House,
    to: '/crm',
  },
  {
    value: 'companies',
    label: 'Companies',
    description: 'Organizations and relationship context',
    icon: Building2,
    to: '/crm/companies',
    group: 'Relationships',
  },
  {
    value: 'contacts',
    label: 'People',
    description: 'Contacts, Company relationships, and Portal identity',
    icon: ContactRound,
    to: '/crm/contacts',
    group: 'Relationships',
  },
  {
    value: 'leads',
    label: 'Leads',
    description: 'Qualification and conversion work',
    icon: UserSearch,
    to: '/crm/leads',
    group: 'Sales',
  },
  {
    value: 'opportunities',
    label: 'Opportunities',
    description: 'Pipelines, stages, and commercial pursuits',
    icon: Target,
    to: '/crm/opportunities',
    group: 'Sales',
  },
  {
    value: 'tasks',
    label: 'Tasks',
    description: 'Owned follow-up and reminders',
    icon: ListTodo,
    to: '/crm/tasks',
    group: 'Follow-up',
  },
  {
    value: 'portalAccess',
    label: 'Requests',
    description: 'Company requests and approvals',
    icon: ClipboardCheck,
    to: '/customers',
    group: 'Follow-up',
  },
  {
    value: 'reports',
    label: 'Reports',
    description: 'Pipeline, conversion, and activity reporting',
    icon: ChartColumn,
    to: '/crm/reports',
    group: 'Insights',
  },
  {
    value: 'administration',
    label: 'Administration',
    description: 'Pipelines, views, imports, and data quality',
    icon: Settings,
    to: '/crm/administration',
    group: 'Administration',
  },
] as const satisfies ReadonlyArray<
  WorkspaceSidebarItem<CrmSection> & { to: string }
>

export function CrmShell({ children }: { children: ReactNode }) {
  const { canAccess, canAdminister } = useCrmPermissions()
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const activeSection = getActiveSection(pathname)
  const sections = crmSections.filter(section => canAdminister || !['portalAccess', 'administration'].includes(section.value))

  if (!canAccess) return <main className="page-wrap px-4 py-8"><h1 className="text-2xl font-semibold">CRM access required</h1><p className="mt-3 text-muted-foreground">Select your Phaeno organization. Commercial or administrator access is required to use CRM.</p></main>

  return (
    <WorkspaceSidebar
      workspaceLabel="CRM"
      items={sections}
      value={activeSection}
      onValueChange={(value) => {
        const destination = crmSections.find(
          (section) => section.value === value,
        )
        if (destination) void navigate({ to: destination.to })
      }}
    >
      {!canAdminister && activeSection === 'administration' ? <main className="page-wrap px-4 py-8"><h1 className="text-2xl font-semibold">CRM administration</h1><p className="mt-3 text-muted-foreground">A Phaeno administrator manages pipelines, imports, exports, and sensitive configuration. Use the CRM sections to continue your commercial work.</p></main> : children}
    </WorkspaceSidebar>
  )
}

function getActiveSection(pathname: string): CrmSection {
  const section = crmSections.find(
    (candidate) =>
      candidate.to !== '/crm' &&
      (pathname === candidate.to || pathname.startsWith(`${candidate.to}/`)),
  )

  return section?.value ?? 'home'
}
