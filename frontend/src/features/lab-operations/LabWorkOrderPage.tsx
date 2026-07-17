import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import {
  accessionLabSpecimen,
  addLabBatchMember,
  approveLabScientificReview,
  consumeLabMaterial,
  createLabContainer,
  createLabException,
  createLabExecution,
  createLabLibrary,
  getLabOperationsDashboard,
  getLabOperationsError,
  getLabWorkOrder,
  receiveLabSpecimen,
  recordLabEquipmentUsage,
  recordLabLibraryQc,
  resolveLabException,
  setLabMilestone,
  setLabSpecimenDisposition,
  transitionLabExecution,
  type LabContainer,
  type LabException,
  type LabExecution,
  type LabLibrary,
  type LabSpecimen,
  type LabWorkOrderDetail,
} from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { usePhaenoSession } from '#/features/auth/session-context'

import { LabLabelDialog } from './LabLabelDialog'

type WorkAction =
  | { kind: 'milestone' | 'container' | 'execution' | 'exception' | 'approval' }
  | { kind: 'receipt' | 'accession' | 'disposition'; specimen: LabSpecimen }
  | { kind: 'completeExecution' | 'material' | 'equipment'; execution: LabExecution }
  | { kind: 'library'; specimen?: LabSpecimen }
  | { kind: 'libraryQc' | 'batch'; library: LabLibrary }
  | { kind: 'resolveException'; exception: LabException }
  | null

export function LabWorkOrderPage({ workOrderId }: { workOrderId: string }) {
  const { authProvider, session } = usePhaenoSession()
  const canView = Boolean(session?.capabilities.canManageLabOperations)
  const apiEnabled = canView && authProvider !== 'mock'
  const client = useQueryClient()
  const [action, setAction] = useState<WorkAction>(null)
  const [labelContainer, setLabelContainer] = useState<LabContainer | null>(null)
  const work = useQuery({ queryKey: ['lab-work-order', workOrderId], queryFn: () => getLabWorkOrder(workOrderId), enabled: apiEnabled })
  const dashboard = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled: apiEnabled })
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['lab-work-order', workOrderId] })
    await client.invalidateQueries({ queryKey: ['lab-operations'] })
  }
  if (!canView) return <PageAlert title="Lab work unavailable" message="An assigned Phaeno laboratory role is required." />
  if (authProvider === 'mock') return <PageAlert title="Connected Lab operations are paused" message="Use a real Phaeno session to operate laboratory work." />
  if (work.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading laboratory work order…</p></main>
  if (work.error || !work.data) return <PageAlert title="Lab work order could not be loaded" message={getLabOperationsError(work.error, 'Return to Lab operations and try again.')} />
  const data = work.data
  const canOperate = Boolean(session?.capabilities.canOperateLabWork)
  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm text-muted-foreground"><Link to="/lab-operations" className="hover:underline">Lab operations</Link> / {data.workOrder.commercialOrderNumber ?? data.workOrder.id}</p><div className="mt-2 flex items-center gap-3"><h1 className="text-3xl font-semibold">{data.workOrder.commercialOrderNumber ?? 'Laboratory work order'}</h1><Status value={data.workOrder.status} /></div><p className="mt-2 text-sm text-muted-foreground">{data.specimens.length} specimen(s) · {data.exceptions.filter((item) => item.status === 'Open').length} open exception(s) · version {data.workOrder.version}</p></div>
        <div className="flex flex-wrap gap-2">{canOperate ? <><Button type="button" variant="outline" onClick={() => setAction({ kind: 'milestone' })}>Change milestone</Button><Button type="button" variant="outline" onClick={() => setAction({ kind: 'container' })}>New container</Button><Button type="button" onClick={() => setAction({ kind: 'execution' })}><Plus data-icon="inline-start" /> Assign protocol</Button></> : null}{session?.capabilities.canReviewLabWork && data.workOrder.status === 'ScientificReview' ? <Button type="button" onClick={() => setAction({ kind: 'approval' })}>Record scientific approval</Button> : null}</div>
      </section>
      <Tabs defaultValue="specimens"><TabsList className="grid h-auto w-full grid-cols-3 lg:grid-cols-6"><TabsTrigger value="specimens">Specimens</TabsTrigger><TabsTrigger value="execution">Execution</TabsTrigger><TabsTrigger value="lineage">Lineage</TabsTrigger><TabsTrigger value="libraries">Libraries</TabsTrigger><TabsTrigger value="exceptions">Exceptions</TabsTrigger><TabsTrigger value="review">Review</TabsTrigger></TabsList>
        <TabsContent value="specimens"><Specimens items={data.specimens} canOperate={canOperate} onAction={setAction} /></TabsContent>
        <TabsContent value="execution"><Executions items={data.executions} canOperate={canOperate} onAction={setAction} onStart={async (item) => { await transitionLabExecution(item.id, { action: 'start', version: item.version }); await refresh() }} /></TabsContent>
        <TabsContent value="lineage"><Containers items={data.containers} canOperate={canOperate} onPrint={setLabelContainer} /></TabsContent>
        <TabsContent value="libraries"><Libraries items={data.libraries} canOperate={canOperate} onAction={setAction} onCreate={() => setAction({ kind: 'library' })} /></TabsContent>
        <TabsContent value="exceptions"><Exceptions items={data.exceptions} canOperate={canOperate} canResolve={Boolean(session?.capabilities.canSuperviseLabWork)} onAction={setAction} onCreate={() => setAction({ kind: 'exception' })} /></TabsContent>
        <TabsContent value="review"><Review approvals={data.scientificApprovals} /></TabsContent>
      </Tabs>
      <WorkActionDialog action={action} workId={workOrderId} workVersion={data.workOrder.version} specimens={data.specimens} containers={data.containers} executions={data.executions} resources={dashboard.data} onClose={() => setAction(null)} onSaved={async (result, completedAction) => {
        setAction(null)
        await refresh()
        if (completedAction?.kind === 'accession') {
          const updated = result as LabWorkOrderDetail
          const created = updated.containers.find((item) =>
            item.labSpecimenId === completedAction.specimen.id
              && item.kind === 'SubmittedSpecimen',
          )
          if (created) setLabelContainer(created)
        } else if (completedAction?.kind === 'container') {
          setLabelContainer(result as LabContainer)
        }
      }} />
      {labelContainer ? <LabLabelDialog key={labelContainer.id} container={labelContainer} onClose={() => setLabelContainer(null)} onRecorded={refresh} /> : null}
    </main>
  )
}

function Specimens({ items, canOperate, onAction }: { items: LabSpecimen[]; canOperate: boolean; onAction: (action: WorkAction) => void }) { return <Card><CardHeader><CardTitle>Receipt and accession</CardTitle><CardDescription>Declared Commercial specimen identifiers remain linked to Lab accession and container lineage.</CardDescription></CardHeader><CardContent><div className="divide-y">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{item.accessionNumber ?? item.submittedSpecimenId}</p><p className="text-xs text-muted-foreground">{item.receivedAtUtc ? `Received ${formatDate(item.receivedAtUtc)}` : 'Awaiting receipt'}{item.currentLocation ? ` · ${item.currentLocation}` : ''}</p></div><div className="flex flex-wrap items-center gap-2"><Status value={item.intakeDisposition} />{canOperate && item.intakeDisposition === 'AwaitingReceipt' ? <Button type="button" size="sm" onClick={() => onAction({ kind: 'receipt', specimen: item })}>Receive</Button> : null}{canOperate && item.receivedAtUtc && !item.accessionNumber ? <Button type="button" size="sm" onClick={() => onAction({ kind: 'accession', specimen: item })}>Accession</Button> : null}{canOperate && item.accessionNumber && ['Received', 'OnHold'].includes(item.intakeDisposition) ? <Button type="button" size="sm" variant="outline" onClick={() => onAction({ kind: 'disposition', specimen: item })}>Disposition</Button> : null}</div></div>)}</div></CardContent></Card> }

function Executions({ items, canOperate, onAction, onStart }: { items: LabExecution[]; canOperate: boolean; onAction: (action: WorkAction) => void; onStart: (item: LabExecution) => Promise<void> }) { return <Card><CardHeader><CardTitle>Protocol execution</CardTitle><CardDescription>Each execution pins one active protocol version and records material, equipment, results, and deviations.</CardDescription></CardHeader><CardContent><div className="divide-y">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">Execution {item.id.slice(0, 8)}</p><p className="text-xs text-muted-foreground">Protocol version {item.labProtocolVersionId}{item.deviationNote ? ` · deviation: ${item.deviationNote}` : ''}</p></div><div className="flex flex-wrap items-center gap-2"><Status value={item.status} />{canOperate && item.status === 'Planned' ? <Button type="button" size="sm" onClick={() => void onStart(item)}>Start</Button> : null}{canOperate && item.status === 'InProgress' ? <><Button type="button" size="sm" variant="outline" onClick={() => onAction({ kind: 'material', execution: item })}>Material</Button><Button type="button" size="sm" variant="outline" onClick={() => onAction({ kind: 'equipment', execution: item })}>Equipment</Button><Button type="button" size="sm" onClick={() => onAction({ kind: 'completeExecution', execution: item })}>Complete</Button></> : null}</div></div>)}</div>{items.length === 0 ? <Empty>No protocols assigned.</Empty> : null}</CardContent></Card> }

function Containers({ items, canOperate, onPrint }: { items: LabContainer[]; canOperate: boolean; onPrint: (item: LabContainer) => void }) { return <Card><CardHeader><CardTitle>Physical container lineage</CardTitle><CardDescription>POMS barcodes, parents, location, retention, and confirmed label-print history provide chain-of-identity evidence.</CardDescription></CardHeader><CardContent><div className="divide-y">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium font-mono">{item.barcode}</p><p className="text-xs text-muted-foreground">{item.kind} · {item.location}{item.parentContainerId ? ` · parent ${item.parentContainerId.slice(0, 8)}` : ''} · {item.labelPrintCount ? `printed ${item.labelPrintCount} time(s)` : 'label not yet confirmed'}</p></div><div className="flex items-center gap-2"><Status value={item.status} />{canOperate ? <Button type="button" size="sm" variant="outline" onClick={() => onPrint(item)}>{item.labelPrintCount ? 'Reprint label' : 'Print label'}</Button> : null}</div></div>)}</div></CardContent></Card> }

function Libraries({ items, canOperate, onAction, onCreate }: { items: LabLibrary[]; canOperate: boolean; onAction: (action: WorkAction) => void; onCreate: () => void }) { return <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Derived libraries</CardTitle><CardDescription>Library records connect preparation execution and source/output containers before batching.</CardDescription></div>{canOperate ? <Button type="button" onClick={onCreate}><Plus data-icon="inline-start" /> New library</Button> : null}</div></CardHeader><CardContent><div className="divide-y">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-4"><div><p className="font-medium">{item.libraryKey}</p><p className="text-xs text-muted-foreground">Specimen {item.labSpecimenId.slice(0, 8)} · execution {item.preparationExecutionId.slice(0, 8)}</p></div><div className="flex items-center gap-2"><Status value={item.status} />{canOperate && item.status === 'Prepared' ? <Button type="button" size="sm" onClick={() => onAction({ kind: 'libraryQc', library: item })}>Record QC</Button> : null}{canOperate && item.status === 'QcPassed' ? <Button type="button" size="sm" variant="outline" onClick={() => onAction({ kind: 'batch', library: item })}>Add to batch</Button> : null}</div></div>)}</div></CardContent></Card> }

function Exceptions({ items, canOperate, canResolve, onAction, onCreate }: { items: LabException[]; canOperate: boolean; canResolve: boolean; onAction: (action: WorkAction) => void; onCreate: () => void }) { return <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Exceptions and rework</CardTitle><CardDescription>Internal evidence stays private; Customer-action exceptions carry a separate safe summary to Commercial.</CardDescription></div>{canOperate ? <Button type="button" onClick={onCreate}><Plus data-icon="inline-start" /> Raise exception</Button> : null}</div></CardHeader><CardContent><div className="divide-y">{items.map((item) => <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.internalDescription}</p>{item.customerSafeSummary ? <p className="mt-1 text-sm">Customer-safe: {item.customerSafeSummary}</p> : null}</div><div className="flex items-center gap-2"><Status value={item.audience} /><Status value={item.status} />{canResolve && item.status === 'Open' ? <Button type="button" size="sm" onClick={() => onAction({ kind: 'resolveException', exception: item })}>Resolve</Button> : null}</div></div>)}</div></CardContent></Card> }

function Review({ approvals }: { approvals: Awaited<ReturnType<typeof getLabWorkOrder>>['scientificApprovals'] }) { return <Card><CardHeader><CardTitle>Scientific approval and handoff</CardTitle><CardDescription>Approval records the release definition and permitted QC projection. “Ready for release” does not publish or attach files.</CardDescription></CardHeader><CardContent>{approvals.map((item) => <div key={item.id} className="rounded-lg border p-4"><p className="font-medium">Approval v{item.approvalVersion} · {item.releaseDefinitionKey} v{item.releaseDefinitionVersion}</p><p className="mt-1 text-xs text-muted-foreground">Approved {formatDate(item.approvedAtUtc)} · projection v{item.projectionVersion}</p></div>)}{approvals.length === 0 ? <Empty>No scientific approval recorded.</Empty> : null}</CardContent></Card> }

function WorkActionDialog({ action, workId, workVersion, specimens, containers, executions, resources, onClose, onSaved }: { action: WorkAction; workId: string; workVersion: number; specimens: LabSpecimen[]; containers: LabContainer[]; executions: LabExecution[]; resources: Awaited<ReturnType<typeof getLabOperationsDashboard>> | undefined; onClose: () => void; onSaved: (result: unknown, action: Exclude<WorkAction, null>) => Promise<unknown> }) {
  const [form, setForm] = useState<Record<string, string>>({})
  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const mutation = useMutation({ mutationFn: async () => {
    if (!action) throw new Error('Choose an action.')
    switch (action.kind) {
      case 'milestone': return setLabMilestone(workId, form.status, workVersion)
      case 'receipt': return receiveLabSpecimen(workId, action.specimen.id, { receivedAtUtc: new Date(form.receivedAtUtc).toISOString(), receiptCondition: form.receiptCondition || null, currentLocation: form.location || null, version: action.specimen.version })
      case 'accession': return accessionLabSpecimen(workId, action.specimen.id, { accessionNumber: form.accessionNumber, label: form.label, location: form.location, quantity: form.quantity ? Number(form.quantity) : null, quantityUnit: form.unit || null, retainUntilUtc: form.retainUntilUtc ? new Date(form.retainUntilUtc).toISOString() : null, version: action.specimen.version })
      case 'disposition': return setLabSpecimenDisposition(workId, action.specimen.id, { disposition: form.disposition, reasonCode: form.reasonCode || null, version: action.specimen.version })
      case 'container': return createLabContainer(workId, { labSpecimenId: form.specimenId || null, parentContainerId: form.parentContainerId || null, kind: form.kind, label: form.label, location: form.location, quantity: form.quantity ? Number(form.quantity) : null, quantityUnit: form.unit || null, retainUntilUtc: form.retainUntilUtc ? new Date(form.retainUntilUtc).toISOString() : null })
      case 'execution': return createLabExecution(workId, { labSpecimenId: form.specimenId || null, labProtocolVersionId: form.protocolVersionId, assignedToUserId: form.assignedToUserId || null })
      case 'completeExecution': return transitionLabExecution(action.execution.id, { action: 'complete', capturedResultsJson: form.resultsJson || '{}', deviationNote: form.deviationNote || null, version: action.execution.version })
      case 'material': { const lot = resources?.materialLots.find((item) => item.id === form.lotId); return consumeLabMaterial(action.execution.id, { labMaterialLotId: form.lotId, outputContainerId: form.outputContainerId || null, quantity: Number(form.quantity), quantityUnit: lot?.quantityUnit, lotVersion: lot?.version }) }
      case 'equipment': return recordLabEquipmentUsage(action.execution.id, { labEquipmentId: form.equipmentId, usedAtUtc: new Date(form.usedAtUtc).toISOString(), runReference: form.runReference || null })
      case 'library': return createLabLibrary(workId, { labSpecimenId: form.specimenId, sourceContainerId: form.sourceContainerId, libraryContainerId: form.libraryContainerId, preparationExecutionId: form.executionId, libraryKey: form.libraryKey })
      case 'libraryQc': return recordLabLibraryQc(action.library.id, { passed: form.passed === 'true', resultsJson: form.resultsJson || '{}', version: action.library.version })
      case 'batch': return addLabBatchMember(form.batchId, { labWorkOrderId: workId, labLibraryId: action.library.id })
      case 'exception': return createLabException(workId, { labSpecimenId: form.specimenId || null, labProtocolExecutionId: form.executionId || null, audience: form.audience, categoryCode: form.categoryCode, title: form.title, internalDescription: form.internalDescription, customerSafeSummary: form.customerSafeSummary || null, isBlocking: form.isBlocking === 'true', responseDueAtUtc: form.responseDueAtUtc ? new Date(form.responseDueAtUtc).toISOString() : null })
      case 'resolveException': return resolveLabException(action.exception.id, { resolutionNote: form.resolutionNote, version: action.exception.version })
      case 'approval': return approveLabScientificReview(workId, { releaseDefinitionKey: form.releaseDefinitionKey, releaseDefinitionVersion: Number(form.releaseDefinitionVersion), permittedQcProjectionJson: form.qcJson || null, workOrderVersion: workVersion })
    }
  }, onSuccess: async (result) => {
    const completedAction = action
    setForm({})
    if (completedAction) await onSaved(result, completedAction)
  } })
  function submit(event: FormEvent) { event.preventDefault(); mutation.mutate() }
  const activeVersions = resources?.protocols.flatMap((protocol) => protocol.versions.filter((version) => version.status === 'Active').map((version) => ({ value: version.id, label: `${protocol.name} v${version.protocolVersion}` }))) ?? []
  return <Dialog open={action !== null} onOpenChange={(open) => !open && onClose()}><DialogContent><form onSubmit={submit}><DialogHeader><DialogTitle>{action ? humanize(action.kind) : 'Laboratory action'}</DialogTitle><DialogDescription>Changes are version-checked and retained in laboratory audit history.</DialogDescription></DialogHeader><div className="my-5 grid max-h-[60vh] gap-4 overflow-y-auto sm:grid-cols-2">{action?.kind === 'milestone' ? <Select label="Milestone" value={form.status || ''} onChange={set('status')} options={['Received', 'OnHold', 'Processing', 'AwaitingExternalSequencing', 'DataProcessing', 'ScientificReview']} /> : null}{action?.kind === 'receipt' ? <><Field label="Received at" type="datetime-local" value={form.receivedAtUtc} onChange={set('receivedAtUtc')} /><Field label="Current location" value={form.location} onChange={set('location')} /><Text label="Receipt condition" value={form.receiptCondition} onChange={set('receiptCondition')} /></> : null}{action?.kind === 'accession' ? <ContainerFields form={form} set={set} accession /> : null}{action?.kind === 'disposition' ? <><Select label="Disposition" value={form.disposition || ''} onChange={set('disposition')} options={['Accepted', 'OnHold', 'Rejected']} /><Field label="Reason code" value={form.reasonCode} onChange={set('reasonCode')} /></> : null}{action?.kind === 'container' ? <><Select label="Specimen" value={form.specimenId || ''} onChange={set('specimenId')} options={specimens.map((item) => ({ value: item.id, label: item.accessionNumber ?? item.submittedSpecimenId }))} optional /><Select label="Parent container" value={form.parentContainerId || ''} onChange={set('parentContainerId')} options={containers.map((item) => ({ value: item.id, label: item.barcode }))} optional /><Select label="Kind" value={form.kind || ''} onChange={set('kind')} options={['Aliquot', 'PreparedReagent', 'Library', 'Other']} /><ContainerFields form={form} set={set} /></> : null}{action?.kind === 'execution' ? <><Select label="Protocol version" value={form.protocolVersionId || ''} onChange={set('protocolVersionId')} options={activeVersions} /><Select label="Specimen" value={form.specimenId || ''} onChange={set('specimenId')} options={specimens.map((item) => ({ value: item.id, label: item.accessionNumber ?? item.submittedSpecimenId }))} optional /><Field label="Assigned user ID" value={form.assignedToUserId} onChange={set('assignedToUserId')} /></> : null}{action?.kind === 'completeExecution' ? <><Text label="Captured results JSON" value={form.resultsJson || '{}'} onChange={set('resultsJson')} /><Text label="Deviation note" value={form.deviationNote} onChange={set('deviationNote')} /></> : null}{action?.kind === 'material' ? <><Select label="Material lot" value={form.lotId || ''} onChange={set('lotId')} options={(resources?.materialLots ?? []).filter((item) => ['Passed', 'ApprovedException'].includes(item.qcDisposition)).map((item) => ({ value: item.id, label: `${item.name} · ${item.lotNumber} · ${item.availableQuantity} ${item.quantityUnit}` }))} /><Field label="Quantity" type="number" value={form.quantity} onChange={set('quantity')} /><Select label="Output container" value={form.outputContainerId || ''} onChange={set('outputContainerId')} options={containers.map((item) => ({ value: item.id, label: item.barcode }))} optional /></> : null}{action?.kind === 'equipment' ? <><Select label="Equipment" value={form.equipmentId || ''} onChange={set('equipmentId')} options={(resources?.equipment ?? []).filter((item) => item.status === 'Active').map((item) => ({ value: item.id, label: `${item.assetCode} · ${item.name}` }))} /><Field label="Used at" type="datetime-local" value={form.usedAtUtc} onChange={set('usedAtUtc')} /><Field label="Run reference" value={form.runReference} onChange={set('runReference')} /></> : null}{action?.kind === 'library' ? <><Select label="Specimen" value={form.specimenId || ''} onChange={set('specimenId')} options={specimens.map((item) => ({ value: item.id, label: item.accessionNumber ?? item.submittedSpecimenId }))} /><Select label="Source container" value={form.sourceContainerId || ''} onChange={set('sourceContainerId')} options={containers.map((item) => ({ value: item.id, label: item.barcode }))} /><Select label="Library container" value={form.libraryContainerId || ''} onChange={set('libraryContainerId')} options={containers.filter((item) => item.kind === 'Library').map((item) => ({ value: item.id, label: item.barcode }))} /><Select label="Preparation execution" value={form.executionId || ''} onChange={set('executionId')} options={executions.filter((item) => item.status === 'Completed').map((item) => ({ value: item.id, label: item.id.slice(0, 8) }))} /><Field label="Library key" value={form.libraryKey} onChange={set('libraryKey')} /></> : null}{action?.kind === 'libraryQc' ? <><Select label="Disposition" value={form.passed || ''} onChange={set('passed')} options={[{ value: 'true', label: 'Pass' }, { value: 'false', label: 'Fail' }]} /><Text label="QC results JSON" value={form.resultsJson || '{}'} onChange={set('resultsJson')} /></> : null}{action?.kind === 'batch' ? <Select label="Draft batch" value={form.batchId || ''} onChange={set('batchId')} options={(resources?.batches ?? []).filter((item) => item.status === 'Draft').map((item) => ({ value: item.id, label: item.batchNumber }))} /> : null}{action?.kind === 'exception' ? <><Select label="Audience" value={form.audience || ''} onChange={set('audience')} options={['Internal', 'CustomerActionRequired']} /><Select label="Severity" value={form.isBlocking || ''} onChange={set('isBlocking')} options={[{ value: 'false', label: 'Advisory' }, { value: 'true', label: 'Blocking' }]} /><Field label="Category code" value={form.categoryCode} onChange={set('categoryCode')} /><Field label="Title" value={form.title} onChange={set('title')} /><Select label="Specimen" value={form.specimenId || ''} onChange={set('specimenId')} options={specimens.map((item) => ({ value: item.id, label: item.accessionNumber ?? item.submittedSpecimenId }))} optional /><Select label="Execution" value={form.executionId || ''} onChange={set('executionId')} options={executions.map((item) => ({ value: item.id, label: item.id.slice(0, 8) }))} optional /><Text label="Internal description" value={form.internalDescription} onChange={set('internalDescription')} /><Text label="Customer-safe summary" value={form.customerSafeSummary} onChange={set('customerSafeSummary')} /><Field label="Response due" type="datetime-local" value={form.responseDueAtUtc} onChange={set('responseDueAtUtc')} /></> : null}{action?.kind === 'resolveException' ? <Text label="Resolution note" value={form.resolutionNote} onChange={set('resolutionNote')} /> : null}{action?.kind === 'approval' ? <><Field label="Release definition key" value={form.releaseDefinitionKey} onChange={set('releaseDefinitionKey')} /><Field label="Release definition version" type="number" value={form.releaseDefinitionVersion} onChange={set('releaseDefinitionVersion')} /><Text label="Permitted QC projection JSON" value={form.qcJson || '{}'} onChange={set('qcJson')} /></> : null}</div>{mutation.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Laboratory action failed</AlertTitle><AlertDescription>{getLabOperationsError(mutation.error, 'Refresh and try again.')}</AlertDescription></Alert> : null}<DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending}>Save</Button></DialogFooter></form></DialogContent></Dialog>
}

function ContainerFields({ form, set, accession = false }: { form: Record<string, string>; set: (key: string) => React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>; accession?: boolean }) { return <>{accession ? <Field label="Accession number" value={form.accessionNumber} onChange={set('accessionNumber')} /> : null}<p className="text-sm text-muted-foreground sm:col-span-2">POMS assigns the authoritative Phaeno barcode when this record is created.</p><Field label="Label" value={form.label} onChange={set('label')} /><Field label="Location" value={form.location} onChange={set('location')} /><Field label="Quantity" type="number" value={form.quantity} onChange={set('quantity')} /><Field label="Unit" value={form.unit} onChange={set('unit')} /><Field label="Retain until" type="datetime-local" value={form.retainUntilUtc} onChange={set('retainUntilUtc')} /></> }
function Field({ label, value = '', onChange, type = 'text' }: { label: string; value?: string; onChange: React.ChangeEventHandler<HTMLInputElement>; type?: string }) { const id = idFor(label); return <div><Label htmlFor={id}>{label} <span aria-hidden="true">*</span></Label><Input id={id} className="mt-2" type={type} value={value ?? ''} onChange={onChange} required /></div> }
function Text({ label, value = '', onChange }: { label: string; value?: string; onChange: React.ChangeEventHandler<HTMLTextAreaElement> }) { const id = idFor(label); return <div className="sm:col-span-2"><Label htmlFor={id}>{label} <span aria-hidden="true">*</span></Label><textarea id={id} className="mt-2 min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={value ?? ''} onChange={onChange} required /></div> }
function Select({ label, value, onChange, options, optional = false }: { label: string; value: string; onChange: React.ChangeEventHandler<HTMLSelectElement>; options: Array<string | { value: string; label: string }>; optional?: boolean }) { const id = idFor(label); return <div><Label htmlFor={id}>{label}{!optional ? <span aria-hidden="true"> *</span> : null}</Label><select id={id} className="mt-2 h-9 w-full rounded-lg border bg-background px-3 text-sm" value={value} onChange={onChange} required={!optional}><option value="">{optional ? 'None' : 'Select…'}</option>{options.map((option) => { const value = typeof option === 'string' ? option : option.value; return <option key={value} value={value}>{typeof option === 'string' ? humanize(option) : option.label}</option> })}</select></div> }
function Status({ value }: { value: string }) { return <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-medium">{humanize(value)}</span> }
function Empty({ children }: { children: React.ReactNode }) { return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p> }
function PageAlert({ title, message }: { title: string; message: string }) { return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>{title}</AlertTitle><AlertDescription>{message}</AlertDescription></Alert></main> }
function idFor(value: string) { return `work-${value.toLowerCase().replaceAll(' ', '-')}` }
function humanize(value: string) { return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase()) }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
