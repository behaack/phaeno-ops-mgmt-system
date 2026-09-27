import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import { WorkspaceSidebar } from '#/components/WorkspaceSidebar'
import { labConfigurationTabs, type LabConfigurationTab } from './lab-configuration-tabs'

export const labSettingsBackLinkClassName = 'inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2'

export function LabSettingsHeader() {
  return <div className="max-w-3xl">
    <h1 className="text-3xl font-semibold">Lab Settings</h1>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Maintain laboratory steps, protocols, workflows, duration estimates, holidays, tray formats, and storage locations.</p>
  </div>
}

export function LabSettingsLayout({ section, backLabel, backSearch, children }: {
  section: LabConfigurationTab
  backLabel: string
  backSearch?: { labStepSearch?: string; labStepRetired?: boolean; labStepPage?: number }
  children: ReactNode
}) {
  const navigate = useNavigate()
  return <div className="py-8">
    <WorkspaceSidebar workspaceLabel="Lab Settings" items={labConfigurationTabs} value={section} onValueChange={configurationTab => void navigate({ to: '/lab-configuration', search: { configurationTab } })}>
      <div className="page-wrap px-4 pt-6 lg:pt-0">
        <header className="mb-6"><LabSettingsHeader /></header>
        <Link className={labSettingsBackLinkClassName} to="/lab-configuration" search={{ configurationTab: section, ...backSearch }}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to {backLabel}
        </Link>
        <div className="mt-5">{children}</div>
      </div>
    </WorkspaceSidebar>
  </div>
}
