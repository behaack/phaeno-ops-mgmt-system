import { BackLink } from '#/components/ui/back-link'
import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogReturnFocus } from '#/components/ui/dialog'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { RecordPagination } from '#/components/RecordPagination'
import { recordLinkClassName } from '#/components/ui/record-link'
import { useResearchQuery, useResearchMutation, writeResearch, type ExperimentDetail, type EntrySummary, type Page } from './research-api'
import { ResearchHeader, ResearchFeedback, ResearchLoading, useResearchSearch, useResearchListScroll, formatResearchTime } from './ResearchCommon'
import { ResearchRecordDialog } from './ResearchRecordDialog'
import { ResearchHistory } from './ResearchHistory'
import { ResearchEntryDialog } from './ResearchEntryDialog'

export function ResearchExperimentPage({ experimentId }: { experimentId: string }) {
  const query = useResearchQuery<ExperimentDetail>(`experiments/${experimentId}`)
  const { search, change } = useResearchSearch()
  const entries = useResearchQuery<Page<EntrySummary>>(`experiments/${experimentId}/entries`, { page: search.entryPage ?? 1 })
  const rememberScroll = useResearchListScroll(`entries:${experimentId}`, { page: search.entryPage ?? 1 }, Boolean(entries.data))
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'edit' | 'copy' | null>(null)
  const [transition, setTransition] = useState<'complete' | 'reopen' | null>(null)
  const [history, setHistory] = useState<{ kind: 'experiment' | 'entry'; id: string; title: string } | null>(null)
  const [addingEntry, setAddingEntry] = useState(false)
  const mutation = useResearchMutation(async (action: string) => {
    const experiment = query.data!.experiment
    return await writeResearch<ExperimentDetail>(`experiments/${experimentId}/transition`, { action, version: experiment.version })
  })
  const guard = useModalDraftGuard(false, mutation.isPending)
  async function act(action: string) {
    try {
      await mutation.mutateAsync(action)
      setTransition(null)
    } catch { await query.refetch() }
  }
  const detail = query.data
  return <main className="page-wrap space-y-5 px-4 py-8">{search.fromProjectId ? <BackLink asChild><Link to="/research/projects/$projectId" params={{ projectId: search.fromProjectId }} search={search}>Back to project experiments</Link></BackLink> : <BackLink asChild><Link to="/research/experiments" search={search}>Back to experiments</Link></BackLink>}<ResearchFeedback error={query.error || mutation.error} /><ResearchLoading loading={query.isLoading} />{query.isError ? <Button variant="outline" onClick={() => void query.refetch()}>Retry experiment</Button> : null}
    {detail ? <><ResearchHeader title={detail.experiment.title} description={`${detail.project.name} · ${detail.experiment.status} · Experiment date: ${detail.experiment.experimentDate ?? 'not recorded'}`}>
      <ActionMenu><DropdownMenuTrigger asChild><Button id="research-experiment-actions" variant="outline" disabled={mutation.isPending}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        {detail.experiment.status === 'Active' ? <><DropdownMenuItem onSelect={() => setDialog('edit')}>Edit experiment</DropdownMenuItem><DropdownMenuItem onSelect={() => setTransition('complete')}>Complete experiment</DropdownMenuItem></> : <DropdownMenuItem onSelect={() => setTransition('reopen')}>Reopen experiment</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => setDialog('copy')}>Copy setup</DropdownMenuItem><DropdownMenuItem onSelect={() => setHistory({ kind: 'experiment', id: experimentId, title: detail.experiment.title })}>View history</DropdownMenuItem>
      </DropdownMenuContent></ActionMenu></ResearchHeader>
      <Link className="text-sm text-primary hover:underline" to="/research/projects/$projectId" params={{ projectId: detail.project.id }} search={search}>View project: {detail.project.name}</Link>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Notebook entries</h2>{detail.experiment.status === 'Active' ? <Button id="research-add-entry" disabled={mutation.isPending} onClick={() => setAddingEntry(true)}>Add entry</Button> : <p className="text-sm text-muted-foreground">Reopen the experiment to add or edit entries.</p>}</div>
      <ResearchFeedback error={entries.error} /><ResearchLoading loading={entries.isLoading} />{entries.isError ? <Button variant="outline" onClick={() => void entries.refetch()}>Retry entries</Button> : null}
      {entries.data ? <><div className="divide-y rounded-lg border">{entries.data.items.map(entry => <article key={entry.id} className="space-y-2 p-4"><h3 className="break-words text-lg font-semibold"><Link onClick={rememberScroll} className={recordLinkClassName} to="/research/experiments/$experimentId/entries/$entryId" params={{ experimentId, entryId: entry.id }} search={search}>{entry.title}</Link></h3><p className="text-sm text-muted-foreground">Entry date: {entry.entryDate}</p><p className="text-xs text-muted-foreground">Recorded by {entry.createdByName ?? 'Team member'} · {formatResearchTime(entry.createdAt)}<br />Last saved by {entry.updatedByName ?? 'Team member'} · {formatResearchTime(entry.updatedAt)}</p></article>)}</div><RecordPagination data={entries.data} busy={entries.isFetching} onPage={entryPage => change({ entryPage })} label="Notebook entry pages" /></> : null}
      {addingEntry ? <ResearchEntryDialog detail={detail} refresh={() => query.refetch()} onClose={() => setAddingEntry(false)} onSaved={entryId => { guard.allowNavigation(); void navigate({ to: '/research/experiments/$experimentId/entries/$entryId/edit', params: { experimentId, entryId }, search }) }} /> : null}
      {dialog ? <ResearchRecordDialog kind={dialog === 'edit' ? 'experiment' : 'copy'} detail={detail} onClose={() => setDialog(null)} onSaved={dialog === 'copy' ? id => void navigate({ to: '/research/experiments/$experimentId', params: { experimentId: id }, search: { ...search, entryPage: 1 } }) : undefined} /> : null}
      {history ? <ResearchHistory {...history} experimentId={experimentId} onClose={() => setHistory(null)} /> : null}
      {transition ? <DialogReturnFocus target={null} fallbackId="research-experiment-actions"><Dialog open onOpenChange={open => { if (!open && !mutation.isPending) setTransition(null) }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById('research-transition-cancel')?.focus() }}><DialogHeader><DialogTitle>{transition === 'complete' ? 'Complete' : 'Reopen'} experiment?</DialogTitle><ResearchFeedback error={mutation.error} /></DialogHeader><div><DialogDescription>Experiment “{detail.experiment.title}”. {transition === 'complete' ? 'Its notebook will be read-only until reopened. Saved evidence is retained.' : 'The research team will be able to edit the notebook again. Its history is retained.'}</DialogDescription></div><DialogFooter><Button id="research-transition-cancel" variant="outline" disabled={mutation.isPending} onClick={() => setTransition(null)}>Cancel</Button><Button disabled={mutation.isPending} onClick={() => void act(transition)}>{mutation.isPending ? 'Saving…' : transition === 'complete' ? 'Complete experiment' : 'Reopen experiment'}</Button></DialogFooter></DialogContent></Dialog></DialogReturnFocus> : null}
    </> : null}
  </main>
}
