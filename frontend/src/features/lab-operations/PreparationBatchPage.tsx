import { preparationResourceFields } from './preparation-ui'
import { isAutomaticSpecimenReference, isOptionalPreparationReference, isOptionalSyntheticQcReference, isSharedIdentityCheckDate, preparationFailureReasons } from './preparation-evidence'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { applyPreparation, applyPreparationWithQcReport, findPreparationTubes, getPreparation, trayPositions, type PreparationCommand, type PreparationDetail, type PreparationStage } from '#/api/lab-preparation'
import { addLabBatchMember, getLabOperationsDashboard, getLabOperationsError } from '#/api/lab-operations'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import axios from 'axios'
import { usePhaenoSession } from '#/features/auth/session-context'
import { PreparationActions, PreparationFormDialog, PreparationPanel, prepRowClass, type PreparationFormField } from './preparation-ui'
import { PreparationOutputsDialog } from './PreparationOutputsDialog'
import { PreparationStepDialog } from './PreparationStepDialog'
import { PreparationQcReportDownload } from './PreparationQcReportDownload'
import { PreparationTray } from './PreparationTray'
import { PreparationProgress } from './PreparationProgress'
import { StepPerformanceEvidence } from './StepPerformanceEvidence'
import { preparationProgress } from './preparation-progress'
import type { ProtocolDefinition } from './protocol-definition'

type Action = { key: string; memberId?: string; position?: string; stageId?: string; coveredMemberIds?: string[] }
type StepAction = { stage: PreparationStage; step: ProtocolDefinition['steps'][number]; action: 'record' | 'repeat' | 'correct' }
const human = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2')
function evidenceOrigin(data: PreparationDetail, recordId: string | undefined, memberId: string, captureKey: string) {
  const original = data.records.find(r => r.id === recordId)?.details.step
  if (!original) return 'Sample entry'
  const exception = original.tubes.find(t => t.memberId === memberId)
  const shared = Object.hasOwn(original.sharedCaptures, captureKey)
  return shared ? exception && Object.hasOwn(exception.captures, captureKey) ? 'Tube exception' : 'Batch entry' : 'Sample entry'
}

export function PreparationBatchPage({ batchId }: { batchId: string }) {
  const { session, authProvider } = usePhaenoSession()
  const canAccess = Boolean(session?.capabilities.canManageLabOperations)
  const query = useQuery({ queryKey: ['lab-preparation', batchId], queryFn: () => getPreparation(batchId), enabled: canAccess && authProvider !== 'mock' })
  const resources = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled: canAccess && Boolean(query.data) })
  const client = useQueryClient()
  const [action, setAction] = useState<Action | null>(null)
  const [stepAction, setStepAction] = useState<StepAction | null>(null)
  const [search, setSearch] = useState('')
  const [freezerBox, setFreezerBox] = useState('')
  const [tubePage, setTubePage] = useState(1)
  const nextRef = useRef<HTMLDivElement>(null)
  const trayRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const handoffRef = useRef<HTMLDivElement>(null)
  const request = useRef({ hash: '', id: '', version: 0 })
  const evaluatedConditions = useRef('')
  const starting = useRef(false)
  const tubes = useQuery({ queryKey: ['lab-preparation-tubes', batchId, search.trim(), freezerBox.trim(), tubePage], queryFn: () => findPreparationTubes(batchId, search, freezerBox, tubePage), enabled: canAccess && query.data?.status === 'Draft' && query.data.canOperate && !query.data.trayConfirmed,
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === batchId && previousQuery.queryKey[2] === search.trim() && previousQuery.queryKey[3] === freezerBox.trim() ? previous : undefined })
  const save = useMutation({ mutationFn: async ({ report, ...input }: Omit<PreparationCommand, 'requestId' | 'version'> & { report?: File }) => {
    const digest = report ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await report.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('') : undefined
    const hash = JSON.stringify({ input, report: report ? { name: report.name, size: report.size, digest } : undefined })
    if (request.current.hash !== hash) request.current = { hash, id: crypto.randomUUID(), version: query.data!.version }
    const command = { ...input, version: request.current.version, requestId: request.current.id }
    return report ? applyPreparationWithQcReport(batchId, command, report, query.data?.optionalPreparationReports === true) : applyPreparation(batchId, command)
  }, onSuccess: async data => {
    request.current.hash = ''
    client.setQueryData(['lab-preparation', batchId], data)
    await Promise.all([client.invalidateQueries({ queryKey: ['lab-preparation-tubes', batchId] }), client.invalidateQueries({ queryKey: ['lab-operations'] }), client.invalidateQueries({ queryKey: ['lab-attempts'] })])
    if (save.variables?.action === 'step') setStepAction(null)
    else if (save.variables?.action !== 'outputs') setAction(null)
    if (['confirm-tray', 'reopen-tray', 'start', 'advance', 'skip-stage', 'complete'].includes(save.variables?.action ?? '')) requestAnimationFrame(() => nextRef.current?.focus())
  }, onError: async error => {
    // A definite rejection permits a fresh reviewed command; an uncertain response must reuse the exact receipt.
    if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) request.current.hash = ''
    await client.invalidateQueries({ queryKey: ['lab-preparation', batchId] })
  } })
  const handoff = useMutation({ mutationFn: ({ batch, member }: { batch: string; member: PreparationDetail['members'][number] }) => addLabBatchMember(batch, { labLibraryId: member.library!.id, labWorkOrderId: member.workOrderId }),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['lab-preparation', batchId] }), client.invalidateQueries({ queryKey: ['lab-operations'] })]); setAction(null); requestAnimationFrame(() => nextRef.current?.focus()) },
    onError: async () => { await client.invalidateQueries({ queryKey: ['lab-preparation', batchId] }) } })
  const reconcileConditions = save.mutate
  const automaticSkipAvailable = canAccess && authProvider !== 'mock' && query.data?.automaticSkipAvailable === true && query.data.canOperate
  const batchVersion = query.data?.version
  useEffect(() => {
    if (!automaticSkipAvailable || save.isPending || action || stepAction) return
    const key = `${batchId}:${batchVersion}`
    if (evaluatedConditions.current === key) return
    evaluatedConditions.current = key
    reconcileConditions({ action: 'evaluate-conditions' })
  }, [automaticSkipAvailable, save.isPending, action, stepAction, batchId, batchVersion, reconcileConditions])
  const open = (target: Action) => { save.reset(); handoff.reset(); setAction(target.key === 'output' && !target.memberId ? { ...target, key: 'outputs' } : target) }
  if (!session) return <main className="page-wrap p-6"><p role="status">Checking laboratory access…</p></main>
  if (!canAccess) return <main className="page-wrap space-y-4 p-6"><h1 className="text-2xl font-semibold">Preparation unavailable</h1><p role="alert">An assigned Phaeno laboratory role is required.</p><Link to="/" className="underline">Back to dashboard</Link></main>
  if (!query.data) return <main className="page-wrap space-y-4 p-6"><Link to="/lab-operations" search={{ section: 'work' }} className="underline">Library prep</Link><p role={query.isError ? 'alert' : 'status'}>{query.isError ? getLabOperationsError(query.error, 'Batch could not be loaded.') : 'Loading preparation batch…'}</p><Button variant="outline" onClick={() => void query.refetch()}>Reload</Button></main>
  const data = query.data
  const recorders = new Map(data.recorders?.map(person => [person.id, person.name]) ?? [])
  const progress = preparationProgress(data)
  const participants = progress.participants
  const current = progress.stage
  const editable = data.status === 'Draft' && data.canOperate && !data.trayConfirmed
  const active = data.status === 'InProgress'
  const member = data.members.find(m => m.id === action?.memberId)
  const positions = trayPositions(data.layout)
  const emptyPositions = positions.filter(p => !data.layout.unavailable.includes(p) && !data.members.some(m => m.position === p))
  const error = save.isError ? `${getLabOperationsError(save.error, 'The action could not be saved.')} The latest batch is shown; review before saving again.` : undefined
  const todayUtc = new Date().toISOString().slice(0, 10)
  const fields: PreparationFormField[] = []
  if (action?.key === 'move') fields.push({ key: 'position', label: 'New tray position', required: true, options: emptyPositions.map(p => ({ value: p, label: p })) })
  if (action?.key === 'output') {
    if (!member) fields.push({ key: 'member', label: 'Tube', required: true, options: participants.filter(m => !m.output).map(m => ({ value: m.id, label: `${m.position} · ${m.barcode}` })) })
    fields.push({ key: 'quantity', label: 'Actual output quantity', type: 'number', required: true }, { key: 'unit', label: 'Quantity unit', required: true }, { key: 'location', label: 'Storage location', required: true })
  }
  if (action?.key === 'select-output') fields.push({ key: 'output', label: 'Existing library output', required: true, options: member?.availableOutputs?.map(o => ({ value: o.id, label: `${o.barcode} · ${o.quantity} ${o.quantityUnit}` })) ?? [] }, { key: 'barcode', label: 'Scan existing output barcode', required: true })
  if (action?.key === 'confirm-output') fields.push({ key: 'barcode', label: 'Scan output barcode', required: true })
  if (action?.key === 'material') fields.push(...preparationResourceFields('material', resources.data?.materialLots.filter(l => !l.quantityHoldReason && ['Passed', 'ApprovedException'].includes(l.qcDisposition) && (!l.expirationOrRetestDate || l.expirationOrRetestDate >= todayUtc)).map(l => ({ value: l.id, label: `${l.name} · ${l.lotNumber} · ${l.availableQuantity} ${l.quantityUnit}` })) ?? []))
  if (action?.key === 'equipment') fields.push(...preparationResourceFields('equipment', resources.data?.equipment.filter(e => e.status === 'Active' && (!e.calibrationDueOn || e.calibrationDueOn >= todayUtc)).map(e => ({ value: e.id, label: `${e.name} · ${e.assetCode}` })) ?? []))
  if (action?.key === 'fail') fields.push({ key: 'code', label: 'Failure reason', required: true, options: preparationFailureReasons })
  if (action && ['fail', 'resume', 'remove', 'cancel', 'skip-stage', 'reopen-tray'].includes(action.key)) fields.push({ key: 'reason', label: 'Reason and evidence', type: 'textarea', required: true })
  if (action && ['confirm-tray', 'complete'].includes(action.key)) fields.push({ key: 'confirm', label: action.key === 'confirm-tray' ? 'I reviewed the tray identities and positions' : action.key === 'complete' ? 'Confirm all tube outcomes' : 'Confirm resource coverage', required: true, ...(action.key === 'confirm-tray' ? { type: 'checkbox' as const } : { options: [{ value: 'yes', label: 'Confirmed' }] }) })
  if (action?.key === 'sequencing') fields.push({ key: 'batch', label: 'Draft sequencing batch', required: true, options: resources.data?.batches.filter(b => b.status === 'Draft').map(b => ({ value: b.id, label: `${b.name} · ${b.batchNumber}` })) ?? [] })
  const titles: Record<string, string> = { resume: 'Resolve tube hold', 'confirm-tray': 'Confirm tray', 'reopen-tray': 'Edit tray', move: 'Move tube', remove: 'Remove tube', cancel: 'Cancel draft batch', output: 'Create library output', 'select-output': 'Select existing output', 'confirm-output': 'Confirm output identity', material: 'Record material use', equipment: 'Record equipment use', fail: 'Close tube attempt as failed', advance: 'Complete protocol', 'skip-stage': 'Skip stage', complete: 'Complete preparation batch', sequencing: 'Add to sequencing batch' }
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
  const showArea = (area: HTMLDivElement | null) => {
    area?.querySelector<HTMLButtonElement>('[data-tray-toggle][aria-expanded="false"]')?.click()
    area?.scrollIntoView({ block: 'start' })
    area?.focus({ preventScroll: true })
  }
  let nextTitle = data.trayBarcode ? 'Load tubes into the tray' : 'Scan the physical tray'
  let nextDescription = data.trayBarcode ? 'Scan tubes into the saved tray below. Partial trays are permitted.' : 'Scan and save the physical tray barcode, then scan tubes into their positions. Partial trays are permitted.'
  let nextAction: { label: string; run: () => void } | undefined
  if (progress.phase === 0 && data.trayBarcode && data.members.length > 0) {
    nextTitle = 'Review and confirm the tray'
    nextDescription = 'Continue loading tubes as needed. When ready, review their positions and choose Confirm tray. Partial trays are permitted; confirmation locks the contents.'
  } else if (progress.phase === 1 && data.status === 'Draft') {
    nextTitle = 'Prepare libraries'
    nextDescription = 'The tray is confirmed. Start preparation when laboratory work begins. This records the start time and prevents further tray edits.'
    nextAction = data.canOperate ? { label: save.isPending && save.variables?.action === 'start' ? 'Starting…' : 'Start preparation', run: () => {
      if (starting.current || save.isPending || !data.trayConfirmed) return
      starting.current = true
      save.reset()
      save.mutate({ action: 'start', confirmed: true }, { onSettled: () => { starting.current = false } })
    } } : undefined
  } else if (progress.phase === 1) {
    nextTitle = current ? `Prepare libraries · ${current.name}` : 'Review unresolved tube outcomes'
    nextDescription = 'Record the current step and complete its entries and QC before moving forward.'
    nextAction = { label: 'Review preparation', run: () => showArea(current ? stepsRef.current : trayRef.current) }
    if (current && progress.nextStep) {
      const step = progress.nextStep
      nextTitle = `Protocol ${current.sequence} · Step ${current.definition.steps.findIndex(item => item.key === step.key) + 1} — ${step.name}`
      nextDescription = `${current.name}. Complete the required entries for the selected samples.${step.requiredRole && !data.roles.includes(step.requiredRole) ? ` Requires ${step.requiredRole}.` : ''}`
      if (step.requiredRole ? data.roles.includes(step.requiredRole) : data.canOperate) nextAction = { label: 'Record step', run: () => { save.reset(); setStepAction({ stage: current, step, action: 'record' }) } }
    } else if (current && progress.readyToAdvance) {
      nextTitle = `Complete ${current.name}`
      nextDescription = progress.finalStage ? 'All required entries and output identities are recorded. Complete this protocol to establish the library outcomes.' : 'Required entries are complete. Complete this protocol to continue to the next one.'
      nextAction = data.canOperate ? { label: 'Complete protocol', run: () => open({ key: 'advance', stageId: current.id }) } : undefined
    } else if (progress.finalStage && progress.evidenceReady && !progress.outputsReady) {
      nextTitle = 'Record and verify library outputs'
      nextDescription = 'Select each successful tube in the tray to create or select its library output, then scan the output barcode.'
      nextAction = { label: 'Review library outputs', run: () => showArea(trayRef.current) }
    } else {
      const blocker = participants.find(m => m.blocker)?.blocker ?? progress.stageMembers.flatMap(m => m.executions.find(e => e.stageId === current?.id)?.blockers ?? [])[0]
      if (blocker) nextDescription = blocker
    }
  } else if (progress.phase === 2) {
    nextTitle = 'Complete the preparation batch'
    nextDescription = 'Every tube has a recorded outcome. Review those outcomes and close the batch.'
    nextAction = data.canOperate ? { label: 'Complete preparation batch', run: () => open({ key: 'complete' }) } : undefined
  } else if (progress.phase === 3) {
    nextTitle = 'Assign libraries to sequencing'
    nextDescription = 'Preparation is complete. The passing libraries below are ready for a sequencing batch.'
    nextAction = { label: 'Review sequencing handoff', run: () => showArea(handoffRef.current) }
  } else if (progress.phase === -1) {
    nextTitle = data.status === 'Cancelled' ? 'Batch cancelled' : progress.handoffDone ? 'Sequencing handoff recorded' : 'Preparation complete — no passing libraries'
    nextDescription = data.status === 'Cancelled' ? 'The saved tray and history remain available for reference.' : progress.handoffDone ? 'All passing libraries are assigned to sequencing batches. Review their destinations below.' : 'All tube outcomes are retained. There are no passing libraries to send to sequencing.'
    nextAction = undefined
  }
  if (automaticSkipAvailable) {
    nextTitle = 'Skipping the review that does not apply'
    nextDescription = 'No active sample has a Hold or Fail in its input QC history. The automatic skip is being recorded.'
    nextAction = save.isError ? { label: 'Retry automatic skip', run: () => save.mutate({ action: 'evaluate-conditions' }) } : undefined
    if (save.isError) nextDescription = 'The automatic skip could not be saved. Retry to continue.'
  }
  if (!data.canOperate && data.status === 'Draft') nextDescription += ' An Operator or Supervisor must perform this action.'
  const outputsRelevant = active && (progress.finalStage && progress.evidenceReady || current?.definition.steps.some(step => step.preparedOutputs.length > 0 && progress.stageMembers.some(m => !m.executions.find(e => e.stageId === current.id)?.stepPrerequisites?.[step.key]?.length)))
  const eligibleTubes = editable ? <details className="group/tubes border-t pt-2">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-sm py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 group-open/tubes:rotate-90" />Find eligible tubes
      </summary>
      <div className="space-y-3 pt-2"><p className="text-sm text-muted-foreground">Accepted tubes from compatible jobs, including compatible unstarted source selections. Scan the physical barcode when adding.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor="prep-tube-search" className="block text-sm">Search by tube barcode or job</label><p id="prep-tube-search-help" className="mt-1 text-xs text-muted-foreground">Enter a tube barcode or job reference.</p><Input id="prep-tube-search" className="mt-2" value={search} onChange={e => { setSearch(e.target.value); setTubePage(1) }} aria-describedby="prep-tube-search-help" /></div>
        <div><label htmlFor="prep-freezer-box" className="block text-sm">Freezer box barcode</label><p id="prep-freezer-box-help" className="mt-1 text-xs text-muted-foreground">Scan a box or enter part of its barcode.</p><Input id="prep-freezer-box" className="mt-2" value={freezerBox} onChange={e => { setFreezerBox(e.target.value); setTubePage(1) }} autoComplete="off" spellCheck={false} maxLength={255} aria-describedby="prep-freezer-box-help" /></div>
      </div>
      {search || freezerBox ? <Button size="sm" variant="outline" onClick={() => { setSearch(''); setFreezerBox(''); setTubePage(1) }}>Clear filters</Button> : null}
      {tubes.isFetching && !tubes.isPending ? <p role="status" className="text-xs text-muted-foreground">Updating eligible tubes…</p> : null}
      {tubes.isError ? <p role="alert">{getLabOperationsError(tubes.error, 'Tubes could not be loaded.')}</p> : tubes.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading eligible tubes…</p> : tubes.data?.items.length ? tubes.data.items.map(t => <div key={t.id} className={`${prepRowClass} text-sm`}><strong>{t.barcode}</strong><p>{t.jobName} · {t.specimenName}</p><p className="text-muted-foreground">Freezer box: {t.location || 'Not recorded'}</p></div>) : <p role="status" className="text-sm text-muted-foreground">{search.trim() || freezerBox.trim() ? 'No eligible tubes match these filters. Change the search or clear the filters.' : 'No eligible tubes found for this service. Check accession, tube acceptance and source reservations. An existing attempt must use this batch’s workflow version.'}</p>}
      {tubes.data && !tubes.isError ? <nav aria-label="Eligible tube pages" className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <p className="text-xs text-muted-foreground" role="status">{tubes.data.totalCount} eligible {tubes.data.totalCount === 1 ? 'tube' : 'tubes'} · Page {tubes.data.page} of {tubes.data.totalPages}</p>
        <div className="flex gap-2"><Button size="sm" variant="outline" disabled={tubes.data.page <= 1 || tubes.isFetching} onClick={() => setTubePage(tubes.data!.page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={tubes.data.page >= tubes.data.totalPages || tubes.isFetching} onClick={() => setTubePage(tubes.data!.page + 1)}>Next</Button></div>
      </nav> : null}
      </div>
    </details> : null
  return <main className="page-wrap space-y-5 px-4 py-6 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><Link className="text-sm underline" to="/lab-operations" search={{ section: 'work' }}>Library prep</Link><h1 className="mt-2 text-2xl font-semibold">{data.name}</h1><p className="mt-2 text-sm text-muted-foreground">{data.layout.name} · {data.members.length} tubes · {data.layout.rows * data.layout.columns} positions · <Badge variant="secondary">{human(data.status)}</Badge></p>{data.notes ? <p className="mt-2 whitespace-pre-wrap break-words text-sm">{data.notes}</p> : null}</div>
      <PreparationActions items={data.status === 'Draft' && data.canOperate ? [
        ...(data.trayConfirmed ? [{ label: 'Edit tray', onClick: () => open({ key: 'reopen-tray' }), disabled: save.isPending }] : []),
        { label: 'Cancel draft batch', onClick: () => open({ key: 'cancel' }), disabled: save.isPending },
      ] : []} /></div>
    <PreparationProgress batch={data} title={nextTitle} description={nextDescription} nextRef={nextRef} action={nextAction ? <Button disabled={save.isPending || handoff.isPending} onClick={nextAction.run}>{nextAction.label}</Button> : undefined} />
    {['start', 'evaluate-conditions'].includes(save.variables?.action ?? '') && error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
    <div ref={trayRef} tabIndex={-1} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <PreparationTray key={batchId} onConfirmTray={() => open({ key: 'confirm-tray' })} eligibleTubes={eligibleTubes} batch={data} pending={save.isPending || handoff.isPending} onScan={(position, barcode) => save.mutateAsync({ action: 'add', position, barcode })} onTrayScan={barcode => save.mutateAsync({ action: 'assign-tray', barcode })}>
      {selectedMemberId => data.members.filter(m => m.id === selectedMemberId).map(m => <section key={m.id} aria-label={`Tube details for ${m.position}`} className={prepRowClass}><h3 className="text-sm"><strong>{m.position} · {m.barcode}</strong> · {m.jobName} · {human(m.state)}{m.state !== 'Failed' && m.output && !m.output.confirmed ? ' · Output scan needed' : ''}</h3><div className="mt-4 space-y-3 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><Link className="underline" to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId: m.workOrderId, specimenId: m.specimenId }} search={{ section: 'work' }}>{m.specimenName}</Link><p>Attempt {m.sequence}</p></div><PreparationActions items={[
          ...(active && data.canCorrect && m.operationalHold ? [{ label: 'Resolve hold', onClick: () => open({ key: 'resume', memberId: m.id }) }] : []),
          ...(editable ? [{ label: 'Move tube', onClick: () => open({ key: 'move', memberId: m.id }), disabled: !emptyPositions.length || save.isPending }, { label: 'Remove tube', onClick: () => open({ key: 'remove', memberId: m.id }), disabled: save.isPending }] : []),
          ...(active && data.canOperate && !['Failed', 'Succeeded'].includes(m.state) ? [
            ...(outputsRelevant && !m.output ? [{ label: 'Create library output', onClick: () => open({ key: 'output', memberId: m.id }) }, ...(m.availableOutputs?.length ? [{ label: 'Select existing output', onClick: () => open({ key: 'select-output', memberId: m.id }) }] : [])] : m.output && !m.output.confirmed ? [{ label: 'Confirm output identity', onClick: () => open({ key: 'confirm-output', memberId: m.id }) }] : []),
            { label: 'Close attempt as failed', onClick: () => open({ key: 'fail', memberId: m.id }) },
          ] : []),
          ...(data.status === 'Complete' && data.canOperate && m.library?.status === 'QcPassed' && !m.library.sequencing ? [{ label: 'Add to sequencing batch', onClick: () => open({ key: 'sequencing', memberId: m.id }) }] : []),
        ]} /></div>
        <dl className="grid grid-cols-1 gap-3 rounded-md border bg-background p-3 sm:grid-cols-2">
          <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Specimen type</dt><dd className="mt-1 whitespace-pre-wrap break-words">{m.biologicalSource === undefined ? 'Not available' : m.biologicalSource?.trim() || 'Not recorded'}</dd></div>
          <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Declared safety information</dt><dd className="mt-1 whitespace-pre-wrap break-words">{m.safetyInformation === undefined ? 'Not available' : m.safetyInformation?.trim() || 'Not recorded'}</dd></div>
        </dl>
        {m.blocker ? <p className="text-destructive">{m.blocker}</p> : null}{m.failureEvidence ? <p>Failure evidence: {m.failureEvidence}. Any eligible reserve must enter a new preparation batch.</p> : null}
        {m.output ? <div><p>Output: <Link className="underline" to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId: m.workOrderId, containerId: m.output.id }} search={{ section: 'work' }}>{m.output.barcode}</Link> · {m.output.quantity} {m.output.quantityUnit}</p><p>{m.state === 'Failed' ? 'Output retained for traceability. This attempt failed and cannot supply a sequencing library.' : m.output.confirmed ? 'Output identity confirmed' : 'Label the output, then scan its barcode to confirm identity.'}</p></div> : null}
        {m.library ? <p>Library: {human(m.library.status)} · QC reused from preparation. {m.library.sequencing ? `Sequencing batch: ${m.library.sequencing.name} (${m.library.sequencing.batchNumber})` : 'No sequencing batch assigned.'}</p> : null}
        {m.executions.map(e => <div key={e.id}><p className="font-medium">{data.stages.find(s => s.id === e.stageId)?.name}: {human(e.status)}</p>{e.blockers.length && e.status !== 'Abandoned' ? <p className="mt-1 text-muted-foreground">{e.blockers[0]}</p> : null}<details className="mt-2"><summary className="cursor-pointer">Current sample records ({e.evidence.records.length} entries)</summary>{e.evidence.records.map(r => <div key={r.id} className="mt-2 rounded border p-3"><p>{data.stages.find(s => s.id === e.stageId)?.definition.steps.find(s => s.key === r.stepKey)?.name} · {r.action} · {r.qcOutcome ?? r.outcome}</p><StepPerformanceEvidence record={r} people={recorders} /><p className="text-xs text-muted-foreground">{r.preparationRecordId ? 'Includes applicable batch entries' : 'Sample entries'}</p>{Object.entries(r.captures).map(([key, value]) => <p key={key}>{data.stages.find(s => s.id === e.stageId)?.definition.steps.find(s => s.key === r.stepKey)?.captures.find(c => c.key === key)?.label ?? key}: {String(value)} <span className="text-xs text-muted-foreground">({evidenceOrigin(data, r.preparationRecordId, m.id, key)})</span></p>)}{r.reason ? <p>Reason: {r.reason}</p> : null}<PreparationQcReportDownload batchId={batchId} record={data.records.find(entry => entry.id === r.preparationRecordId)} /></div>)}</details></div>)}
      </div></section>)}
    </PreparationTray></div>

    {active && current ? <div ref={stepsRef} tabIndex={-1} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><PreparationPanel title="Preparation steps" description="Complete the workflow in order. Holds remain unresolved until a permitted repeat or correction passes, or the attempt is explicitly failed.">
      {data.stages.filter(stage => stage.id === current.id).map(stage => <div key={stage.id} className={`relative ${prepRowClass}`}><details open={stage.id === current?.id}><summary className="min-h-9 cursor-pointer py-1.5 pr-28 font-medium">{stage.sequence}. {stage.name}</summary><div className="mt-4 space-y-3">{stage.definition.steps.map(step => {
        const permitted = step.requiredRole ? data.roles.includes(step.requiredRole) : data.canOperate
        const inStage = participants.filter(m => m.executions.some(e => e.stageId === stage.id && ['InProgress', 'Blocked'].includes(e.status)))
        const target = inStage.filter(m => !m.blocker && !m.executions.find(e => e.stageId === stage.id)?.stepPrerequisites?.[step.key]?.length)
        const blocked = inStage.filter(m => !target.includes(m)).map(m => `${m.position}: ${m.blocker ?? m.executions.find(e => e.stageId === stage.id)?.stepPrerequisites?.[step.key]?.[0]}`)
        const hasPrior = target.some(m => m.executions.find(e => e.stageId === stage.id)?.evidence.records.some(r => r.stepKey === step.key))
        const missing = target.some(m => !m.executions.find(e => e.stageId === stage.id)?.evidence.records.some(r => r.stepKey === step.key))
        if (!target.length && !inStage.some(m => m.executions.find(e => e.stageId === stage.id)?.evidence.records.some(r => r.stepKey === step.key))) return null
        const showStep = (a: StepAction['action']) => { save.reset(); setStepAction({ stage, step, action: a }) }
        return <div key={step.key} className="flex flex-wrap items-start justify-between gap-3 rounded border bg-background p-3"><div className="min-w-0"><h3 className="font-medium">{step.name}</h3><p className="mt-1 text-xs text-muted-foreground">{step.captures.filter(c => !isOptionalSyntheticQcReference(data, step, c) && !isOptionalPreparationReference(data, step, c)).map(c => `${c.label}: ${isAutomaticSpecimenReference(data, c) ? 'recorded automatically per tube' : isSharedIdentityCheckDate(c) ? 'applies to all covered tubes' : c.scope === 'batch' ? 'shared batch observation' : c.scope === 'shared' ? 'shared with exceptions' : 'per tube'}`).join(' · ') || 'Procedure confirmation'}</p>{blocked.length ? <p className="mt-2 text-sm text-muted-foreground">{blocked.join(' ')} </p> : null}{!permitted ? <p className="text-sm">Requires {step.requiredRole ?? 'Operator or Supervisor'}.</p> : null}</div><PreparationActions items={active && permitted && stage.id === current?.id ? [
          ...(missing ? [{ label: 'Record step', onClick: () => showStep('record') }] : []), ...(hasPrior && step.repeatable ? [{ label: 'Repeat step', onClick: () => showStep('repeat') }] : []), ...(hasPrior && data.canCorrect ? [{ label: 'Correct step', onClick: () => showStep('correct') }] : []),
        ] : []} /></div>
      })}</div></details>{active && data.canOperate && stage.id === current?.id ? <div className="absolute right-4 top-4"><PreparationActions items={[...(progress.readyToAdvance ? [{ label: 'Complete protocol', onClick: () => open({ key: 'advance', stageId: stage.id }) }] : []), ...(stage.requirement !== 'Required' && progress.stageMembers.every(m => !m.executions.find(e => e.stageId === stage.id)?.evidence.records.length) ? [{ label: 'Skip stage', onClick: () => open({ key: 'skip-stage', stageId: stage.id }) }] : []), ...(stage.definition.steps.some(step => step.inputMaterials.length) ? [{ label: 'Record material use', onClick: () => open({ key: 'material', stageId: stage.id }) }] : []), ...(stage.definition.steps.some(step => step.equipmentTypes.length) ? [{ label: 'Record equipment use', onClick: () => open({ key: 'equipment', stageId: stage.id }) }] : [])]} /></div> : null}</div>)}
    </PreparationPanel></div> : null}
    {progress.handoffVisible ? <div ref={handoffRef} tabIndex={-1} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><PreparationPanel title="Sequencing handoff" description="Preparation is complete. Assign passing libraries to a sequencing batch. Scientific review and result release remain separate.">
      <p className="text-sm">{progress.libraries.length} passing libraries · {progress.libraries.filter(m => m.library?.sequencing).length} assigned</p>
      {progress.libraries.map(m => <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><div><strong>{m.position} · {m.output?.barcode ?? m.barcode}</strong><p className="text-muted-foreground">{m.library?.sequencing ? `Sequencing batch: ${m.library.sequencing.name}` : 'Ready for sequencing'}</p></div>{data.canOperate && !m.library?.sequencing ? <Button variant="outline" size="sm" disabled={handoff.isPending} onClick={() => open({ key: 'sequencing', memberId: m.id })}>Add to sequencing batch</Button> : null}</div>)}
      <Button variant="outline" asChild><Link to="/lab-operations" search={{ section: 'batches' }}>Open sequencing batches</Link></Button>
    </PreparationPanel></div> : null}
    <details className="group/history rounded-lg border p-4"><summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"><ChevronRight aria-hidden="true" className="size-4 shrink-0 group-open/history:rotate-90" />Batch history ({data.records.length} entries)</summary><div className="mt-4 space-y-3">{data.records.map(r => <div key={r.id} className={prepRowClass}><p className="text-sm">{r.details.automatic ? 'Step automatically skipped' : r.action === 'outputs' ? 'Library outputs created' : r.action === 'evaluate-conditions' ? 'Conditional steps checked' : r.action === 'assign-tray' ? 'Physical tray verified' : r.action === 'confirm-tray' ? 'Assembled tray confirmed' : r.action === 'reopen-tray' ? 'Tray reopened for editing' : human(r.action)} · {new Date(r.recordedAtUtc).toLocaleString()}</p>{r.action === 'assign-tray' ? <p className="text-sm font-mono">{r.details.barcode}</p> : null}{r.details.step ? <><p className="text-sm">{r.details.step.coveredMemberIds.map(id => data.members.find(m => m.id === id)?.position ?? 'Historical tube').join(', ')} · {r.details.step.action}</p><p className="text-xs text-muted-foreground">Batch entries, recorded once:</p>{Object.entries(r.details.step.sharedCaptures).map(([key, value]) => <p key={key} className="text-sm">{data.stages.find(s => s.id === r.details.step?.stageId)?.definition.steps.find(s => s.key === r.details.step?.stepKey)?.captures.find(c => c.key === key)?.label ?? key}: {String(value)}</p>)}{r.details.step.reason ? <p className="text-sm">{r.details.step.reason}</p> : null}<PreparationQcReportDownload batchId={batchId} record={r} /></> : r.details.outputResults ? <div className="space-y-1">{r.details.outputResults.map(output => <p key={output.memberId} className="break-all text-sm">{data.members.find(m => m.id === output.memberId)?.position ?? 'Historical tube'} · {output.barcode}</p>)}</div> : r.details.coveredMemberIds ? <p className="text-sm">{resources.data?.materialLots.find(l => l.id === r.details.resourceId)?.lotNumber ?? resources.data?.equipment.find(e => e.id === r.details.resourceId)?.name ?? 'Recorded resource'} · Coverage: {r.details.coveredMemberIds.map(id => data.members.find(m => m.id === id)?.position).join(', ')}{r.details.quantity ? ` · Total ${r.details.quantity} ${r.details.quantityUnit}` : ''}</p> : r.details.reason ? <p className="text-sm">{r.details.reason}</p> : null}</div>)}</div></details>
    {stepAction ? <PreparationStepDialog resourceCatalog={{ materialLots: resources.data?.materialLots ?? [], equipment: resources.data?.equipment ?? [], suppliers: [] }} catalogError={resources.isError ? 'The resource catalog could not be loaded. Refresh to retry, or use manual entries where permitted.' : undefined} batch={data} {...stepAction} pending={save.isPending} error={error} onClose={() => setStepAction(null)} onFail={(memberId, reasonCode, reason) => save.mutateAsync({ action: 'fail', memberId, reasonCode, reason })} onFailureExit={() => save.reset()} onSubmit={(step, report) => save.mutate({ action: 'step', step, report })} onResource={(key, coveredMemberIds) => open({ key, stageId: stepAction.stage.id, coveredMemberIds })} /> : null}
    {action?.key === 'outputs' ? <PreparationOutputsDialog members={participants.filter(m => (!action.coveredMemberIds || action.coveredMemberIds.includes(m.id)) && m.executions.some(e => e.stageId === (action.stageId ?? current?.id) && ['InProgress', 'Blocked'].includes(e.status)))} supported={data.bulkOutputs === true} pending={save.isPending} error={error} onClose={() => { setAction(null); save.reset() }} onSubmit={outputs => save.mutateAsync({ action: 'outputs', stageId: action.stageId ?? current?.id, outputs })} /> : null}
    {action && action.key !== 'outputs' ? <PreparationFormDialog key={`${action.key}-${action.memberId ?? ''}-${action.position ?? ''}`} title={titles[action.key]} description={`${member ? `${member.position} · ${member.barcode}. ` : ''}${action.key === 'confirm-tray' ? 'Confirm the assembled tube identities and positions. This locks tray editing and makes Start preparation available.' : action.key === 'reopen-tray' ? 'Reopen this confirmed draft for editing. You must confirm it again before starting preparation.' : action.key === 'advance' ? 'All participating tubes must have resolved steps and QC. The final protocol also requires confirmed outputs.' : action.key === 'fail' ? 'Failure closes only this tube’s attempt. A reserve must enter a new batch.' : action.key === 'confirm-output' ? `Expected output: ${member?.output?.barcode}.` : ['material', 'equipment'].includes(action.key) ? `One use record covers: ${participants.filter(m => !m.blocker && (!action.coveredMemberIds || action.coveredMemberIds.includes(m.id))).map(m => m.position).join(', ')}.` : 'Changes are checked against the current batch and retained in its history.'}`} fields={fields} onClose={() => setAction(null)} onSubmit={submit} pending={save.isPending || handoff.isPending} error={handoff.isError ? getLabOperationsError(handoff.error, 'Library could not be added.') : error} submitLabel={titles[action.key]}>{action.key === 'advance' ? <div className="space-y-3 text-sm"><p>Complete <strong>{data.stages.find(stage => stage.id === action.stageId)?.name}</strong> in <strong>{data.name}</strong>?</p><p>This completes the protocol for its participating tubes and moves them to the next protocol in the workflow, or finishes their preparation when this is the final protocol. The batch is closed separately. Step records remain in history.</p></div> : null}</PreparationFormDialog> : null}
  </main>
}
