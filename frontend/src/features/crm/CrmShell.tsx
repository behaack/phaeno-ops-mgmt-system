import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Building2,
  ChartColumn,
  ContactRound,
  House,
  ListTodo,
  Settings,
  Target,
  UserSearch,
} from 'lucide-react'
import type { ReactNode } from 'react'

import {
  WorkspaceSidebar,
  type WorkspaceSidebarItem,
} from '#/components/WorkspaceSidebar'

type CrmSection =
  | 'home'
  | 'companies'
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
  },
  {
    value: 'contacts',
    label: 'Contacts',
    description: 'People and Company associations',
    icon: ContactRound,
    to: '/crm/contacts',
  },
  {
    value: 'leads',
    label: 'Leads',
    description: 'Qualification and conversion work',
    icon: UserSearch,
    to: '/crm/leads',
  },
  {
    value: 'opportunities',
    label: 'Opportunities',
    description: 'Pipelines, stages, and commercial pursuits',
    icon: Target,
    to: '/crm/opportunities',
  },
  {
    value: 'tasks',
    label: 'Tasks',
    description: 'Owned follow-up and reminders',
    icon: ListTodo,
    to: '/crm/tasks',
  },
  {
    value: 'reports',
    label: 'Reports',
    description: 'Pipeline, conversion, and activity reporting',
    icon: ChartColumn,
    to: '/crm/reports',
  },
  {
    value: 'administration',
    label: 'Administration',
    description: 'Pipelines, views, imports, and data quality',
    icon: Settings,
    to: '/crm/administration',
  },
] as const satisfies ReadonlyArray<
  WorkspaceSidebarItem<CrmSection> & { to: string }
>

export function CrmShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const activeSection = getActiveSection(pathname)

  return (
    <WorkspaceSidebar
      workspaceLabel="CRM"
      items={crmSections}
      value={activeSection}
      onValueChange={(value) => {
        const destination = crmSections.find(
          (section) => section.value === value,
        )
        if (destination) void navigate({ to: destination.to })
      }}
    >
      {children}
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
