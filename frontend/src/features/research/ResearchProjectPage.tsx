import { BackLink } from '#/components/ui/back-link'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { useResearchQuery, type Project } from './research-api'
import { ResearchHeader, ResearchFeedback, ResearchLoading, useResearchSearch } from './ResearchCommon'
import { ResearchRecordDialog } from './ResearchRecordDialog'
import { ResearchExperimentList } from './ResearchLists'
import { ResearchHistory } from './ResearchHistory'

export function ResearchProjectPage({ projectId }: { projectId: string }) {
  const query = useResearchQuery<Project>(`projects/${projectId}`)
  const { search } = useResearchSearch()
  const [editing, setEditing] = useState(false)
  const [history, setHistory] = useState(false)
  return <main className="page-wrap space-y-5 px-4 py-8"><BackLink asChild><Link to="/research" search={search}>Back to projects</Link></BackLink>
    <ResearchFeedback error={query.error} /><ResearchLoading loading={query.isLoading} />{query.isError ? <Button variant="outline" onClick={() => void query.refetch()}>Retry project</Button> : null}
    {query.data ? <><ResearchHeader title={query.data.name} description={query.data.description ?? undefined}><ActionMenu><DropdownMenuTrigger asChild><Button id="research-project-actions" variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setEditing(true)}>Edit project</DropdownMenuItem><DropdownMenuItem onSelect={() => setHistory(true)}>View history</DropdownMenuItem></DropdownMenuContent></ActionMenu></ResearchHeader><ResearchExperimentList projectId={projectId} />
      {editing ? <ResearchRecordDialog kind="project" project={query.data} onClose={() => setEditing(false)} /> : null}
      {history ? <ResearchHistory kind="project" id={projectId} title={query.data.name} onClose={() => setHistory(false)} /> : null}</> : null}
  </main>
}
