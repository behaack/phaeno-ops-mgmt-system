import { ClearFiltersButton } from '#/components/ui/clear-filters-button'
import { EmptyState } from '#/components/ui/content-state'
import { ListToolbar, RecordTable } from '#/components/ui/record-list'
import { RecordLink } from '#/components/ui/record-link'
import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Field } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RecordPagination } from '#/components/RecordPagination'
import { useResearchQuery, type Page, type Project, type Experiment } from './research-api'
import { ResearchHeader, ResearchFeedback, ResearchLoading, ResearchSearchInput, ResearchProjectSelect, useResearchSearch, useResearchListScroll, formatResearchTime } from './ResearchCommon'
import { ResearchRecordDialog } from './ResearchRecordDialog'

export function ResearchProjectsPage() {
  const { search, change } = useResearchSearch()
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const query = useResearchQuery<Page<Project>>('projects', { search: search.projectSearch, page: search.projectPage })
  const rememberScroll = useResearchListScroll('projects', { search: search.projectSearch, page: search.projectPage }, Boolean(query.data))
  return <main className="page-wrap space-y-5 px-4 py-8"><ResearchHeader title="Research projects" description="Organize experiments and keep the team's scientific notebook together."><Button id="research-create-project" onClick={() => setCreating(true)}>Create project</Button></ResearchHeader>
    <ResearchSearchInput value={search.projectSearch} onChange={value => change({ projectSearch: value, projectPage: 1 })} label="Search projects" />
    {search.projectSearch ? <ClearFiltersButton  onClick={() => change({ projectSearch: '', projectPage: 1 })}></ClearFiltersButton> : null}
    <ResearchFeedback error={query.error} /><ResearchLoading loading={query.isLoading} />
    {query.isError ? <Button variant="outline" onClick={() => void query.refetch()}>Retry projects</Button> : null}
    {query.data ? <><RecordTable label="Research records"><table className="hidden w-full text-left text-sm md:table"><caption className="sr-only">Research projects</caption><thead className="bg-muted"><tr><th className="px-4 py-3" scope="col">Project</th><th className="px-4 py-3" scope="col">Description</th><th className="px-4 py-3" scope="col">Experiments</th></tr></thead><tbody>{query.data.items.map(p => <tr key={p.id} className="border-t"><td className="max-w-xs break-words px-4 py-3"><RecordLink asChild><Link onClick={rememberScroll}  to="/research/projects/$projectId" params={{ projectId: p.id }} search={search}>{p.name}</Link></RecordLink></td><td className="max-w-lg whitespace-pre-wrap break-words px-4 py-3">{p.description ?? "—"}</td><td className="px-4 py-3">{p.experimentCount}</td></tr>)}</tbody></table><div className="divide-y md:hidden">{query.data.items.map(p => <article key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><RecordLink asChild><Link onClick={rememberScroll}  to="/research/projects/$projectId" params={{ projectId: p.id }} search={search}>{p.name}</Link></RecordLink><p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{p.description}</p></div><p className="text-sm text-muted-foreground">{p.experimentCount} experiments</p></article>)}</div>
      {!query.data.items.length ? <EmptyState kind={search.projectSearch ? 'no-results' : 'empty'} title={search.projectSearch ? 'No matching projects' : 'No research projects yet'}>{search.projectSearch ? 'Try a different search.' : 'Create a project to begin.'}</EmptyState> : null}</RecordTable><RecordPagination data={query.data} busy={query.isFetching} onPage={projectPage => change({ projectPage })} label="Project pages" /></> : null}
    {creating ? <ResearchRecordDialog kind="project" onClose={() => setCreating(false)} onSaved={id => void navigate({ to: '/research/projects/$projectId', params: { projectId: id }, search })} /> : null}
  </main>
}
export function ResearchExperimentsPage() {
  return <main className="page-wrap space-y-5 px-4 py-8"><ResearchHeader title="Experiments" description="Find active work, completed experiments, and the observations behind them." /><ResearchExperimentList /></main>
}
export function ResearchExperimentList({ projectId }: { projectId?: string }) {
  const { search, change } = useResearchSearch()
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const query = useResearchQuery<Page<Experiment>>('experiments', { projectId: projectId || search.projectId || undefined, status: search.status || undefined, search: search.experimentSearch, page: search.experimentPage })
  const entrySearch = { ...search, fromProjectId: projectId, entryPage: 1 }
  const rememberScroll = useResearchListScroll(`experiments:${projectId ?? ''}`, { search: search.experimentSearch, page: search.experimentPage, status: search.status, projectId: projectId || search.projectId }, Boolean(query.data))
  return <section className="space-y-4" aria-label="Experiments">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{projectId ? 'Project experiments' : 'Experiment notebook'}</h2><Button id="research-create-experiment" onClick={() => setCreating(true)}>Create experiment</Button></div>
    <ListToolbar><ResearchSearchInput label="Search experiments and notebook content" value={search.experimentSearch} onChange={value => change({ experimentSearch: value, experimentPage: 1 })} />
      <Field><Label htmlFor="experiment-status">Status</Label><NativeSelect id="experiment-status" value={search.status} onChange={e => change({ status: e.target.value, experimentPage: 1 })}><option value="">All statuses</option><option>Active</option><option>Completed</option></NativeSelect></Field>
      {!projectId ? <Field><Label htmlFor="research-project-filter">Project</Label><ResearchProjectSelect id="research-project-filter" value={search.projectId} onChange={value => change({ projectId: value, experimentPage: 1 })} /></Field> : null}</ListToolbar>
    {search.experimentSearch || search.status || !projectId && search.projectId ? <ClearFiltersButton  onClick={() => change({ experimentSearch: '', status: '', projectId: '', experimentPage: 1 })}></ClearFiltersButton> : null}
    <ResearchFeedback error={query.error} /><ResearchLoading loading={query.isLoading} />{query.isError ? <Button variant="outline" onClick={() => void query.refetch()}>Retry experiments</Button> : null}
    {query.data ? <><RecordTable label="Research records"><table className="hidden w-full text-left text-sm md:table"><caption className="sr-only">Research experiments</caption><thead className="bg-muted"><tr><th className="px-4 py-3" scope="col">Experiment</th><th className="px-4 py-3" scope="col">Project</th><th className="px-4 py-3" scope="col">Date</th><th className="px-4 py-3" scope="col">Status</th><th className="px-4 py-3" scope="col">Last activity</th></tr></thead><tbody>{query.data.items.map(e => <tr key={e.id} className="border-t"><td className="max-w-xs break-words px-4 py-3"><RecordLink asChild><Link to="/research/experiments/$experimentId" params={{ experimentId: e.id }} search={entrySearch} onClick={rememberScroll}>{e.title}</Link></RecordLink></td><td className="max-w-xs break-words px-4 py-3">{e.projectName}</td><td className="px-4 py-3">{e.experimentDate ?? "Not recorded"}</td><td className="px-4 py-3">{e.status}</td><td className="px-4 py-3">{formatResearchTime(e.lastActivityAtUtc)}</td></tr>)}</tbody></table><div className="divide-y md:hidden">{query.data.items.map(e => <article key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><span className="break-words"><RecordLink asChild><Link to="/research/experiments/$experimentId" params={{ experimentId: e.id }} search={entrySearch} onClick={rememberScroll}>{e.title}</Link></RecordLink></span><p className="mt-1 text-sm text-muted-foreground">{e.projectName} · {e.experimentDate ?? 'No experiment date'}</p></div><div className="text-sm"><p>{e.status}</p><p className="text-muted-foreground">Updated {formatResearchTime(e.lastActivityAtUtc)}</p></div></article>)}</div>
      {!query.data.items.length ? <p className="p-4">{search.experimentSearch || search.status || search.projectId ? 'No matching experiments. Adjust the filters.' : 'No experiments yet. Create an experiment to begin recording.'}</p> : null}</RecordTable><RecordPagination data={query.data} busy={query.isFetching} onPage={experimentPage => change({ experimentPage })} label="Experiment pages" /></> : null}
    {creating ? <ResearchRecordDialog kind="experiment" projectId={projectId || search.projectId} onClose={() => setCreating(false)} onSaved={id => { rememberScroll(); void navigate({ to: '/research/experiments/$experimentId', params: { experimentId: id }, search: entrySearch }) }} /> : null}
  </section>
}
