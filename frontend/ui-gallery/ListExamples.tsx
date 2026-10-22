import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { orderStatusTones } from '#/features/orders/OrderStatusBadge'
import { RecordTableHeader } from '#/components/ui/record-list'
import { ClearFiltersButton } from '#/components/ui/clear-filters-button'
import { useState } from 'react'
import { RecordPagination } from '#/components/RecordPagination'
import { RecordLink } from '#/components/ui/record-link'
import { ListToolbar, RecordList, RecordListItem, RecordTable } from '#/components/ui/record-list'
import { EmptyState } from '#/components/ui/content-state'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'

const records = [
  { id: '001', title: 'Example research sample', status: 'Ready', context: '2 verified input files' },
  { id: '002', title: 'Example laboratory sample with a deliberately long identifier EXAMPLE-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789', status: 'In progress', context: 'Verification in progress' },
  { id: '003', title: 'Example retained sample', status: 'Ready', context: '3 verified input files' },
]
const title = (record: typeof records[number]) => <RecordLink href={`#lists?sample=${record.id}&page=2`}>{record.title}</RecordLink>

export function ListExamples() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('ascending')
  const [page, setPage] = useState(1)
  const filtered = records.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) && (!status || r.status === status)).sort((a,b) => sort === 'ascending' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title))
  const shown = filtered.slice((page-1)*2,page*2)
  const clear = () => { setSearch(''); setStatus(''); setPage(1) }
  return <div className="space-y-4" data-testid="record-list-example">
    <ListToolbar actions={search || status ? <ClearFiltersButton  onClick={clear}></ClearFiltersButton> : undefined}>
      <Field><Label htmlFor="example-list-search">Find example samples</Label><Input id="example-list-search" type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} /></Field>
      <Field><Label htmlFor="example-list-status">Example status</Label><NativeSelect id="example-list-status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">All statuses</option><option>Ready</option><option>In progress</option></NativeSelect></Field>
      <Field><Label htmlFor="example-list-sort">Sort examples</Label><NativeSelect id="example-list-sort" value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}}><option value="ascending">Name A–Z</option><option value="descending">Name Z–A</option></NativeSelect></Field>
    </ListToolbar>
    {search || status ? <p className="text-sm text-muted-foreground">Active filters: {search ? `“${search}”` : ''}{search && status ? ' · ' : ''}{status}</p> : null}
    <div className="hidden @min-[40rem]:block"><RecordTable label="Example samples"><table><caption className="sr-only">Example samples</caption><RecordTableHeader><tr><th scope="col">Sample</th><th scope="col">Context</th><th scope="col">Status</th></tr></RecordTableHeader><tbody>{shown.map(r=><tr key={r.id}><td>{title(r)}</td><td>{r.context}</td><td>{r.status}</td></tr>)}</tbody></table></RecordTable></div>
    <RecordList className="@min-[40rem]:hidden" aria-label="Example sample records">{shown.map(r=><RecordListItem key={r.id} title={title(r)} metadata={r.context} status={<DomainStatusBadge status={r.status} tones={orderStatusTones}>{r.status}</DomainStatusBadge>} />)}</RecordList>
    {!shown.length ? <EmptyState kind="no-results" title="No matching example samples" action={<Button variant="outline" onClick={clear}>Clear example filters</Button>}>Adjust the search or clear the active filters.</EmptyState> : null}
    <RecordPagination label="Example sample pages" data={{totalCount:filtered.length,page,pageSize:2}} busy={false} onPage={setPage} />
    <div className="grid gap-4 @min-[40rem]:grid-cols-2" data-testid="sequencing-list-comparison">
      <section aria-label="Input list appearance" className="rounded-lg border p-4"><h3 className="font-semibold">Sequencing inputs</h3><RecordList><RecordListItem title={<RecordLink href="#lists?input=example">EXAMPLE-SAMPLE · Run 1</RecordLink>} metadata="2 input files · example run" actions={<Button>Start example assembly</Button>} /></RecordList></section>
      <section aria-label="Assembly list appearance" className="rounded-lg border p-4"><h3 className="font-semibold">Sequencing assembly</h3><RecordList><RecordListItem title={<RecordLink href="#lists?assembly=example">EXAMPLE-SAMPLE · Run 1</RecordLink>} metadata={<><p>Requested October 22, 2026</p><p>Start and stop recorded</p></>} status={<Badge variant="outline">Simulation completed</Badge>} /></RecordList></section>
    </div>
  </div>
}
