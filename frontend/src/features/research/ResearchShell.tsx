import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { BookOpenText, FolderOpen } from 'lucide-react'
import { WorkspaceSidebar } from '#/components/WorkspaceSidebar'
import { usePhaenoSession } from '#/features/auth/session-context'
import { parseResearchSearch } from './research-search'

export function ResearchShell() {
  const { session, selectedOrganizationId, authProvider, isLoading } = usePhaenoSession()
  const navigate = useNavigate()
  const location = useRouterState({ select: s => s.location })
  const selectedMembership = session?.memberships.find(m => m.organizationId === (selectedOrganizationId ?? session.selectedOrganization?.organizationId))
  const allowed = session?.state === 'ready' && selectedMembership?.organizationKind === 'Phaeno' && session.capabilities.canAccessResearch
  if (isLoading) return <main className="page-wrap px-4 py-8" role="status">Loading R&D access…</main>
  if (!allowed) return <main className="page-wrap px-4 py-8"><h1 className="text-3xl font-semibold">R&D</h1><p className="mt-4">Select Phaeno with an assigned Researcher role or platform administrator access.</p></main>
  if (authProvider === 'mock') return <main className="page-wrap px-4 py-8"><h1 className="text-3xl font-semibold">R&D</h1><p className="mt-4">Use a connected Phaeno session to open research notebooks.</p></main>
  return <WorkspaceSidebar workspaceLabel="R&D" items={[
    { value: 'projects', label: 'Projects', description: 'Research projects and their experiments', icon: FolderOpen },
    { value: 'experiments', label: 'Experiments', description: 'Search all active and completed experiments', icon: BookOpenText },
  ]} value={location.pathname.includes('/experiments') ? 'experiments' : 'projects'} onValueChange={value => {
    void navigate({ to: value === 'projects' ? '/research' : '/research/experiments', search: { ...parseResearchSearch(location.search), fromProjectId: undefined } })
  }}><div key={selectedOrganizationId}><Outlet /></div></WorkspaceSidebar>
}
