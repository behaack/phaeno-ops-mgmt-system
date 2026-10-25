import { LoadingState } from '#/components/ui/content-state'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '#/api/client'
import { RecordLink } from '#/components/ui/record-link'
import { RecordList, RecordListItem } from '#/components/ui/record-list'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import { NativeSelect } from '#/components/ui/native-select'
import { Field } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { DisplayTimestamp } from '#/components/ui/display-value'
import { Button } from '#/components/ui/button'
import { CountFreePagination } from '#/components/ui/pagination-footer'
import { EvidenceError } from './InvestigationEvidence'

type Row = { id: string; labWorkOrderId: string; barcode: string; location: string | null; storagePosition: string | null; physicalHoldReason: string | null; trialHold: boolean; retainUntilUtc: string | null; status: string }
export function PhysicalRetentionQueue({ enabled }: { enabled: boolean }) {
  const [filter, setFilter] = useState('due')
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['lab-physical', 'retention', filter, page], queryFn: async () => (await api.get<{ data: { items: Row[]; hasMore: boolean } }>('/platform/lab-operations/physical-retention', { params: { filter, page } })).data.data, enabled })
  if (!enabled) return null
  return <Card><CardHeader><CardTitle>Physical retention work</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Review actual material handling. Due dates never dispose material and holds remain in force.</p><Field><Label htmlFor="physical-retention-filter">Show</Label><NativeSelect id="physical-retention-filter" value={filter} onChange={event => { setFilter(event.target.value); setPage(1) }}><option value="due">Retain-until date reached</option><option value="holds">Preservation holds</option><option value="unknown">Retention not set</option></NativeSelect></Field>
    {query.isPending ? <LoadingState label="Loading retained material…" /> : query.isError ? <><EvidenceError error={query.error} /><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></> : <><RecordList>{query.data.items.map(row => <RecordListItem key={row.id} title={<RecordLink asChild><Link to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId: row.labWorkOrderId, containerId: row.id }}>{row.barcode}</Link></RecordLink>}><div className="min-w-0 space-y-1"><p className="break-words text-sm">{row.location ?? 'No location'}{row.storagePosition ? ` · ${row.storagePosition}` : ''} · {row.status}</p><p className="text-sm">{row.retainUntilUtc ? <>Retain until <DisplayTimestamp value={row.retainUntilUtc} /></> : 'Retention not set'}</p>{row.physicalHoldReason || row.trialHold ? <p className="text-sm">Hold: {row.physicalHoldReason ?? 'Trial preservation hold'}</p> : null}</div></RecordListItem>)}</RecordList>{!query.data.items.length ? <p className="text-sm">No retained material matches this filter.</p> : null}<CountFreePagination page={page} hasNext={query.data.hasMore} onPage={setPage} busy={query.isFetching} label="Physical retention pages" /></>}
  </CardContent></Card>
}
