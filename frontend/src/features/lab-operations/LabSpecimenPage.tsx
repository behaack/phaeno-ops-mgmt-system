import { useOrderDecisionDismissal } from '#/features/orders/use-order-decision-dismissal'
import { useSpecimenHolds } from '#/features/orders/use-specimen-holds'
import { SpecimenHolds } from '#/features/orders/SpecimenHolds'
import { SpecimenLibraries } from './SpecimenLibraries'
import { SpecimenOverview } from './SpecimenOverview'
import { JobSequencingPanel } from './JobSequencingPanel'
import { ScientificEvidenceList } from './ScientificEvidencePage'
import { NativeSelect } from '#/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { parseJobTab, specimenTabs, type SpecimenTab } from './specimen-navigation'
import { parseLabSection } from './lab-sections'
import { SampleInvestigation } from './SampleInvestigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { applyLabAttemptCommand, getLabAttempts, getLabOperationsError, getLabWorkOrder, type LabExecution, type LabAttempt, type LabAttemptCommand, type LabAttemptSpecimen, type LabAttemptWorkspace, type LabSpecimen } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu as DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { usePhaenoSession } from '#/features/auth/session-context'
import { AssemblyJobsList } from './AssemblyJobs'
import { parseAccessionSearch } from './lab-accession-search'

const policy = 'Complete the authorized sample-sequencing runs, one active attempt per sample. A failed attempt may use reserve material; it does not add a purchased run.'
const human = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')
function useAttempts(workOrderId: string) {
  const { session, authProvider } = usePhaenoSession()
  return useQuery({ queryKey: ['lab-attempts', workOrderId], queryFn: () => getLabAttempts(workOrderId), enabled: Boolean(session?.capabilities.canManageLabOperations) && authProvider !== 'mock' })
}

export function LabSpecimenList({ workOrderId, specimens, executions = [], onReceive, onAccession }: { workOrderId: string; specimens: LabSpecimen[]; executions?: LabExecution[]; onReceive: (s: LabSpecimen) => void; onAccession: (s: LabSpecimen) => void }) {
  const query = useAttempts(workOrderId)
  const progress = (specimen: LabAttemptSpecimen) => {
    const active = specimen.attempts.find(attempt => ['Planned', 'InProgress', 'OnHold'].includes(attempt.state))
    const completed = new Set(executions.filter(execution => active?.executionIds.includes(execution.id) && execution.status === 'Completed').map(execution => execution.labServiceWorkflowStageId))
    active?.stageSkips.forEach(skip => completed.add(skip.stageId))
    const next = active ? query.data?.stages.find(stage => stage.workflowVersionId === active.workflowVersionId && !completed.has(stage.id)) : undefined
    return <div className="space-y-1"><Badge variant="secondary">Processing: {human(specimen.processingState)}</Badge>{active ? <p className="text-sm">Attempt {active.sequence} · {active.sourceBarcode}</p> : null}{next ? <p className="text-sm">Next stage: {next.name}</p> : null}{specimen.blocker || active?.holdReason || specimen.nextAction ? <p className="text-sm text-muted-foreground">{specimen.blocker ?? active?.holdReason ?? specimen.nextAction}</p> : null}</div>
  }
  const identifier = (specimen: LabAttemptSpecimen) => <div><Link className="wrap-anywhere font-medium text-primary underline underline-offset-4" to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId, specimenId: specimen.id }} search={previous => ({ ...previous, section: parseLabSection(previous.section) ?? 'jobs', specimenTab: 'overview' })}>{specimen.name}</Link><p className="mt-1 text-xs text-muted-foreground">{specimen.accessionNumber ?? 'Awaiting accession'}</p></div>
  const intakeAction = (specimen: LabAttemptSpecimen) => {
    const original = specimens.find(item => item.id === specimen.id)
    return query.data?.canOperate && original?.intakeDisposition === 'AwaitingReceipt' ? <Button size="sm" onClick={() => onReceive(original)}>Receive</Button> : query.data?.canOperate && original?.receivedAtUtc && !original.accessionNumber ? <Button size="sm" onClick={() => onAccession(original)}>Accession</Button> : null
  }
  return <Card className="min-w-0 gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Specimens and tube attempts</CardTitle><CardDescription>Open a specimen to trace its source, current work, sequencing and exact result versions.</CardDescription></CardHeader><CardContent className="space-y-3 p-4">
    {query.isLoading ? <p role="status">Loading specimen progress…</p> : query.data ? <>
      <div className="hidden lg:block"><table className="w-full text-left text-sm"><caption className="sr-only">Job specimens and current work</caption><thead className="border-b text-muted-foreground"><tr>{['Specimen / accession', 'Current work', 'Material', 'Approved runs', 'Intake'].map(label => <th key={label} scope="col" className="p-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y">{query.data.specimens.map(specimen => <tr key={specimen.id}><td className="p-3 align-top">{identifier(specimen)}</td><td className="p-3 align-top">{progress(specimen)}</td><td className="p-3 align-top">{specimen.receivedTubes} of {specimen.expectedTubes} tubes received<p className="text-xs text-muted-foreground">{specimen.eligibleTubes} available</p></td><td className="p-3 align-top">{specimen.successfulRunCount ?? 0} of {specimen.sequencingRunCount ?? 1}</td><td className="space-y-2 p-3 align-top"><Badge variant="outline">{human(specimen.intakeDisposition)}</Badge>{intakeAction(specimen)}</td></tr>)}</tbody></table></div>
      <ul className="divide-y lg:hidden" aria-label="Job specimens">{query.data.specimens.map(specimen => <li key={specimen.id} className="space-y-3 py-4">{identifier(specimen)}{progress(specimen)}<p className="text-xs text-muted-foreground">{specimen.receivedTubes} of {specimen.expectedTubes} tubes · {specimen.eligibleTubes} available · {specimen.successfulRunCount ?? 0} of {specimen.sequencingRunCount ?? 1} runs approved</p><div className="flex items-center gap-2"><Badge variant="outline">Intake: {human(specimen.intakeDisposition)}</Badge>{intakeAction(specimen)}</div></li>)}</ul>
      {!query.data.specimens.length ? <p>No specimens recorded.</p> : null}
    </> : <Alert variant="destructive"><AlertTitle>Specimen progress could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Reload the specimen list.')}<Button variant="outline" onClick={() => void query.refetch()}>Reload</Button></AlertDescription></Alert>}
  </CardContent></Card>
}

export function LabSpecimenPage({ workOrderId, specimenId, selectedTab = 'overview' }: { workOrderId: string; specimenId: string; selectedTab?: SpecimenTab }) {
  const navigate = useNavigate()
  const returnSearch = useSearch({ strict: false })
  const returnToAccessions = returnSearch.section === 'receipt' && parseAccessionSearch(returnSearch).accessionView === 'samples'
  const query = useAttempts(workOrderId)
  const work = useQuery({ queryKey: ['lab-work-order', workOrderId], queryFn: () => getLabWorkOrder(workOrderId), enabled: Boolean(query.data) })
  const [action, setAction] = useState<{ key: string; stageId?: string } | null>(null)
  const actionTrigger = useRef<HTMLButtonElement>(null)
  const holds = useSpecimenHolds(undefined, query.data ? workOrderId : undefined).query
  const data = query.data
  const specimen = data?.specimens.find(s => s.id === specimenId)
  if (!data || !specimen) return <main className="page-wrap p-6"><p role="status">{query.isLoading ? 'Loading specimen…' : 'The specimen could not be loaded in this laboratory job.'}</p>{query.error ? <p>{getLabOperationsError(query.error, 'Reload to try again.')}</p> : null}<Button variant="outline" onClick={() => void query.refetch()}>Reload</Button></main>
  const activeHolds = holds.data?.holds.filter(hold => hold.labSpecimenId === specimenId && hold.state !== 'Released') ?? []
  const active = specimen.attempts.find(a => ['Planned', 'InProgress', 'OnHold'].includes(a.state))
  const latest = specimen.attempts.at(-1)
  const unlinked = (work.data?.executions ?? []).filter(e => e.labSpecimenId === specimen.id && !specimen.attempts.some(a => a.executionIds.includes(e.id)))
  const final = specimen.processingState === 'Failed' || specimen.processingState === 'Succeeded' && ((specimen.sequencingRunCount ?? 1) === 1 || (specimen.successfulRunCount ?? 0) >= (specimen.sequencingRunCount ?? 1))
  const executions = (work.data?.executions ?? []).filter(e => active?.executionIds.includes(e.id))
  const completed = new Set(executions.filter(e => e.status === 'Completed').map(e => e.labServiceWorkflowStageId))
  active?.stageSkips.forEach(s => completed.add(s.stageId))
  const next = data.stages.find(s => (!active?.workflowVersionId || s.workflowVersionId === active.workflowVersionId) && !completed.has(s.id))
  const nextExecution = executions.find(e => e.labServiceWorkflowStageId === next?.id)
  const actions: { key: string; label: string; stageId?: string; disabled?: boolean }[] = []
  if (data.canAdoptPolicy) actions.push({ key: 'adopt-policy', label: 'Confirm tube-use instruction' })
  if (data.canOperate && data.policyKey && !final && !specimen.blocker && !active?.preparationBatchId) {
    if (!active) actions.push({ key: 'select', label: latest?.state === 'Failed' ? 'Use reserve tube' : latest?.state === 'Succeeded' ? 'Prepare a new library' : 'Select source tube', disabled: !specimen.eligibleTubes })
    if (active?.state === 'Planned') actions.push({ key: 'cancel', label: 'Cancel unstarted attempt' })
    if (active?.startedAtUtc) {
      if (active.holdReason) actions.push({ key: 'resume', label: 'Resolve attempt hold' })
      else actions.push({ key: 'hold', label: 'Hold attempt' })
      actions.push({ key: 'fail', label: 'Close attempt as failed' })
    }
    if (active && !active.holdReason && active.state !== 'OnHold' && next) {
      if (!nextExecution) actions.push({ key: 'next-stage', label: `Assign ${next.name}`, stageId: next.id })
      if (next.requirement !== 'Required' && (!nextExecution || nextExecution.status === 'Planned')) actions.push({ key: 'skip-stage', label: `Skip ${next.name}`, stageId: next.id })
    }
    if (!active && latest?.state === 'Failed') actions.push({ key: 'confirm-exhaustion', label: 'Confirm material exhausted', disabled: specimen.eligibleTubes > 0 })
  }
  return <main className="page-wrap space-y-5 px-4 py-8">
    {returnSearch.section === 'specimens' ? <Link to="/lab-operations" search={previous => ({ ...previous, section: 'specimens', specimenTab: undefined })} className="text-sm text-primary underline underline-offset-4">Back to specimens</Link> : null}

    {returnSearch.section === 'specimens' ? null : returnToAccessions ? <Link to="/lab-operations" search={previous => ({ ...previous, section: 'receipt', receiptTab: 'accession', accessionView: 'samples' })} className="text-sm text-primary underline underline-offset-4">Back to accessioned samples</Link> : <Link to="/lab-operations/$workOrderId" params={{ workOrderId }} search={previous => ({ ...previous, section: parseLabSection(previous.section) ?? 'jobs', tab: parseJobTab(previous.tab) ?? 'specimens' })} className="text-sm text-primary underline underline-offset-4">Back to {data.jobName}</Link>}
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="wrap-anywhere text-2xl font-semibold">{specimen.name}</h1><p className="mt-1 wrap-anywhere text-sm text-muted-foreground">{data.jobName} · {specimen.accessionNumber ?? 'Awaiting accession'}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">Intake: {human(specimen.intakeDisposition)}</Badge><Badge variant="secondary">Processing: {human(specimen.processingState)}</Badge><Badge variant="outline">{specimen.successfulRunCount ?? 0} of {specimen.sequencingRunCount ?? 1} runs approved</Badge></div></div>{actions.length === 1 ? <Button ref={actionTrigger} variant="outline" disabled={actions[0].disabled} onClick={() => setAction({ key: actions[0].key, stageId: actions[0].stageId })}>{actions[0].label}</Button> : actions.length > 1 ? <DropdownMenu><DropdownMenuTrigger asChild><Button ref={actionTrigger} variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max min-w-56 max-w-[calc(100vw-2rem)]">{actions.map(a => <DropdownMenuItem key={a.key} disabled={a.disabled} onSelect={() => setAction({ key: a.key, stageId: a.stageId })}>{a.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu> : null}</header>
    <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1 sm:max-w-sm"><Label htmlFor="job-specimen-picker">Specimen in this Job</Label><NativeSelect id="job-specimen-picker" value={specimenId} onChange={event => void navigate({ to: '/lab-operations/$workOrderId/specimens/$specimenId', params: { workOrderId, specimenId: event.target.value }, search: previous => ({ ...previous, section: parseLabSection(previous.section), specimenTab: selectedTab }) })}>{data.specimens.map(item => <option key={item.id} value={item.id}>{item.name} · {item.accessionNumber ?? 'Awaiting accession'}</option>)}</NativeSelect></div><Link className="text-sm text-primary underline underline-offset-4" to="/lab-operations/$workOrderId" params={{ workOrderId }} search={previous => ({ ...previous, section: parseLabSection(previous.section), tab: 'overview' })}>Open Job overview</Link></div>
    {specimen.blocker || active?.holdReason || specimen.nextAction ? <Alert><AlertTitle>{final ? 'Processing outcome' : specimen.blocker ? 'Before processing' : 'Next action'}</AlertTitle><AlertDescription>{specimen.blocker ?? active?.holdReason ?? specimen.nextAction}{active?.nextAction ? <p>{active.nextAction}</p> : null}{specimen.note ? <p>{specimen.note}</p> : null}</AlertDescription></Alert> : null}
    {holds.isError ? <Alert variant="destructive"><AlertTitle>Hold status unavailable</AlertTitle><AlertDescription>Reload before deciding whether this specimen can proceed.<Button variant="outline" onClick={() => void holds.refetch()}>Retry hold status</Button></AlertDescription></Alert> : null}
    {work.data?.exceptions.filter(exception => exception.status === 'Open' && exception.isBlocking && (exception.labSpecimenId === specimenId || !exception.labSpecimenId && (!exception.labProtocolExecutionId || work.data.executions.some(execution => execution.id === exception.labProtocolExecutionId && execution.labSpecimenId === specimenId)))).map(exception => <Alert key={exception.id} variant="destructive"><AlertTitle>Blocking exception · {exception.title}</AlertTitle><AlertDescription>{exception.internalDescription}<Link to="/lab-operations/$workOrderId" params={{ workOrderId }} search={previous => ({ ...previous, section: parseLabSection(previous.section), tab: 'exceptions' })} className="ml-2 text-primary underline">Open Job exceptions</Link></AlertDescription></Alert>)}
    {activeHolds.length ? <Alert><AlertTitle>Specimen hold · new work and release blocked</AlertTitle><AlertDescription>{activeHolds.map(hold => <p key={hold.id}>{human(hold.state)} · {hold.reason}</p>)}<Link to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId, specimenId }} search={previous => ({ ...previous, section: parseLabSection(previous.section), specimenTab: 'history' })} className="text-primary underline">Review specimen hold</Link></AlertDescription></Alert> : null}
    <Tabs value={selectedTab} onValueChange={value => void navigate({ to: '/lab-operations/$workOrderId/specimens/$specimenId', params: { workOrderId, specimenId }, search: previous => ({ ...previous, section: parseLabSection(previous.section), specimenTab: value as SpecimenTab }), replace: true, resetScroll: false })} className="gap-4">
      <TabsList aria-label="Specimen sections" className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-6">{specimenTabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="min-w-0 py-2 whitespace-normal">{tab.label}</TabsTrigger>)}</TabsList>
      <TabsContent value="overview"><SpecimenOverview key={specimenId} workOrderId={workOrderId} specimen={specimen} workspace={data} executions={work.data?.executions ?? []} /></TabsContent>
      <TabsContent value="processing" className="space-y-4">
    {(active ?? latest)?.preparationBatchId ? <div className="rounded-lg border bg-muted/30 p-4 text-sm">This attempt belongs to a preparation tray. <Link className="underline" to="/lab-operations/preparation/$preparationBatchId" params={{ preparationBatchId: (active ?? latest)!.preparationBatchId! }} search={{ section: 'work' }}>Open preparation batch</Link></div> : null}
    <p className="text-sm">{data.policyKey ? policy : 'Tube-use instruction not recorded. A supervisor must confirm it before source selection.'}</p>
    {(active ?? latest)?.workflowName ? <p className="text-sm">Attempt workflow: {(active ?? latest)!.workflowName} · version {(active ?? latest)!.workflowVersion}</p> : data.workflowName ? <p className="text-sm">Default for a new standalone attempt: {data.workflowName} · version {data.workflowVersion}. Preparation batches use their selected workflow.</p> : <p className="text-sm text-muted-foreground">Select an approved preparation batch, or promote a service workflow before selecting a standalone source.</p>}

    <Card className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Tubes</CardTitle><CardDescription>{specimen.receivedTubes} of {specimen.expectedTubes} received · {specimen.eligibleTubes} available for selection</CardDescription><CardAction><Button asChild variant="outline" size="sm"><Link to="/lab-operations/$workOrderId" params={{ workOrderId }} search={previous => ({ ...previous, section: parseLabSection(previous.section) ?? 'jobs', tab: 'lineage' })}>Open tubes</Link></Button></CardAction></CardHeader><CardContent className="space-y-3 p-4">{specimen.tubes.map(t => <div className="flex flex-wrap justify-between gap-3 rounded-lg border bg-muted/30 p-4" key={t.id}><div><Link className="font-medium text-primary underline underline-offset-4 break-all" to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId, containerId: t.id }} search={previous => ({ ...previous, section: parseLabSection(previous.section) ?? 'jobs' })}>{t.barcode}</Link><p className="text-xs text-muted-foreground">{t.location ?? 'Not stored'} · {human(t.physicalStatus)} · Intake: {human(t.intakeDisposition ?? 'Not reviewed')}</p>{t.unavailableReason ? <p className="mt-1 text-sm text-muted-foreground">{t.unavailableReason}</p> : null}</div><Badge variant="outline" className="h-fit">{t.use}</Badge></div>)}{!specimen.tubes.length ? <p className="text-sm text-muted-foreground">No tubes have been accessioned.</p> : null}</CardContent></Card>
    {unlinked.length ? <Alert><AlertTitle>Existing execution records</AlertTitle><AlertDescription><p>Unstarted work is retained when you select a source. Historical processing is not assigned a tube retrospectively.</p>{unlinked.map(e => <p key={e.id}><Link className="text-primary underline underline-offset-4" to="/lab-operations/executions/$executionId" params={{ executionId: e.id }} search={previous => ({ ...previous, returnSpecimenId: specimenId, returnSpecimenTab: selectedTab, section: parseLabSection(previous.section) ?? 'jobs' })}>{data.stages.find(stage => stage.id === e.labServiceWorkflowStageId)?.name ?? 'Protocol execution'} · {human(e.status)}</Link></p>)}</AlertDescription></Alert> : null}
    <Card className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Attempt history · {specimen.successfulRunCount ?? 0} of {specimen.sequencingRunCount ?? 1} runs approved</CardTitle><CardDescription>Each new library preparation starts a preparation attempt. Reuse an existing prepared library in Scientific evidence for additional sequencing runs; no new preparation attempt is needed. Earlier evidence retains its original lineage.</CardDescription></CardHeader><CardContent className="space-y-3 p-4">{specimen.attempts.map(a => <section key={a.id} className="space-y-2 rounded-lg border bg-muted/30 p-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-medium">Attempt {a.sequence} · {a.sourceBarcode}</h2><Badge variant="outline">{human(a.state)}</Badge></div>{a.workflowName ? <p className="text-sm">{a.workflowName} · version {a.workflowVersion}</p> : null}{a.startedAtUtc ? <p className="text-xs text-muted-foreground">Started {new Date(a.startedAtUtc).toLocaleString()}{a.closedAtUtc ? ` · Closed ${new Date(a.closedAtUtc).toLocaleString()}` : ''}</p> : null}{a.failureEvidence ? <p className="text-sm">{human(a.failureReasonCode ?? 'Reason')}: {a.failureEvidence}</p> : null}{a.holdReason ? <p className="text-sm">Hold: {a.holdReason}. Next: {a.nextAction}</p> : null}{a.executionIds.map(id => { const execution = work.data?.executions.find(e => e.id === id); const stage = data.stages.find(s => s.id === execution?.labServiceWorkflowStageId); return <p key={id}><Link className="text-sm text-primary underline underline-offset-4" to="/lab-operations/executions/$executionId" params={{ executionId: id }} search={previous => ({ ...previous, returnSpecimenId: specimenId, returnSpecimenTab: selectedTab, section: parseLabSection(previous.section) ?? 'jobs' })}>{stage ? `${stage.sequence}. ${stage.name}` : 'Open protocol execution'}{execution ? ` · ${human(execution.status)}` : ''}</Link></p> })}{a.stageSkips.map(s => <p key={s.stageId} className="text-sm">Skipped {data.stages.find(stage => stage.id === s.stageId)?.name}: {s.reason}</p>)}</section>)}{!specimen.attempts.length ? <p className="text-sm text-muted-foreground">No source has been selected. Complete intake during accessioning, then select an accepted source.</p> : null}</CardContent></Card>

        <SampleInvestigation workOrderId={workOrderId} specimenId={specimenId} view="processing" />
      </TabsContent>
      <TabsContent value="libraries">{work.isError ? <Alert variant="destructive"><AlertDescription>{getLabOperationsError(work.error, 'Library records could not be loaded.')}<Button variant="outline" onClick={() => void work.refetch()}>Retry libraries</Button></AlertDescription></Alert> : work.data ? <SpecimenLibraries workOrderId={workOrderId} specimen={specimen} work={work.data} /> : <p role="status">Loading specimen libraries…</p>}</TabsContent>
      <TabsContent value="sequencing" className="space-y-4">{work.isError ? <Alert variant="destructive"><AlertDescription>{getLabOperationsError(work.error, 'Library records could not be loaded.')}<Button variant="outline" onClick={() => void work.refetch()}>Retry libraries</Button></AlertDescription></Alert> : work.data ? <JobSequencingPanel workOrderId={workOrderId} specimenId={specimenId} libraries={work.data.libraries.filter(library => library.labSpecimenId === specimenId)} specimens={work.data.specimens.filter(item => item.id === specimenId)} /> : <p role="status">Loading specimen libraries…</p>}<ScientificEvidenceList workOrderId={workOrderId} specimenId={specimenId} /><AssemblyJobsList enabled={Boolean(query.data)} workOrderId={workOrderId} specimenId={specimenId} /></TabsContent>
      <TabsContent value="results"><SampleInvestigation workOrderId={workOrderId} specimenId={specimenId} view="results" /></TabsContent>
      <TabsContent value="history"><SpecimenHolds workOrderId={workOrderId} sampleIds={holds.data?.specimens.filter(item => item.id === specimenId).map(item => item.sampleId) ?? []} /><SampleInvestigation workOrderId={workOrderId} specimenId={specimenId} view="history" /></TabsContent>
    </Tabs>
    {action ? <AttemptActionDialog key={action.key} action={action.key} stageId={action.stageId} data={data} specimen={specimen} attempt={active} returnFocus={() => actionTrigger.current?.focus()} evidenceOptions={executions.filter(e => e.startedAtUtc).map(e => ({ id: e.id, label: `${data.stages.find(stage => stage.id === e.labServiceWorkflowStageId)?.name ?? 'Protocol execution'} · ${human(e.status)}` }))} onClose={() => setAction(null)} /> : null}
  </main>
}

const actionSchema = z.object({ sourceId: z.string(), barcode: z.string().trim(), note: z.string().trim().max(4000), reason: z.string(), executionId: z.string(), nextAction: z.string().trim().max(2000), confirmed: z.boolean() })
type Values = z.infer<typeof actionSchema>
function AttemptActionDialog({ action, stageId, data, specimen, attempt, evidenceOptions, returnFocus, onClose }: { action: string; stageId?: string; data: LabAttemptWorkspace; specimen: LabAttemptSpecimen; attempt?: LabAttempt; evidenceOptions: { id: string; label: string }[]; returnFocus: () => void; onClose: () => void }) {
  const client = useQueryClient()
  const [requestId] = useState(() => crypto.randomUUID())
  const [serverVersion] = useState(data.workOrderVersion)
  const [attemptIdentity] = useState(() => ({ id: attempt?.id, version: attempt?.version }))
  const form = useForm<Values>({ resolver: zodResolver(actionSchema.superRefine((v, ctx) => {
    const required = (key: keyof Values, message: string) => { if (!v[key]) ctx.addIssue({ code: 'custom', path: [key], message }) }
    if (action === 'select') {
      required('sourceId', 'Select a source tube.'); required('barcode', 'Scan the selected barcode.')
      if (specimen.tubes.find(t => t.id === v.sourceId)?.use === 'Previously attempted') { required('confirmed', 'Confirm sufficient material remains.'); required('note', 'Record the remaining material evidence.') }
    }
    if (action !== 'select' && action !== 'next-stage') required('note', 'Record the reason or evidence.')
    if (action === 'fail') { required('reason', 'Choose the failure reason.'); required('executionId', 'Select the execution containing the evidence.') }
    if (action === 'hold') required('nextAction', 'Record the next action you will own.')
    if (action === 'adopt-policy' || action === 'confirm-exhaustion') required('confirmed', 'Confirm this instruction.')
  })), defaultValues: { sourceId: '', barcode: '', note: '', reason: '', executionId: '', nextAction: '', confirmed: false }, mode: 'onBlur' })
  const reusingSource = action === 'select' && specimen.tubes.find(t => t.id === form.watch('sourceId'))?.use === 'Previously attempted'
  const mutation = useMutation({ mutationFn: (values: Values) => {
    const command: LabAttemptCommand = { requestId, workOrderVersion: serverVersion, action, specimenId: specimen.id, attemptId: attemptIdentity.id, attemptVersion: attemptIdentity.version, stageId,
      sourceContainerId: values.sourceId || undefined, barcode: values.barcode || undefined, note: values.note || undefined, reasonCode: values.reason || undefined,
      failedExecutionId: values.executionId || undefined, nextAction: values.nextAction || undefined,
      confirmMaterialAvailable: action === 'select' && values.confirmed, confirmPolicy: action === 'adopt-policy' && values.confirmed, confirmMaterialExhausted: action === 'confirm-exhaustion' && values.confirmed }
    return applyLabAttemptCommand(data.workOrderId, command)
  }, onSuccess: async result => {
    client.setQueryData(['lab-attempts', data.workOrderId], result)
    await Promise.all([client.invalidateQueries({ queryKey: ['lab-work-order', data.workOrderId] }), client.invalidateQueries({ queryKey: ['lab-execution'] }), client.invalidateQueries({ queryKey: ['lab-operations'] })]); onClose()
  }, onError: async () => { await client.fetchQuery({ queryKey: ['lab-attempts', data.workOrderId], queryFn: () => getLabAttempts(data.workOrderId) }) } })
  const { isDirty } = form.formState
  const dismissal = useOrderDecisionDismissal(isDirty, mutation.isPending, onClose, { scope: 'attempt details', description: 'Your unsaved reason, evidence and source selection will be discarded. Saved specimen and attempt records remain unchanged.' })
  const close = dismissal.close
  const title = ({ select: attempt ? 'Select source' : specimen.attempts.at(-1)?.state === 'Failed' ? 'Use reserve tube' : 'Select source tube', fail: 'Close attempt as failed', hold: 'Hold attempt', resume: 'Resolve attempt hold', cancel: 'Cancel unstarted attempt', 'adopt-policy': 'Confirm tube-use instruction', 'confirm-exhaustion': 'Confirm material exhausted', 'skip-stage': 'Skip workflow stage', 'next-stage': 'Assign next stage' } as Record<string, string>)[action]
  const error = (name: keyof Values) => form.formState.errors[name] ? <p role="alert" className="mt-1 text-sm text-destructive">{form.formState.errors[name]?.message}</p> : null
  const selectClass = 'mt-1.5'
  return <><Dialog open onOpenChange={open => !open && close()}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); returnFocus() }}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{action === 'adopt-policy' ? `All specimens in ${data.jobName}` : specimen.name}{attempt ? ` · Attempt ${attempt.sequence} · ${attempt.sourceBarcode}` : ''}. {action === 'select' ? 'Scan the selected tube. A reserve restarts the workflow from its first stage; existing Planned work is adopted without duplication.' : 'This action is retained in laboratory history.'}</DialogDescription></DialogHeader>{mutation.error ? <Alert variant="destructive"><AlertTitle>Action was not saved</AlertTitle><AlertDescription>{getLabOperationsError(mutation.error, 'Review the latest specimen state and try again.')} Your entries are preserved. If the record changed, close this dialog and review it before submitting a new action.</AlertDescription></Alert> : null}<form id="attempt-action" noValidate className="space-y-4" onSubmit={form.handleSubmit(v => mutation.mutate(v))}>
    {action === 'select' && specimen.attempts.at(-1)?.state === 'Failed' ? <Alert><AlertTitle>Restart from {data.stages[0]?.name ?? 'the first workflow stage'}</AlertTitle><AlertDescription>Previous source: {specimen.attempts.at(-1)?.sourceBarcode}. Failure: {human(specimen.attempts.at(-1)?.failureReasonCode ?? 'Recorded failure')} — {specimen.attempts.at(-1)?.failureEvidence}. The selected reserve will begin a new attempt.</AlertDescription></Alert> : null}
    {action === 'next-stage' || action === 'skip-stage' ? <p className="text-sm">Stage: {data.stages.find(stage => stage.id === stageId)?.name}</p> : null}
    {action === 'select' ? <><div><Label htmlFor="attempt-source"><RequiredFieldName>Source tube</RequiredFieldName></Label><NativeSelect id="attempt-source" required aria-invalid={Boolean(form.formState.errors.sourceId)} className={selectClass} {...form.register('sourceId')}><option value="">Select a tube</option>{specimen.tubes.filter(t => !t.unavailableReason).map(t => <option value={t.id} key={t.id}>{t.barcode} · {t.location}</option>)}</NativeSelect>{error('sourceId')}</div><div><Label htmlFor="attempt-barcode"><RequiredFieldName>Scan source barcode</RequiredFieldName></Label><Input id="attempt-barcode" required aria-invalid={Boolean(form.formState.errors.barcode)} className="mt-1.5" {...form.register('barcode')} />{error('barcode')}</div></> : null}
    {action === 'fail' ? <><div><Label htmlFor="attempt-failure"><RequiredFieldName>Failure reason</RequiredFieldName></Label><NativeSelect id="attempt-failure" required aria-invalid={Boolean(form.formState.errors.reason)} className={selectClass} {...form.register('reason')}><option value="">Select a reason</option>{['analysis_failed', 'material_unusable', 'equipment_incident', 'procedure_deviation', 'other'].map(reason => <option key={reason} value={reason}>{human(reason)}</option>)}</NativeSelect>{error('reason')}</div><div><Label htmlFor="attempt-evidence"><RequiredFieldName>Execution evidence</RequiredFieldName></Label><NativeSelect id="attempt-evidence" required aria-invalid={Boolean(form.formState.errors.executionId)} className={selectClass} {...form.register('executionId')}><option value="">Select the execution</option>{evidenceOptions.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</NativeSelect>{error('executionId')}</div></> : null}
    {(action !== 'select' && action !== 'next-stage') || reusingSource ? <div><Label htmlFor="attempt-note"><RequiredFieldName>{action === 'fail' ? 'Failure evidence and reference' : 'Reason and evidence'}</RequiredFieldName></Label><Textarea id="attempt-note" required aria-invalid={Boolean(form.formState.errors.note)} className="mt-1.5" {...form.register('note')} />{error('note')}</div> : null}
    {action === 'hold' ? <div><Label htmlFor="attempt-next"><RequiredFieldName>Next action (you are responsible)</RequiredFieldName></Label><Textarea id="attempt-next" required aria-invalid={Boolean(form.formState.errors.nextAction)} className="mt-1.5" {...form.register('nextAction')} />{error('nextAction')}</div> : null}
    {reusingSource || action === 'adopt-policy' || action === 'confirm-exhaustion' ? <div><label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" required aria-invalid={Boolean(form.formState.errors.confirmed)} className="mt-1" {...form.register('confirmed')} /><RequiredFieldName>{reusingSource ? 'I confirmed sufficient material remains in this source for another purchased run.' : action === 'adopt-policy' ? `I have reviewed the order instruction: ${policy}` : 'The attempt has failed, and no material remains for further permitted analysis. Mark the specimen Failed.'}</RequiredFieldName></label>{error('confirmed')}</div> : null}
  </form><RequiredDialogFooter showLegend={action !== 'next-stage'}><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="attempt-action" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : title}</Button></RequiredDialogFooter></DialogContent></Dialog>{dismissal.confirmation}</>
}
