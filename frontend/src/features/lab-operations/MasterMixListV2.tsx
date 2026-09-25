import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import { listMasterMixWorkflows, masterMixesKey, masterMixWorkflowsKey, searchMasterMixes, startMasterMix } from '#/api/lab-master-mix'
import { getLabOperationsError } from '#/api/lab-operations'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { PreparationField, prepSelectClass } from './preparation-ui'

const startSchema = z.object({ workflowId: z.string().min(1, 'Choose an approved procedure revision.') })
type StartValues = z.infer<typeof startSchema>
type Filters = { search: string; status: string; page: number }
const storageKey = 'phaeno-master-mix-list-filters'
const labCutoff = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Los_Angeles', timeZoneName: 'short',
}).format(new Date(value))
function initialFilters(): Filters {
  if (typeof window === 'undefined') return { search: '', status: '', page: 1 }
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as Filters | null
    return value && typeof value.search === 'string' && typeof value.status === 'string' && Number.isInteger(value.page)
      ? { search: value.search, status: value.status, page: Math.max(1, value.page) } : { search: '', status: '', page: 1 }
  } catch { return { search: '', status: '', page: 1 } }
}

export function MasterMixWorkspace({ enabled, canOperate }: { enabled: boolean; canOperate: boolean }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [searchText, setSearchText] = useState(filters.search)
  const [open, setOpen] = useState(false)
  const requestId = useRef(crypto.randomUUID())
  const form = useForm<StartValues>({ resolver: zodResolver(startSchema), defaultValues: { workflowId: '' } })
  const mixes = useQuery({ queryKey: [...masterMixesKey, 'search', filters.search, filters.status, filters.page], queryFn: () => searchMasterMixes(filters.search, filters.status, filters.page), enabled })
  const workflows = useQuery({ queryKey: masterMixWorkflowsKey, queryFn: listMasterMixWorkflows, enabled })
  const updateFilters = (next: Filters) => {
    setFilters(next)
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* The list remains usable without saved filters. */ }
  }
  const close = () => { if (!form.formState.isDirty || window.confirm('Discard the unsaved master-mix selection?')) setOpen(false) }
  const start = useMutation({
    mutationFn: (value: StartValues) => {
      const [workflowId, revision] = value.workflowId.split(':')
      return startMasterMix(workflowId, Number(revision), requestId.current)
    },
    onSuccess: async mix => {
      setOpen(false); form.reset(); requestId.current = crypto.randomUUID()
      await client.invalidateQueries({ queryKey: masterMixesKey })
      await navigate({ to: '/lab-operations/master-mixes/$mixId', params: { mixId: mix.id } })
    },
  })
  const available = workflows.data?.filter(item => item.status !== 'Retired')
    .flatMap(item => item.revisions.filter(revision => revision.status === 'Approved')
      .map(revision => ({ id: `${item.id}:${revision.revision}`, label: `${revision.name} · revision ${revision.revision} · ${revision.quantityUnit}` }))) ?? []
  return <>
    <Card className="gap-0 py-0"><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b bg-muted/50 p-4"><div><CardTitle>Master mixes</CardTitle><CardDescription>Prepare one mix under an approved recipe, use it across library trays during the local work day, then discard the remainder.</CardDescription></div>{canOperate ? <Button type="button" onClick={() => setOpen(true)}><Plus data-icon="inline-start" /> Start master mix</Button> : null}</CardHeader>
      <CardContent className="space-y-4 p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); updateFilters({ ...filters, search: searchText.trim(), page: 1 }) }}>
          <PreparationField id="mix-list-search" label="Find by name or full container barcode"><Input id="mix-list-search" value={searchText} onChange={event => setSearchText(event.target.value)} /></PreparationField>
          <PreparationField id="mix-list-status" label="Status"><select id="mix-list-status" className={prepSelectClass} value={filters.status} onChange={event => updateFilters({ ...filters, status: event.target.value, page: 1 })}><option value="">All statuses</option><option value="Overdue">Overdue — discard needed</option><option value="Preparing">Preparing</option><option value="Ready">Ready</option><option value="Discarded">Discarded</option></select></PreparationField>
          <Button type="submit" variant="outline">Search</Button>
        </form>
        {mixes.isPending ? <p role="status">Loading master mixes…</p> : mixes.isError ? <p role="alert">{getLabOperationsError(mixes.error, 'Master mixes could not be loaded.')}</p> : mixes.data.items.length ? <>
          <ul className="space-y-2">{mixes.data.items.map(item => { const overdue = item.status !== 'Discarded' && new Date(item.useByUtc).getTime() <= Date.now(); return <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><Link to="/lab-operations/master-mixes/$mixId" params={{ mixId: item.id }} className="font-medium text-primary hover:underline">{item.barcode} · {item.workflowName}</Link><p className="text-sm text-muted-foreground">Revision {item.workflowRevision} · started {new Date(item.startedAtUtc).toLocaleString()} · {item.status === 'Ready' ? `${item.remainingQuantityText ?? item.remainingQuantity} ${item.quantityUnit} remaining · use by ${labCutoff(item.useByUtc)}` : item.status}</p>{overdue ? <p className="text-sm text-destructive">Overdue — discard this mix.</p> : null}</div><Badge variant="secondary">{item.status}</Badge></li> })}</ul>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>Showing page {mixes.data.page} of {Math.max(1, Math.ceil(mixes.data.total / mixes.data.pageSize))} · {mixes.data.total} mixes</p><div className="flex gap-2"><Button type="button" variant="outline" disabled={filters.page <= 1} onClick={() => updateFilters({ ...filters, page: filters.page - 1 })}>Previous</Button><Button type="button" variant="outline" disabled={filters.page * mixes.data.pageSize >= mixes.data.total} onClick={() => updateFilters({ ...filters, page: filters.page + 1 })}>Next</Button></div></div>
        </> : <p className="text-sm text-muted-foreground">No master mixes match these filters.</p>}
      </CardContent>
    </Card>
    {open ? <Dialog open onOpenChange={value => { if (!value && !start.isPending) close() }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(value => start.mutate(value))}><DialogHeader><DialogTitle>Start master mix</DialogTitle><DialogDescription>Choose the approved recipe revision used by the library trays. POMS assigns a unique container barcode and a same-day use cutoff.</DialogDescription></DialogHeader><PreparationField id="mix-start-workflow" label="Approved recipe revision" required error={form.formState.errors.workflowId?.message}><select id="mix-start-workflow" className={prepSelectClass} {...form.register('workflowId', { onChange: () => { requestId.current = crypto.randomUUID() } })}><option value="">Choose revision…</option>{available.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></PreparationField>{workflows.isError ? <p role="alert">Approved procedures could not be loaded.</p> : null}{!workflows.isPending && available.length === 0 ? <p>Approve a master-mix workflow in Lab settings first.</p> : null}{start.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(start.error, 'The preparation could not be started. Review the list before retrying.')}</p> : null}<RequiredDialogFooter><Button type="button" variant="outline" disabled={start.isPending} onClick={close}>Cancel</Button><Button type="submit" disabled={start.isPending || available.length === 0}>{start.isPending ? 'Starting…' : 'Start preparation'}</Button></RequiredDialogFooter></form></DialogContent></Dialog> : null}
  </>
}
