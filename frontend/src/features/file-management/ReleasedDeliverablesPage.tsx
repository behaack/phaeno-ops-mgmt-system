import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { listRetainedReleases } from '#/api/released-deliverables'
import { fileManagementErrorMessage } from '#/api/file-management'
import { Button } from '#/components/ui/button'
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
  if (!permitted) return <main className="page-wrap p-6"><h1>Released packages</h1><p>A Phaeno administrator is required.</p></main>
  return <main className="page-wrap space-y-5 px-4 py-8">
    <Link to="/file-management" className="text-primary underline">File management</Link>
    <h1 className="text-3xl font-semibold">Released packages</h1>
    <p className="text-muted-foreground">Review retained package records, preservation holds and reissue history.</p>
    <div className="max-w-md space-y-1"><Label htmlFor="release-search">Find an organization</Label><Input id="release-search" value={search} onChange={(event) => updateSearch(event.target.value)} /></div>
    {authProvider === 'mock' ? <p>Use a connected Phaeno session to review retained packages.</p> : query.isPending ? <p role="status">Loading releases…</p> : query.error ? <p role="alert">{fileManagementErrorMessage(query.error, 'Could not load releases.')}</p> : !query.data?.length ? <p>{q ? 'No matching releases.' : 'No retained releases yet.'}</p> : <>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Released packages</caption><thead><tr className="border-b"><th className="p-3">Package</th><th className="p-3">Organization</th><th className="p-3">Released</th><th className="p-3">State</th></tr></thead><tbody>{query.data.map((release) => <tr key={release.id} className="border-b"><td className="p-3"><Link to="/released-deliverables/$snapshotId" params={{ snapshotId: release.id }} search={{ q, page }} className="font-medium text-primary underline">{release.packageType} {release.packageId.slice(0, 8)}</Link></td><td className="p-3">{release.organizationName}</td><td className="p-3">{new Date(release.releasedAtUtc).toLocaleDateString()}</td><td className="p-3">{release.byteDeletedAtUtc ? 'Files deleted' : release.isQuarantined ? 'Quarantined' : release.downloadAccessClosedAtUtc ? 'Downloads closed' : 'Retained'}</td></tr>)}</tbody></table></div>
    </>}
    <div className="flex items-center gap-3"><Button variant="outline" disabled={!page} onClick={() => void navigate({ to: '/released-deliverables', search: { q, page: page - 1 } })}>Previous</Button><span>Page {page + 1}</span><Button variant="outline" disabled={query.data?.length !== 50} onClick={() => void navigate({ to: '/released-deliverables', search: { q, page: page + 1 } })}>Next</Button></div>
  </main>
}
