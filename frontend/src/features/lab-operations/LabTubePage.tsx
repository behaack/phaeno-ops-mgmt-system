import { LoadingState, EmptyState } from '#/components/ui/content-state'
import { DisplayTimestamp } from '#/components/ui/display-value'
import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { materialTones } from '#/features/lab-operations/lab-status'
import { FieldError } from '#/components/ui/field'
import { Field as PortalField } from '#/components/ui/field'
import { PageTitle } from '#/components/ui/page-header'
import { RecordLink } from '#/components/ui/record-link'
import { BackLink } from '#/components/ui/back-link'
import { confirmPortal } from '#/components/PortalConfirmation'
import { parseLabSection } from './lab-sections'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getLabAttempts, getLabContainerMoves, getLabOperationsError, getLabWorkOrder, reviewLabTubeIntake, type LabContainer } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { IntakeReviewFields } from './IntakeReviewFields'
import { LabLabelDialog } from './LabLabelDialog'
import { PhysicalLifecyclePanel } from './PhysicalLifecyclePanel'
import { BiologicalMaterialHistory } from './BiologicalMaterialHistory'
import { PreparationActions } from './preparation-ui'

const human = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')
export function LabTubePage({ workOrderId, containerId }: { workOrderId: string; containerId: string }) {
  const { session, authProvider } = usePhaenoSession()
  const enabled = Boolean(session?.capabilities.canManageLabOperations) && authProvider !== 'mock'
  const client = useQueryClient()
  const work = useQuery({ queryKey: ['lab-work-order', workOrderId], queryFn: () => getLabWorkOrder(workOrderId), enabled })
  const attempts = useQuery({ queryKey: ['lab-attempts', workOrderId], queryFn: () => getLabAttempts(workOrderId), enabled })
  const moves = useQuery({ queryKey: ['lab-container-moves', containerId], queryFn: () => getLabContainerMoves(containerId), enabled })
  const [action, setAction] = useState<'correct' | 'label' | 'physical' | 'box' | null>(null)
  const tube = work.data?.containers.find(t => t.id === containerId)
  const refresh = async () => { await Promise.all(['lab-work-order', 'lab-attempts', 'lab-execution', 'accession-packet', 'lab-operations', 'lab-container-moves', 'lab-physical', 'storage-box'].map(key => client.invalidateQueries({ queryKey: [key] }))) }
  if (!enabled || !tube || !work.data) return <main className="page-wrap p-6"><p role="status">{!enabled ? 'An assigned laboratory role and a connected session are required.' : work.isPending ? 'Loading tube details…' : getLabOperationsError(work.error, 'This tube could not be loaded.')}</p>{enabled ? <Button variant="outline" onClick={() => void work.refetch()}>Reload</Button> : null}</main>
  const specimen = attempts.data?.specimens.find(s => s.id === tube.labSpecimenId)
  const used = specimen?.attempts.some(a => a.sourceContainerId === tube.id && a.startedAtUtc)
    || work.data.executions.some(e => e.labSpecimenId === tube.labSpecimenId && e.startedAtUtc && !specimen?.attempts.some(a => a.executionIds.includes(e.id)))
  const canCorrect = Boolean(session?.capabilities.canSuperviseLabWork && attempts.data && tube.kind === 'SubmittedSpecimen' && !used && ['Available', 'Rejected', 'LabelPending'].includes(tube.status) && !['Cancelled', 'ReadyForRelease'].includes(work.data.workOrder.status) && specimen?.intakeDisposition !== 'Cancelled')
  const canPrint = session?.capabilities.canOperateLabWork && tube.barcodeSource === 'PhaenoGenerated' && tube.status !== 'Rejected'
  const canMove = Boolean((session?.capabilities.canOperateLabWork || session?.capabilities.canSuperviseLabWork) && !['Disposed', 'Returned', 'Transferred'].includes(tube.status) && (tube.status !== 'Rejected' || tube.location))
  const parent = work.data.containers.find(t => t.id === tube.parentContainerId)
  const children = work.data.containers.filter(t => t.parentContainerId === tube.id)
  const tubeLink = (t: LabContainer) => <span className="font-mono break-all"><RecordLink asChild><Link to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId, containerId: t.id }} >{t.barcode}</Link></RecordLink></span>
  return <main className="page-wrap space-y-5 px-4 py-8">
    <BackLink asChild><Link to="/lab-operations/$workOrderId" params={{ workOrderId }} search={previous => ({ ...previous, section: parseLabSection(previous.section) ?? 'jobs', tab: 'lineage' })}>Back to tubes</Link></BackLink>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><PageTitle className="break-all font-mono">{tube.barcode}</PageTitle><p className="mt-1 text-sm text-muted-foreground">{tube.label} · {human(tube.kind)}</p><div className="mt-2 flex flex-wrap gap-2"><DomainStatusBadge status={tube.status} tones={materialTones}>{human(tube.status)}</DomainStatusBadge>{tube.kind === 'SubmittedSpecimen' ? <Badge variant="secondary">Intake: {human(tube.intakeDisposition ?? 'Not recorded')}</Badge> : null}</div></div><PreparationActions triggerId="lab-tube-actions" items={[...(canCorrect ? [{ label: 'Correct intake decision', onClick: () => setAction('correct') }] : []), ...(canMove ? [{ label: 'Record physical action', onClick: () => setAction('physical') }, { label: 'Register or move freezer box', onClick: () => setAction('box') }] : []), ...(canPrint ? [{ label: tube.labelPrintCount ? 'Reprint label' : 'Print label', onClick: () => setAction('label') }] : [])]} /></header>
    <Card className="gap-0 py-0"><CardHeader ><CardTitle>Receipt and storage</CardTitle></CardHeader><CardContent className="space-y-3 p-4"><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Storage location</dt><dd className="break-all">{tube.location ?? 'Not stored'}</dd></div><div><dt className="text-sm text-muted-foreground">Barcode source</dt><dd>{human(tube.barcodeSource)}</dd></div>{tube.intakeReviewedAtUtc ? <div><dt className="text-sm text-muted-foreground">Intake recorded</dt><dd>{<DisplayTimestamp value={tube.intakeReviewedAtUtc} seconds />}</dd></div> : null}{tube.intakeReasonCode ? <div><dt className="text-sm text-muted-foreground">Intake reason</dt><dd>{human(tube.intakeReasonCode)}</dd></div> : null}{tube.retainUntilUtc ? <div><dt className="text-sm text-muted-foreground">Retain until</dt><dd>{<DisplayTimestamp value={tube.retainUntilUtc} seconds />}</dd></div> : null}</dl>{tube.intakeNotes ? <p className="whitespace-pre-wrap text-sm">{tube.intakeNotes}</p> : null}{tube.intakeDisposition === 'Rejected' ? <p className="text-sm">This rejected receipt is retained against its expected tube. It is unavailable for processing.</p> : null}{tube.kind === 'SubmittedSpecimen' && !tube.intakeDisposition ? <p className="text-sm">Intake has not been recorded. Complete it during accessioning with the shipping insert and the identified tube. A supervisor can document a correction to this earlier record.</p> : null}</CardContent></Card>
    <Card className="gap-0 py-0"><CardHeader ><CardTitle>Location history</CardTitle></CardHeader><CardContent className="p-4">{moves.isPending ? <LoadingState  label={<>Loading moves…</>} /> : moves.isError ? <div className="space-y-2"><p role="alert" className="text-sm">{getLabOperationsError(moves.error, 'Location history could not be loaded.')}</p><Button type="button" variant="outline" size="sm" onClick={() => void moves.refetch()}>Retry</Button></div> : moves.data?.length ? <ol className="space-y-2">{moves.data.map(move => <li key={move.id} className="rounded-md border p-3 text-sm"><p className="break-all">{move.previousLocation ?? 'No previous location'} → {move.destinationBarcode}</p><p className="text-xs text-muted-foreground">Recorded {<DisplayTimestamp value={move.occurredAtUtc} seconds />}</p></li>)}</ol> : <EmptyState  kind="empty" title={<>No moves recorded after accession.</>} />}</CardContent></Card>
    <Card className="gap-0 py-0"><CardHeader ><CardTitle>Lineage</CardTitle></CardHeader><CardContent className="space-y-3 p-4">{specimen ? <p className="text-sm">Specimen: <RecordLink asChild><Link to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId, specimenId: specimen.id }} search={previous => ({ ...previous, section: parseLabSection(previous.section) ?? 'jobs' })}>{specimen.name}</Link></RecordLink></p> : null}<p className="text-sm">Parent: {parent ? tubeLink(parent) : 'No parent container'}</p>{children.length ? <ul className="space-y-2">{children.map(t => <li className="rounded-lg border bg-muted/30 p-3" key={t.id}>{tubeLink(t)}<p className="mt-1 text-xs text-muted-foreground">{human(t.kind)} · {human(t.status)}</p></li>)}</ul> : <EmptyState  kind="empty" title={<>No derived containers recorded.</>} />}{used ? <p className="text-sm">This tube has processing history. Record later problems through the specimen attempt hold or failure actions; the intake decision is retained.</p> : null}</CardContent></Card>
    {['SubmittedSpecimen', 'Library', 'Sequencing'].includes(tube.kind) ? <BiologicalMaterialHistory workOrderId={workOrderId} tube={tube} /> : null}
    {action === 'correct' ? <IntakeCorrectionDialog tube={tube} workOrderId={workOrderId} onClose={() => setAction(null)} onSaved={async () => { setAction(null); await refresh() }} /> : null}
    {action === 'label' ? <LabLabelDialog returnFocusId="lab-tube-actions" container={tube} onClose={() => setAction(null)} onRecorded={refresh} /> : null}
    <PhysicalLifecyclePanel tube={tube} action={action === 'physical' || action === 'box' ? action : null} supervise={Boolean(session?.capabilities.canSuperviseLabWork)} onClose={() => setAction(null)} onSaved={refresh} />
  </main>
}

const correctionSchema = z.object({ location: z.string().trim().max(255) })
function IntakeCorrectionDialog({ tube, workOrderId, onClose, onSaved }: { tube: LabContainer; workOrderId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [original] = useState(tube)
  const [intake, setIntake] = useState({ disposition: tube.intakeDisposition ?? 'Accepted', reasonCode: tube.intakeReasonCode ?? '', notes: '' })
  const form = useForm<{ location: string }>({ resolver: zodResolver(correctionSchema.superRefine((v, ctx) => { if (!original.location && intake.disposition !== 'Rejected' && !v.location) ctx.addIssue({ code: 'custom', path: ['location'], message: 'Record where the retained material is stored.' }) })), defaultValues: { location: '' } })
  const { isDirty: __formDraftDirty } = form.formState

  const save = useMutation({ mutationFn: (values: { location: string }) => reviewLabTubeIntake(workOrderId, original.id, { disposition: intake.disposition, reasonCode: intake.reasonCode || null, notes: intake.notes, version: original.version, retainedStorageLocation: values.location || null }), retry: false, onSuccess: onSaved })
  const dirty = __formDraftDirty || intake.notes !== '' || intake.disposition !== (original.intakeDisposition ?? 'Accepted') || intake.reasonCode !== (original.intakeReasonCode ?? '')
  const confirmLeave = async () => !dirty || (await confirmPortal('Discard this unsaved intake correction?'))
  useBlocker({ shouldBlockFn: async () => save.isPending || !await confirmLeave(), enableBeforeUnload: () => dirty || save.isPending })
  const close = async () => { if (!save.isPending && await confirmLeave()) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><DialogHeader><DialogTitle>Correct intake decision</DialogTitle><DialogDescription>{original.barcode}. Explain the correction. This does not record a later processing failure or move stored material.</DialogDescription></DialogHeader><form id="intake-correction" className="space-y-4" onSubmit={form.handleSubmit(v => { if (!save.isPending) save.mutate(v) })}><IntakeReviewFields value={intake} onChange={setIntake} previousDisposition={original.intakeDisposition} correction disabled={save.isPending} />{!original.location && intake.disposition !== 'Rejected' ? <PortalField><Label htmlFor="correction-location"><RequiredFieldName>Retained material storage location</RequiredFieldName></Label><Input id="correction-location"  required {...form.register('location')} disabled={save.isPending} /><p className="mt-2 text-xs text-muted-foreground">Only restore acceptance if material actually exists and is suitable for use. A destroyed tube cannot be restored.</p>{form.formState.errors.location ? <FieldError role="alert" >{form.formState.errors.location.message}</FieldError> : null}</PortalField> : null}</form>{save.error ? <Alert variant="destructive"><AlertTitle>Correction was not saved</AlertTitle><AlertDescription>{getLabOperationsError(save.error, 'Your entries are preserved. Review the latest tube record before retrying.')}</AlertDescription></Alert> : null}<RequiredDialogFooter><Button variant="outline" disabled={save.isPending} onClick={close}>Cancel</Button><Button type="submit" form="intake-correction" disabled={save.isPending || !intake.notes.trim()}>{save.isPending ? 'Saving…' : 'Save correction'}</Button></RequiredDialogFooter></DialogContent></Dialog>
}
