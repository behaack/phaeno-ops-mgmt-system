import { BackLink } from '#/components/ui/back-link'
import { useConfigurationDiscovery, type ConfigurationDiscovery } from './configuration-discovery'
import { Link, useNavigate } from '@tanstack/react-router'

import type { ReactNode } from 'react'

import { WorkspaceSidebar } from '#/components/WorkspaceSidebar'
import { labConfigurationTabs, type LabConfigurationTab } from './lab-configuration-tabs'

export function LabSettingsHeader() {
  return <div className="max-w-3xl">
    <h1 className="text-3xl font-semibold">Lab Settings</h1>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Maintain complete protocols and workflows, duration estimates, holidays, tray formats, and storage locations.</p>
  </div>
}

export function LabSettingsLayout({ section, backLabel, backSearch, children }: {
  section: LabConfigurationTab
  backLabel: string
  backSearch?: ConfigurationDiscovery & { labStepSearch?: string; labStepRetired?: boolean; labStepPage?: number }
  children: ReactNode
}) {
  const navigate = useNavigate()
  const discovery = useConfigurationDiscovery()
  return <div className="py-8">
    <WorkspaceSidebar workspaceLabel="Lab Settings" items={labConfigurationTabs} value={section} onValueChange={configurationTab => void navigate({ to: '/lab-configuration', search: previous => ({ ...previous, configurationTab }) })}>
      <div className="page-wrap px-4 pt-6 lg:pt-0">
        <header className="mb-6"><LabSettingsHeader /></header>
        <BackLink asChild><Link to="/lab-configuration" search={{ ...discovery, configurationTab: section, ...backSearch }}>
           Back to {backLabel}
        </Link></BackLink>
        <div className="mt-5">{children}</div>
      </div>
    </WorkspaceSidebar>
  </div>
}
