import { DisplayDate } from '#/components/ui/display-value'
import { RecordTableHeader } from '#/components/ui/record-list'
import { ClearFiltersButton } from '#/components/ui/clear-filters-button'
import { Field as PortalField } from '#/components/ui/field'
import { RecordLink } from '#/components/ui/record-link'
import { PageTitle } from '#/components/ui/page-header'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { BackLink } from '#/components/ui/back-link'
import { useEffect, useRef, useState } from 'react'
import { listRetainedReleases } from '#/api/released-deliverables'
import { fileManagementErrorMessage } from '#/api/file-management'
import { CountFreePagination } from '#/components/ui/pagination-footer'
import { LoadingState, EmptyState, ErrorState } from '#/components/ui/content-state'
import { ListToolbar, RecordTable } from '#/components/ui/record-list'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'

export function ReleasedDeliverablesPage({ q, page }: { q: string; page: number }) {
  const { session, authProvider } = usePhaenoSession()
  const navigate = useNavigate()
  const [search, setSearch] = useState(q)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current) }, [])
  const [previousQuery, setPreviousQuery] = useState(q)
  if (previousQuery !== q) { setPreviousQuery(q); setSearch(q) }
  const permitted = Boolean(session?.capabilities.canManageFileManagementConfiguration)
  const query = useQuery({ queryKey: ['retained-releases', q, page], queryFn: () => listRetainedReleases(q, page * 50), enabled: permitted && authProvider !== 'mock' })
  function updateSearch(value: string) {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { void navigate({ to: '/released-deliverables', search: { q: value, page: 0 }, replace: true }) }, 300)
  }
  if (!permitted) return <main className="page-wrap p-6"><PageTitle>Released packages</PageTitle><EmptyState kind="permission" title="A Phaeno administrator is required." /></main>
  return <main className="page-wrap space-y-5 px-4 py-8">
    <BackLink asChild><Link to="/file-management">File retention policies</Link></BackLink>
    <PageTitle>Released packages</PageTitle>
    <p className="text-muted-foreground">Review retained package records, preservation holds and reissue history.</p>
    <ListToolbar><PortalField className="w-full max-w-md"><Label htmlFor="release-search">Find an organization</Label><Input id="release-search" value={search} onChange={(event) => updateSearch(event.target.value)} /></PortalField><ClearFiltersButton disabled={!search && !q && !page} onClick={() => { if (searchTimer.current) clearTimeout(searchTimer.current); setSearch(''); void navigate({ to: '/released-deliverables', search: { q: '', page: 0 }, replace: true }) }} /></ListToolbar>
    {authProvider === 'mock' ? <EmptyState kind="setup" title="Use a connected Phaeno session to review retained packages." /> : query.isPending ? <LoadingState label="Loading releases…" /> : query.error ? <ErrorState title="Released packages could not be loaded" onRetry={()=>void query.refetch()} busy={query.isFetching} retryLabel="Retry">{fileManagementErrorMessage(query.error, 'Could not load releases.')}</ErrorState> : !query.data?.length ? <EmptyState kind={q ? 'no-results' : 'empty'} title={page ? 'No releases on this page. Use Previous to return to earlier results.' : q ? 'No matching releases. Clear all filters to see all released packages.' : 'No retained releases yet.'} /> : <>
      <RecordTable label="Released packages"><table className="w-full text-left text-sm"><caption className="sr-only">Released packages</caption><RecordTableHeader><tr className="border-b"><th className="p-3">Package</th><th className="p-3">Organization</th><th className="p-3">Released</th><th className="p-3">State</th></tr></RecordTableHeader><tbody>{query.data.map((release) => <tr key={release.id} className="border-b"><td className="p-3"><RecordLink asChild><Link to="/released-deliverables/$snapshotId" params={{ snapshotId: release.id }} search={{ q, page }} >{release.workflowNumber ?? release.packageType}{release.sampleName ? ` · ${release.sampleName}` : ''} · {<DisplayDate value={release.releasedAtUtc} />}</Link></RecordLink></td><td className="p-3">{release.organizationName}</td><td className="p-3">{<DisplayDate value={release.releasedAtUtc} />}</td><td className="p-3">{release.byteDeletedAtUtc ? 'Files deleted' : release.isQuarantined ? 'Quarantined' : release.downloadAccessClosedAtUtc ? 'Downloads closed' : 'Retained'}</td></tr>)}</tbody></table></RecordTable>
    </>}
    <CountFreePagination label="Released package pages" page={page+1} busy={query.isFetching} hasNext={query.data?.length===50} onPage={next=>void navigate({to:'/released-deliverables',search:{q,page:next-1}})} />
  </main>
}
