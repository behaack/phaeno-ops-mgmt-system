import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { useResearchQuery, type EntryDetail } from './research-api'
import { ResearchHeader, ResearchFeedback, ResearchLoading, useResearchSearch, formatResearchTime } from './ResearchCommon'
import { ResearchNotebook } from './ResearchNotebook'
import { ResearchHistory } from './ResearchHistory'

export function ResearchEntryPage({ experimentId, entryId }: { experimentId: string; entryId: string }) {
  const query = useResearchQuery<EntryDetail>(`experiments/${experimentId}/entries/${entryId}`)
  const { search } = useResearchSearch()
  const [history, setHistory] = useState(false)
  const detail = query.data
  const author = (id: string | null) => detail?.authors.find(a => a.id === id)?.name ?? 'Team member'
  return <main className="page-wrap space-y-5 px-4 py-8"><Link to="/research/experiments/$experimentId" params={{ experimentId }} search={search} className="text-sm text-primary hover:underline">Back to experiment</Link>
    <ResearchFeedback error={query.error} /><ResearchLoading loading={query.isLoading} />{query.isError ? <Button variant="outline" onClick={() => void query.refetch()}>Retry entry</Button> : null}
    {detail ? <><ResearchHeader title={detail.entry.title} description={`${detail.experiment.title} · ${detail.experiment.status} · Entry date: ${detail.entry.entryDate}`}>
      <ActionMenu><DropdownMenuTrigger asChild><Button id={`research-entry-actions-${entryId}`} variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        {detail.experiment.status === 'Active' ? <DropdownMenuItem asChild><Link to="/research/experiments/$experimentId/entries/$entryId/edit" params={{ experimentId, entryId }} search={search}>Edit entry</Link></DropdownMenuItem> : null}
        <DropdownMenuItem onSelect={() => setHistory(true)}>View history</DropdownMenuItem>
      </DropdownMenuContent></ActionMenu>
    </ResearchHeader><p className="text-xs text-muted-foreground">Recorded by {author(detail.entry.createdByUserId)} · {formatResearchTime(detail.entry.createdAt)}<br />Last saved by {author(detail.entry.updatedByUserId)} · {formatResearchTime(detail.entry.updatedAt)}</p>
      {detail.experiment.status === 'Completed' ? <p className="text-sm text-muted-foreground">Reopen the experiment to edit this entry.</p> : null}
      <ResearchNotebook blocks={detail.entry.blocks} experimentId={experimentId} entryId={entryId} />
      {history ? <ResearchHistory kind="entry" id={entryId} title={detail.entry.title} experimentId={experimentId} onClose={() => setHistory(false)} /> : null}
    </> : null}
  </main>
}
