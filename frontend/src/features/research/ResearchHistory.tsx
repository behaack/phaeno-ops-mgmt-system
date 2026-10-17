import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogReturnFocus } from '#/components/ui/dialog'
import { RecordPagination } from '#/components/RecordPagination'
import { useResearchQuery, type Page, type Revision, type ResearchBlock } from './research-api'
import { ResearchFeedback, ResearchLoading, formatResearchTime } from './ResearchCommon'
import { ResearchNotebook } from './ResearchNotebook'

export function ResearchHistory({ kind, id, title, experimentId, onClose }: { kind: 'project' | 'experiment' | 'entry'; id: string; title: string; experimentId?: string; onClose: () => void }) {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Revision | null>(null)
  const query = useResearchQuery<Page<Revision>>(`history/${kind}/${id}`, { page })
  const snapshot = useResearchQuery<{ snapshotJson: string }>(`history/${kind}/${id}/${selected?.id}`, undefined, Boolean(selected))
  const saved = snapshot.data ? JSON.parse(snapshot.data.snapshotJson) as { title?: string; name?: string; description?: string; status?: string; entryDate?: string; experimentDate?: string; blocks?: ResearchBlock[]; experiment?: { title: string; status: string; experimentDate?: string | null } } : null
  const record = saved?.experiment ?? saved
  return <DialogReturnFocus target={null} fallbackId={kind === 'entry' ? `research-entry-actions-${id}` : kind === 'project' ? 'research-project-actions' : 'research-experiment-actions'}><Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>History: {title}</DialogTitle></DialogHeader><div className="space-y-4"><ResearchFeedback error={query.error || snapshot.error} /><ResearchLoading loading={query.isLoading || snapshot.isLoading} />
    {query.isError ? <Button variant="outline" onClick={() => void query.refetch()}>Retry history</Button> : null}{snapshot.isError ? <Button variant="outline" onClick={() => void snapshot.refetch()}>Retry saved revision</Button> : null}
    <div className="divide-y rounded-md border">{query.data?.items.map(r => <button key={r.id} type="button" aria-pressed={selected?.id === r.id} className="block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setSelected(r)}><span className="font-medium">Revision {r.revision} · {r.action}</span><span className="block text-muted-foreground">{r.authorName ?? 'Former team member'} · {formatResearchTime(r.recordedAtUtc)}</span></button>)}</div>
    <RecordPagination data={query.data} busy={query.isFetching} onPage={setPage} label="Revision pages" />
    {selected && saved ? <section className="space-y-3 rounded-md border p-4" aria-label="Saved revision"><h2 className="font-semibold">Revision {selected.revision}: {saved.title ?? saved.name ?? saved.experiment?.title}</h2><div className="space-y-1 text-sm">{saved.description ? <p className="whitespace-pre-wrap">{saved.description}</p> : null}{record?.status ? <p>Status: {record.status}</p> : null}{record?.experimentDate !== undefined ? <p>Experiment date: {record.experimentDate ?? "Not recorded"}</p> : null}{saved.entryDate ? <p>Entry date: {saved.entryDate}</p> : null}</div>{saved.blocks ? <ResearchNotebook blocks={saved.blocks} experimentId={experimentId} entryId={id} /> : null}</section> : null}
  </div><DialogFooter><Button variant="outline" onClick={onClose}>Close history</Button></DialogFooter></DialogContent></Dialog></DialogReturnFocus>
}
