import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { applyPreparation, findPreparationTubes, getPreparation, trayPositions, type PreparationCommand, type PreparationDetail, type PreparationStage } from '#/api/lab-preparation'
import { addLabBatchMember, getLabOperationsDashboard, getLabOperationsError } from '#/api/lab-operations'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import axios from 'axios'
import { usePhaenoSession } from '#/features/auth/session-context'
import { PreparationActions, PreparationFormDialog, PreparationPanel, prepRowClass, type PreparationFormField } from './preparation-ui'
import { PreparationStepDialog } from './PreparationStepDialog'
import type { ProtocolDefinition } from './protocol-definition'

type Action = { key: string; memberId?: string; position?: string; stageId?: string; coveredMemberIds?: string[] }
type StepAction = { stage: PreparationStage; step: ProtocolDefinition['steps'][number]; action: 'record' | 'repeat' | 'correct' }
const human = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2')
function evidenceOrigin(data: PreparationDetail, recordId: string | undefined, memberId: string, captureKey: string) {
  const original = data.records.find(r => r.id === recordId)?.details.step
  if (!original) return 'Individual observation'
  const exception = original.tubes.find(t => t.memberId === memberId)
  const shared = Object.hasOwn(original.sharedCaptures, captureKey)
  return shared ? exception && Object.hasOwn(exception.captures, captureKey) ? 'Tube exception' : 'Shared observation' : 'Individual observation'
}

export function PreparationBatchPage({ batchId }: { batchId: string }) {
  const { session, authProvider } = usePhaenoSession()
  const query = useQuery({ queryKey: ['lab-preparation', batchId], queryFn: () => getPreparation(batchId), enabled: Boolean(session?.capabilities.canManageLabOperations) && authProvider !== 'mock' })
  const resources = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled: Boolean(query.data) })
  const client = useQueryClient()
  const [action, setAction] = useState<Action | null>(null)
  const [stepAction, setStepAction] = useState<StepAction | null>(null)
  const [search, setSearch] = useState('')
  const request = useRef({ hash: '', id: '', version: 0 })
  const tubes = useQuery({ queryKey: ['lab-preparation-tubes', batchId, search], queryFn: () => findPreparationTubes(batchId, search), enabled: query.data?.status === 'Draft' && query.data.canOperate })
  const save = useMutation({ mutationFn: (input: Omit<PreparationCommand, 'requestId' | 'version'>) => {
    const hash = JSON.stringify(input)
    if (request.current.hash !== hash) request.current = { hash, id: crypto.randomUUID(), version: query.data!.version }
    return applyPreparation(batchId, { ...input, version: request.current.version, requestId: request.current.id })
  }, onSuccess: async data => {
    request.current.hash = ''
    client.setQueryData(['lab-preparation', batchId], data)
    await Promise.all([client.invalidateQueries({ queryKey: ['lab-preparation-tubes', batchId] }), client.invalidateQueries({ queryKey: ['lab-operations'] }), client.invalidateQueries({ queryKey: ['lab-attempts'] })])
    if (save.variables?.action === 'step') setStepAction(null)
    else setAction(null)
  }, onError: async error => {
    // A definite rejection permits a fresh reviewed command; an uncertain response must reuse the exact receipt.
    if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) request.current.hash = ''
    await client.invalidateQueries({ queryKey: ['lab-preparation', batchId] })
  } })
  const handoff = useMutation({ mutationFn: ({ batch, member }: { batch: string; member: PreparationDetail['members'][number] }) => addLabBatchMember(batch, { labLibraryId: member.library!.id, labWorkOrderId: member.workOrderId }),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['lab-preparation', batchId] }), client.invalidateQueries({ queryKey: ['lab-operations'] })]); setAction(null) },
    onError: async () => { await client.invalidateQueries({ queryKey: ['lab-preparation', batchId] }) } })
  const open = (target: Action) => { save.reset(); handoff.reset(); setAction(target) }
  if (!query.data) return <main className="page-wrap space-y-4 p-6"><Link to="/lab-operations" search={{ section: 'work' }} className="underline">Library prep</Link><p role={query.isError ? 'alert' : 'status'}>{query.isError ? getLabOperationsError(query.error, 'Batch could not be loaded.') : 'Loading preparation batch…'}</p><Button variant="outline" onClick={() => void query.refetch()}>Reload</Button></main>
  const data = query.data
  const participants = data.members.filter(m => !['Failed', 'Succeeded', 'Cancelled'].includes(m.state))
  const current = data.stages.find(stage => participants.some(m => m.executions.some(e => e.stageId === stage.id && ['InProgress', 'Blocked'].includes(e.status))))
  const editable = data.status === 'Draft' && data.canOperate
  const active = data.status === 'InProgress'
  const member = data.members.find(m => m.id === action?.memberId)
  const positions = trayPositions(data.layout)
  const emptyPositions = positions.filter(p => !data.layout.unavailable.includes(p) && !data.members.some(m => m.position === p))
  const error = save.isError ? `${getLabOperationsError(save.error, 'The action could not be saved.')} The latest batch is shown; review before saving again.` : undefined
  const todayUtc = new Date().toISOString().slice(0, 10)
  const fields: PreparationFormField[] = []
  if (action?.key === 'add') fields.push({ key: 'barcode', label: 'Scan source tube barcode', required: true }, { key: 'position', label: 'Tray position', required: true, defaultValue: action.position ?? emptyPositions[0], options: emptyPositions.map(p => ({ value: p, label: p })) })
  if (action?.key === 'move') fields.push({ key: 'position', label: 'New tray position', required: true, options: emptyPositions.map(p => ({ value: p, label: p })) })
  if (action?.key === 'output') {
    if (!member) fields.push({ key: 'member', label: 'Tube', required: true, options: participants.filter(m => !m.output).map(m => ({ value: m.id, label: `${m.position} · ${m.barcode}` })) })
    fields.push({ key: 'quantity', label: 'Actual output quantity', type: 'number', required: true }, { key: 'unit', label: 'Quantity unit', required: true }, { key: 'location', label: 'Storage location', required: true })
  }
  if (action?.key === 'select-output') fields.push({ key: 'output', label: 'Existing library output', required: true, options: member?.availableOutputs?.map(o => ({ value: o.id, label: `${o.barcode} · ${o.quantity} ${o.quantityUnit}` })) ?? [] }, { key: 'barcode', label: 'Scan existing output barcode', required: true })
  if (action?.key === 'confirm-output') fields.push({ key: 'barcode', label: 'Scan output barcode', required: true })
  if (action?.key === 'material') fields.push({ key: 'resource', label: 'Material lot', required: true, options: resources.data?.materialLots.filter(l => ['Passed', 'ApprovedException'].includes(l.qcDisposition) && (!l.expirationOrRetestDate || l.expirationOrRetestDate >= todayUtc)).map(l => ({ value: l.id, label: `${l.name} · ${l.lotNumber} · ${l.availableQuantity} ${l.quantityUnit}` })) ?? [] }, { key: 'quantity', label: 'Total quantity used for these tubes', type: 'number', required: true })
  if (action?.key === 'equipment') fields.push({ key: 'resource', label: 'Equipment', required: true, options: resources.data?.equipment.filter(e => e.status === 'Active' && (!e.calibrationDueOn || e.calibrationDueOn >= todayUtc)).map(e => ({ value: e.id, label: `${e.name} · ${e.assetCode}` })) ?? [] }, { key: 'reason', label: 'Run reference (optional)' })
  if (action?.key === 'fail') fields.push({ key: 'code', label: 'Failure reason', required: true, options: [{ value: 'analysis_failed', label: 'Analysis failed' }, { value: 'material_unusable', label: 'Material unusable' }, { value: 'equipment_incident', label: 'Equipment incident' }, { value: 'procedure_deviation', label: 'Procedure deviation' }, { value: 'other', label: 'Other' }] })
  if (action && ['fail', 'remove', 'cancel', 'skip-stage'].includes(action.key)) fields.push({ key: 'reason', label: 'Reason and evidence', type: 'textarea', required: true })
  if (action && ['start', 'complete', 'material', 'equipment'].includes(action.key)) fields.push({ key: 'confirm', label: action.key === 'start' ? 'Confirm the assembled tray' : action.key === 'complete' ? 'Confirm all tube outcomes' : 'Confirm resource coverage', required: true, options: [{ value: 'yes', label: 'Confirmed' }] })
  if (action?.key === 'sequencing') fields.push({ key: 'batch', label: 'Draft sequencing batch', required: true, options: resources.data?.batches.filter(b => b.status === 'Draft').map(b => ({ value: b.id, label: `${b.name} · ${b.batchNumber}` })) ?? [] })
  const titles: Record<string, string> = { add: 'Add tube to tray', move: 'Move tube', remove: 'Remove tube', cancel: 'Cancel draft batch', start: 'Start preparation', output: 'Create library output', 'select-output': 'Select existing output', 'confirm-output': 'Confirm output identity', material: 'Record material use', equipment: 'Record equipment use', fail: 'Close tube attempt as failed', advance: 'Complete stage', 'skip-stage': 'Skip stage', complete: 'Complete preparation batch', sequencing: 'Add to sequencing batch' }
  const submit = (v: Record<string, string>) => {
    if (!action) return
    if (action.key === 'sequencing' && member) { handoff.mutate({ batch: v.batch, member }); return }
    const lot = resources.data?.materialLots.find(l => l.id === v.resource)
    const selectedOutput = member?.availableOutputs?.find(o => o.id === v.output)
    save.mutate({ action: action.key === 'select-output' ? 'output' : action.key, memberId: action.memberId ?? v.member, stageId: action.stageId ?? current?.id, position: v.position, barcode: v.barcode,
      reason: v.reason, reasonCode: v.code, confirmed: v.confirm === 'yes', quantity: selectedOutput?.quantity ?? (v.quantity ? Number(v.quantity) : undefined), quantityUnit: action.key === 'material' ? lot?.quantityUnit : selectedOutput?.quantityUnit ?? v.unit,
      location: v.location, outputContainerId: selectedOutput?.id, resourceId: v.resource, resourceVersion: lot?.version,
      coveredMemberIds: ['material', 'equipment'].includes(action.key) ? action.coveredMemberIds ?? participants.filter(m => !m.blocker).map(m => m.id) : undefined })
  }
  return <main className="page-wrap space-y-5 px-4 py-6 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><Link className="text-sm underline" to="/lab-operations" search={{ section: 'work' }}>Library prep</Link><h1 className="mt-2 text-2xl font-semibold">{data.name}</h1><p className="mt-2 text-sm text-muted-foreground">{data.layout.name} · {data.members.length} tubes · {data.layout.rows * data.layout.columns} positions · <Badge variant="secondary">{human(data.status)}</Badge></p>{data.notes ? <p className="mt-2 whitespace-pre-wrap break-words text-sm">{data.notes}</p> : null}</div>
      <PreparationActions items={[
        ...(editable ? [{ label: 'Add tube', onClick: () => open({ key: 'add' }), disabled: !emptyPositions.length }, { label: 'Start preparation', onClick: () => open({ key: 'start' }), disabled: !data.members.length }, { label: 'Cancel draft batch', onClick: () => open({ key: 'cancel' }) }] : []),
        ...(active && data.canOperate ? [{ label: 'Complete preparation batch', onClick: () => open({ key: 'complete' }), disabled: data.members.some(m => m.state !== 'Failed' && (m.state !== 'Succeeded' || !m.library)) }] : []),
      ]} /></div>
    <p className="rounded-lg border bg-muted/30 p-4 text-sm">{editable ? 'Scan accepted tubes into positions. Jobs must have the same pinned workflow. Start locks the tray; reserves enter a new batch only after failure.' : data.status === 'Draft' ? 'This preparation batch is a draft. Your role provides read-only access; an Operator or Supervisor can assemble and start the tray.' : active ? current ? `Next: ${current.name}. Resolve each covered tube’s steps and QC before completing this stage.` : 'All attempts have outcomes. Review the outputs and close this batch.' : 'Preparation is closed. Tube identities, evidence and outputs are retained below.'}</p>
    <PreparationPanel title="Tray" description={editable ? 'Select an empty position to scan a tube. Empty positions are permitted.' : data.status === 'Draft' ? 'Draft tray positions are shown for review. Positions lock when preparation starts.' : 'Positions remain fixed for the duration of this batch.'}>
      {/* Keyboard users need a focus stop to scroll a wide tray without moving tube positions. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="overflow-x-auto" role="region" tabIndex={0} aria-label="Tray positions"><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${data.layout.columns}, minmax(5.5rem, 1fr))` }}>{positions.map(position => {
        const tube = data.members.find(m => m.position === position)
        const unavailable = data.layout.unavailable.includes(position)
        return <div key={position} className={`min-h-16 rounded-lg border p-2 text-sm ${unavailable ? 'bg-muted' : tube ? 'bg-primary/5' : 'bg-background'}`}>
          <strong>{position}</strong>{tube ? <><p className="mt-1 break-all text-xs">{tube.barcode}</p><p className="mt-1 text-xs">{human(tube.state)}</p></> : editable && !unavailable ? <Button size="sm" variant="ghost" className="mt-1 w-full" onClick={() => open({ key: 'add', position })}>Add</Button> : <p className="mt-1 text-xs text-muted-foreground">{unavailable ? 'Unavailable' : 'Empty'}</p>}
        </div>
      })}</div></div>
      {data.members.map(m => <details key={m.id} className={prepRowClass}><summary className="cursor-pointer text-sm"><strong>{m.position} · {m.barcode}</strong> · {m.jobName} · {human(m.state)}{m.state !== 'Failed' && m.output && !m.output.confirmed ? ' · Output scan needed' : ''}</summary><div className="mt-4 space-y-3 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><Link className="underline" to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId: m.workOrderId, specimenId: m.specimenId }} search={{ section: 'work' }}>{m.specimenName}</Link><p>Attempt {m.sequence}</p></div><PreparationActions items={[
          ...(editable ? [{ label: 'Move tube', onClick: () => open({ key: 'move', memberId: m.id }), disabled: !emptyPositions.length }, { label: 'Remove tube', onClick: () => open({ key: 'remove', memberId: m.id }) }] : []),
          ...(active && data.canOperate && !['Failed', 'Succeeded'].includes(m.state) ? [
            ...(!m.output ? [{ label: 'Create library output', onClick: () => open({ key: 'output', memberId: m.id }) }, ...(m.availableOutputs?.length ? [{ label: 'Select existing output', onClick: () => open({ key: 'select-output', memberId: m.id }) }] : [])] : !m.output.confirmed ? [{ label: 'Confirm output identity', onClick: () => open({ key: 'confirm-output', memberId: m.id }) }] : []),
            { label: 'Close attempt as failed', onClick: () => open({ key: 'fail', memberId: m.id }) },
          ] : []),
          ...(data.status === 'Complete' && data.canOperate && m.library?.status === 'QcPassed' && !m.library.sequencing ? [{ label: 'Add to sequencing batch', onClick: () => open({ key: 'sequencing', memberId: m.id }) }] : []),
        ]} /></div>
        {m.blocker ? <p className="text-destructive">{m.blocker}</p> : null}{m.failureEvidence ? <p>Failure evidence: {m.failureEvidence}. Any eligible reserve must enter a new preparation batch.</p> : null}
        {m.output ? <div><p>Output: <Link className="underline" to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId: m.workOrderId, containerId: m.output.id }} search={{ section: 'work' }}>{m.output.barcode}</Link> · {m.output.quantity} {m.output.quantityUnit}</p><p>{m.state === 'Failed' ? 'Output retained for traceability. This attempt failed and cannot supply a sequencing library.' : m.output.confirmed ? 'Output identity confirmed' : 'Label the output, then scan its barcode to confirm identity.'}</p></div> : null}
        {m.library ? <p>Library: {human(m.library.status)} · QC reused from preparation. {m.library.sequencing ? `Sequencing batch: ${m.library.sequencing.name} (${m.library.sequencing.batchNumber})` : 'No sequencing batch assigned.'}</p> : null}
        {m.executions.map(e => <div key={e.id}><p className="font-medium">{data.stages.find(s => s.id === e.stageId)?.name}: {human(e.status)}</p>{e.blockers.length && e.status !== 'Abandoned' ? <p className="mt-1 text-muted-foreground">{e.blockers[0]}</p> : null}<details className="mt-2"><summary className="cursor-pointer">Effective tube evidence ({e.evidence.records.length} entries)</summary>{e.evidence.records.map(r => <div key={r.id} className="mt-2 rounded border p-3"><p>{data.stages.find(s => s.id === e.stageId)?.definition.steps.find(s => s.key === r.stepKey)?.name} · {r.action} · {r.qcOutcome ?? r.outcome}</p><p className="text-xs text-muted-foreground">{new Date(r.recordedAtUtc).toLocaleString()} · {r.preparationRecordId ? 'Includes applicable shared preparation evidence' : 'Individual evidence'}</p>{Object.entries(r.captures).map(([key, value]) => <p key={key}>{data.stages.find(s => s.id === e.stageId)?.definition.steps.find(s => s.key === r.stepKey)?.captures.find(c => c.key === key)?.label ?? key}: {String(value)} <span className="text-xs text-muted-foreground">({evidenceOrigin(data, r.preparationRecordId, m.id, key)})</span></p>)}{r.reason ? <p>Reason: {r.reason}</p> : null}</div>)}</details></div>)}
      </div></details>)}
    </PreparationPanel>
    {editable ? <PreparationPanel title="Find eligible tubes" description="Accepted tubes from compatible jobs, including compatible unstarted source selections. Scan the physical barcode when adding."><label htmlFor="prep-tube-search" className="block text-sm">Search by tube barcode or job<Input id="prep-tube-search" className="mt-2" value={search} onChange={e => setSearch(e.target.value)} /></label>{tubes.isError ? <p role="alert">{getLabOperationsError(tubes.error, 'Tubes could not be loaded.')}</p> : null}{tubes.data?.length ? tubes.data.map(t => <div key={t.id} className={`${prepRowClass} text-sm`}><strong>{t.barcode}</strong><p>{t.jobName} · {t.specimenName} · {t.location}</p></div>) : <p className="text-sm text-muted-foreground">No eligible tubes found. Check accession, tube acceptance, source reservations and the job’s pinned workflow.</p>}</PreparationPanel> : null}
    {data.status !== 'Draft' && data.status !== 'Cancelled' ? <PreparationPanel title="Preparation steps" description="Complete the workflow in order. Holds remain unresolved until a permitted repeat or correction passes, or the attempt is explicitly failed.">
      {data.stages.map(stage => <div key={stage.id} className={`relative ${prepRowClass}`}><details open={stage.id === current?.id}><summary className="min-h-9 cursor-pointer py-1.5 pr-28 font-medium">{stage.sequence}. {stage.name}</summary><div className="mt-4 space-y-3">{stage.definition.steps.map(step => {
        const permitted = step.requiredRole ? data.roles.includes(step.requiredRole) : data.canOperate
        const inStage = participants.filter(m => m.executions.some(e => e.stageId === stage.id && ['InProgress', 'Blocked'].includes(e.status)))
        const target = inStage.filter(m => !m.blocker && !m.executions.find(e => e.stageId === stage.id)?.stepPrerequisites?.[step.key]?.length)
        const blocked = inStage.filter(m => !target.includes(m)).map(m => `${m.position}: ${m.blocker ?? m.executions.find(e => e.stageId === stage.id)?.stepPrerequisites?.[step.key]?.[0]}`)
        const hasPrior = target.some(m => m.executions.find(e => e.stageId === stage.id)?.evidence.records.some(r => r.stepKey === step.key))
        const missing = target.some(m => !m.executions.find(e => e.stageId === stage.id)?.evidence.records.some(r => r.stepKey === step.key))
        const showStep = (a: StepAction['action']) => { save.reset(); setStepAction({ stage, step, action: a }) }
        return <div key={step.key} className="flex flex-wrap items-start justify-between gap-3 rounded border bg-background p-3"><div className="min-w-0"><h3 className="font-medium">{step.name}</h3><p className="mt-1 text-xs text-muted-foreground">{step.captures.map(c => `${c.label}: ${c.scope === 'batch' ? 'shared batch observation' : c.scope === 'shared' ? 'shared with exceptions' : 'per tube'}`).join(' · ') || 'Procedure confirmation'}</p>{blocked.length ? <p className="mt-2 text-sm text-muted-foreground">{blocked.join(' ')} </p> : null}{!permitted ? <p className="text-sm">Requires {step.requiredRole ?? 'Operator or Supervisor'}.</p> : null}</div><PreparationActions items={active && permitted && stage.id === current?.id ? [
          ...(missing ? [{ label: 'Record step', onClick: () => showStep('record') }] : []), ...(hasPrior && step.repeatable ? [{ label: 'Repeat step', onClick: () => showStep('repeat') }] : []), ...(hasPrior && data.canCorrect ? [{ label: 'Correct step', onClick: () => showStep('correct') }] : []),
        ] : []} /></div>
      })}</div></details>{active && data.canOperate && stage.id === current?.id ? <div className="absolute right-4 top-4"><PreparationActions items={[{ label: 'Complete stage', onClick: () => open({ key: 'advance', stageId: stage.id }) }, ...(stage.requirement !== 'Required' ? [{ label: 'Skip stage', onClick: () => open({ key: 'skip-stage', stageId: stage.id }) }] : []), { label: 'Record material use', onClick: () => open({ key: 'material', stageId: stage.id }) }, { label: 'Record equipment use', onClick: () => open({ key: 'equipment', stageId: stage.id }) }]} /></div> : null}</div>)}
    </PreparationPanel> : null}
    <PreparationPanel title="Sequencing handoff" description="Passing libraries retain their preparation evidence. Scientific review and result release remain separate.">{data.status === 'InProgress' ? <p className="text-sm">Close the preparation batch after accounting for every tube to enable sequencing handoff.</p> : null}<p className="text-sm">{data.status === 'Complete' ? data.members.filter(m => m.library?.status === 'QcPassed').length : 0} eligible libraries · {data.members.filter(m => m.library?.sequencing).length} already assigned</p><Button variant="outline" asChild><Link to="/lab-operations" search={{ section: 'batches' }}>Open sequencing batches</Link></Button></PreparationPanel>
    <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Batch history ({data.records.length} entries)</summary><div className="mt-4 space-y-3">{data.records.map(r => <div key={r.id} className={prepRowClass}><p className="text-sm">{human(r.action)} · {new Date(r.recordedAtUtc).toLocaleString()}</p>{r.details.step ? <><p className="text-sm">{r.details.step.coveredMemberIds.map(id => data.members.find(m => m.id === id)?.position ?? 'Historical tube').join(', ')} · {r.details.step.action}</p><p className="text-xs text-muted-foreground">Shared observations, recorded once:</p>{Object.entries(r.details.step.sharedCaptures).map(([key, value]) => <p key={key} className="text-sm">{data.stages.find(s => s.id === r.details.step?.stageId)?.definition.steps.find(s => s.key === r.details.step?.stepKey)?.captures.find(c => c.key === key)?.label ?? key}: {String(value)}</p>)}{r.details.step.reason ? <p className="text-sm">{r.details.step.reason}</p> : null}</> : r.details.coveredMemberIds ? <p className="text-sm">{resources.data?.materialLots.find(l => l.id === r.details.resourceId)?.lotNumber ?? resources.data?.equipment.find(e => e.id === r.details.resourceId)?.name ?? 'Recorded resource'} · Coverage: {r.details.coveredMemberIds.map(id => data.members.find(m => m.id === id)?.position).join(', ')}{r.details.quantity ? ` · Total ${r.details.quantity} ${r.details.quantityUnit}` : ''}</p> : r.details.reason ? <p className="text-sm">{r.details.reason}</p> : null}</div>)}</div></details>
    {stepAction ? <PreparationStepDialog batch={data} {...stepAction} pending={save.isPending} error={error} onClose={() => setStepAction(null)} onSubmit={step => save.mutate({ action: 'step', step })} onResource={(key, coveredMemberIds) => open({ key, stageId: stepAction.stage.id, coveredMemberIds })} /> : null}
    {action ? <PreparationFormDialog key={`${action.key}-${action.memberId ?? ''}-${action.position ?? ''}`} title={titles[action.key]} description={`${member ? `${member.position} · ${member.barcode}. ` : ''}${action.key === 'start' ? 'Starting locks all tube identities, positions and the workflow version.' : action.key === 'advance' ? 'All participating tubes must have resolved steps and QC. The final stage also requires confirmed outputs.' : action.key === 'fail' ? 'Failure closes only this tube’s attempt. A reserve must enter a new batch.' : action.key === 'confirm-output' ? `Expected output: ${member?.output?.barcode}.` : ['material', 'equipment'].includes(action.key) ? `One use record covers: ${participants.filter(m => !m.blocker && (!action.coveredMemberIds || action.coveredMemberIds.includes(m.id))).map(m => m.position).join(', ')}.` : 'Changes are checked against the current batch and retained in its history.'}`} fields={fields} onClose={() => setAction(null)} onSubmit={submit} pending={save.isPending || handoff.isPending} error={handoff.isError ? getLabOperationsError(handoff.error, 'Library could not be added.') : error} submitLabel={titles[action.key]}>{action.key === 'advance' ? <div className="space-y-3 text-sm"><p>Complete <strong>{data.stages.find(stage => stage.id === action.stageId)?.name}</strong> in <strong>{data.name}</strong>?</p><p>This closes the stage for its participating tubes and moves them to the next workflow stage, or finishes their preparation when this is the final stage. The batch is closed separately. Recorded evidence remains in history.</p></div> : null}</PreparationFormDialog> : null}
  </main>
}
