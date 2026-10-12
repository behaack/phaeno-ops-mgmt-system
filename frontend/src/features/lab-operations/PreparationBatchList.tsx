import { RecordPagination, useRecordListState } from '#/components/RecordPagination'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { labStatus } from './lab-presentation'
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { createPreparation, getPreparationIndex } from '#/api/lab-preparation'
import { getLabOperationsError } from '#/api/lab-operations'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { PreparationActions, PreparationFormDialog, PreparationPanel, prepRowClass } from './preparation-ui'

export function PreparationBatchList() {
  const list = useRecordListState()
  const query = useQuery({ queryKey: ['lab-preparation', list.page, list.search, list.status], queryFn: () => getPreparationIndex({ page: list.page, search: list.search, status: list.status }) })
  const client = useQueryClient()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'create' | null>(null)
  const request = useRef({ hash: '', id: '' })
  const create = useMutation({ mutationFn: (v: Record<string, string>) => {
    const hash = JSON.stringify(v)
    if (request.current.hash !== hash) request.current = { hash, id: crypto.randomUUID() }
    return createPreparation({ requestId: request.current.id, notes: v.notes?.trim() || undefined, trayFormatId: v.format, workflowVersionId: v.workflow })
  }, onSuccess: async batch => { await client.invalidateQueries({ queryKey: ['lab-preparation'] }); await navigate({ to: '/lab-operations/preparation/$preparationBatchId', params: { preparationBatchId: batch.id }, search: { section: 'work' } }) },
  onError: async () => { await client.invalidateQueries({ queryKey: ['lab-preparation'] }) } })
  if (query.isPending) return <p role="status">Loading preparation batches…</p>
  if (query.isError) return <div className="space-y-3"><p role="alert">{getLabOperationsError(query.error, 'Preparation batches could not be loaded.')}</p><Button variant="outline" onClick={() => void query.refetch()}>Reload preparation batches</Button></div>
  const data = query.data
  const activeFormats = data.formats.filter(format => format.isActive)
  const workflows = data.workflows.flatMap(w => w.versions.filter(v => ['Approved', 'Production'].includes(v.status) && data.compatibleWorkflowVersionIds.includes(v.id)).map(v => ({ value: v.id, label: `${w.name} · v${v.workflowVersion}` })))
  return <div className="space-y-5">
    <PreparationPanel title="Preparation batches" description="Assemble accepted tubes into a tray, prepare them together and hand completed libraries to sequencing." actions={<PreparationActions items={[
      ...(data.canOperate ? [{ label: 'New preparation batch', onClick: () => { create.reset(); request.current = { hash: '', id: '' }; setDialog('create') } }] : []),
    ]} />}>
<div className="mb-4 flex flex-wrap gap-3"><Input aria-label="Search preparation batches" placeholder="Batch identifier" value={list.search} onChange={event => list.change({ listSearch: event.target.value, listPage: 1 })} /><NativeSelect aria-label="Preparation status" value={list.status} onChange={event => list.change({ listStatus: event.target.value, listPage: 1 })}><option value="">All batches</option><option value="active">Active</option><option value="closed">Closed</option></NativeSelect><Button variant="ghost" onClick={() => list.change({ listSearch: "", listStatus: "", listPage: 1 })}>Clear all</Button></div>
      {data.batches.length ? data.batches.map(batch => <div key={batch.id} className={`${prepRowClass} flex items-center justify-between gap-4`}><Link className="font-medium underline underline-offset-4" to="/lab-operations/preparation/$preparationBatchId" params={{ preparationBatchId: batch.id }} search={{ section: 'work' }}>{batch.displayName ?? batch.name}</Link><Badge variant="secondary">{labStatus(batch.status)}</Badge></div>) : <p className="py-4 text-sm text-muted-foreground">No preparation batches yet. Create a batch using a library tray format and an approved workflow with preparation scopes.</p>}
<RecordPagination data={data} busy={query.isFetching} onPage={page => list.change({ listPage: page })} />
    </PreparationPanel>
    {dialog === 'create' ? <PreparationFormDialog title="New preparation batch" description="POMS assigns a service-and-timestamp batch identifier (UTC) when you create the batch. Partial trays and tubes from compatible jobs are allowed." fields={[
      { key: 'format', label: 'Library tray format', required: true, options: activeFormats.map(f => ({ value: f.id, label: f.layout.name })) },
      { key: 'workflow', label: 'Preparation workflow', required: true, options: workflows },
      { key: 'notes', label: 'Notes (optional)', type: 'textarea' },
    ]} pending={create.isPending} error={create.isError ? getLabOperationsError(create.error, 'Batch could not be created.') : undefined} onClose={() => setDialog(null)} onSubmit={v => create.mutate(v)} submitLabel="Create batch">
      {!activeFormats.length ? <p className="text-sm">No active library tray formats are available. {data.canConfigure ? <>Create one in <Link className="underline" to="/lab-configuration" search={{ configurationTab: 'tray-formats' }}>Lab Settings → Library tray formats</Link>.</> : 'Ask a Supervisor or Protocol Administrator to configure a library tray format.'}</p> : null}
      {!workflows.length ? <p className="text-sm">No approved workflow is available for a new tray. A workflow using a retired master-mix recipe is excluded. Configure eligible protocol versions in <Link className="underline" to="/lab-configuration" search={{ configurationTab: 'protocols' }}>Lab Settings → Protocols</Link>, then assemble the approved versions in <Link className="underline" to="/lab-configuration" search={{ configurationTab: 'workflows' }}>Workflows</Link>.</p> : null}
    </PreparationFormDialog> : null}
  </div>
}
