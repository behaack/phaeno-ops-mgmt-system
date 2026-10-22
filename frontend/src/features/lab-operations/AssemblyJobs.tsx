import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { assemblyTones } from '#/features/lab-operations/lab-status'
import { formatDisplayTimestamp } from '#/lib/display-format'
import { PageHeader, PageTitle } from '#/components/ui/page-header'
import { Field } from '#/components/ui/field'
import { EmptyState, ErrorState, LoadingState } from '#/components/ui/content-state'
import { ListToolbar, RecordList, RecordListItem } from '#/components/ui/record-list'
import { RecordLink } from '#/components/ui/record-link'
import { BackLink } from '#/components/ui/back-link'
import { NativeSelect } from '#/components/ui/native-select'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { RecordPagination, useRecordListState } from '#/components/RecordPagination'
import { useDebouncedSearch } from '#/components/use-debounced-search'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { cancelAssembly, downloadSimulatedAssemblyOutput, getAssemblyInputs, getAssemblyJob, getAssemblyJobs, getAssemblyJobsPage, linkAssemblyAnalysis, type AssemblyDetail, type AssemblyJob } from '#/api/lab-assembly'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Textarea } from '#/components/ui/textarea'
import { ProgressBar } from '#/components/ui/progress-bar'
import { usePhaenoSession } from '#/features/auth/session-context'
import { useAssemblyNotifications } from './use-assembly-notifications'
import { AssemblyStartDialog } from './AssemblyStartDialog'
import { assemblyDuration, assemblyMatches, assemblyStateLabel, currentAssemblyPercentage } from './assembly-jobs'

const date = (value: string | null) => formatDisplayTimestamp(value, {seconds:true,empty:'Not reported'})
const linkStyle = 'text-primary underline underline-offset-4'

export function DataAssemblyWorkspace({ apiEnabled }: { apiEnabled: boolean }) {
  const search = useSearch({ from: '/lab-operations' })
  const navigate = useNavigate()
  const tab = search.assemblyTab ?? 'inputs'
  const { session } = usePhaenoSession()
  return <Tabs value={tab} onValueChange={value => void navigate({ to: '/lab-operations', search: p => ({ ...p, section: 'assembly', assemblyTab: value === 'jobs' ? 'jobs' : 'inputs' }), resetScroll: false })}>
    <TabsList aria-label="PSeq Service data assembly" className="grid w-full grid-cols-2"><TabsTrigger value="inputs">Sequencing inputs</TabsTrigger><TabsTrigger value="jobs">Sequencing assembly</TabsTrigger></TabsList>
    <TabsContent value="inputs">{session?.capabilities.canOperateLabWork ? <ReadyAssemblyInputs enabled={apiEnabled} /> : <p className="text-sm text-muted-foreground">Laboratory operator access is required to view and start sequencing inputs.</p>}</TabsContent>
    <TabsContent value="jobs"><AssemblyJobsList enabled={apiEnabled} search={search.assemblySearch ?? ''} onSearch={value => void navigate({ to: '/lab-operations', search: p => ({ ...p, section: 'assembly', assemblyTab: 'jobs', assemblySearch: value || undefined, assemblyPage: 1 }), replace: true, resetScroll: false })} /></TabsContent>
  </Tabs>
}

function ReadyAssemblyInputs({ enabled }: { enabled: boolean }) {
  const inputs = useQuery({ queryKey: ['assembly-inputs'], queryFn: () => getAssemblyInputs(), enabled })
  const queue = useQuery({ queryKey: ['assembly-jobs'], queryFn: () => getAssemblyJobs(), enabled })
  const [selected, setSelected] = useState<{ work: string; specimen: string } | null>(null)
  const groups = [...new Map((inputs.data ?? []).map(i => [`${i.labSpecimenId}:${i.sequencingRunNumber}:${i.labSpecimenAttemptId}`, i])).entries()]
  return <Card><CardHeader><CardTitle>Sequencing inputs</CardTitle><CardDescription>Verified FASTQ files for each PSeq Service specimen and run. Start assembly from an input set, then follow its progress in Sequencing assembly.</CardDescription></CardHeader><CardContent className="space-y-3">

    {queue.data?.availability.available ? <div className="space-y-1 text-sm" role="status"><p className="font-medium">Processing connected</p>{queue.data.availability.recipes.map(recipe => <p key={recipe.key}>{recipe.name} · {recipe.version}{recipe.simulated ? <Badge variant="outline" className="ml-2">Simulated</Badge> : null}</p>)}</div> : null}
    {inputs.isPending && enabled ? <LoadingState label="Loading available input sets…" /> : null}
    {inputs.error ? <ErrorState title="Sequencing inputs could not be loaded" onRetry={() => void inputs.refetch()} retryLabel="Retry inputs" busy={inputs.isFetching}>{getLabOperationsError(inputs.error, 'Your current selection is retained. Try again.')}</ErrorState> : null}    {queue.error ? <ErrorState title="Processing availability could not be checked" onRetry={() => void queue.refetch()} retryLabel="Retry processing availability" busy={queue.isFetching}>{getLabOperationsError(queue.error, 'Retry the availability check before starting work.')}</ErrorState> : null}
    {!inputs.isPending && !inputs.error && !groups.length ? <EmptyState kind="setup" title="No verified input sets">Record vendor results with complete verified FASTQ files to prepare assembly inputs.</EmptyState> : null}
    <RecordList aria-label="Sequencing input sets">{groups.map(([key, first]) => {
      const active = queue.data?.jobs.some(j => !j.isTerminal && j.labSpecimenId === first.labSpecimenId && j.sequencingRunNumber === first.sequencingRunNumber)
      const reason = !queue.data?.availability.available ? queue.data?.availability.message || (queue.error ? 'Processing availability is unavailable. Retry the availability check.' : 'Processing availability is being checked.') : active ? 'An assembly is already active for this specimen and run.' : undefined
      return <RecordListItem key={key} title={<RecordLink asChild><Link to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId: first.labWorkOrderId, specimenId: first.labSpecimenId }} search={p => ({ ...p, section: 'jobs' })}>{first.sampleName} · Run {first.sequencingRunNumber}</Link></RecordLink>}
        metadata={<>{inputs.data?.filter(i => i.labSpecimenId === first.labSpecimenId && i.sequencingRunNumber === first.sequencingRunNumber && i.labSpecimenAttemptId === first.labSpecimenAttemptId).length} input files · {first.providerRunReference}</>}
        actions={<Button disabled={!queue.data?.availability.available || Boolean(active)} aria-describedby={reason ? `assembly-input-${key}-reason` : undefined} onClick={() => setSelected({ work: first.labWorkOrderId, specimen: first.labSpecimenId })}>Start assembly</Button>}>
        {reason ? <p id={`assembly-input-${key}-reason`} className="text-xs text-muted-foreground">{reason}</p> : null}
      </RecordListItem>
    })}</RecordList>
    {queue.data && !queue.data.availability.available ? <p className="text-sm text-muted-foreground">{queue.data.availability.message}</p> : null}
    {selected && queue.data ? <AssemblyStartDialog workOrderId={selected.work} specimenId={selected.specimen} availability={queue.data.availability} onClose={() => setSelected(null)} /> : null}
  </CardContent></Card>
}

export function AssemblyJobProgress({ job }: { job: AssemblyJob }) {
  const percentage = currentAssemblyPercentage(job.progress, job.isTerminal)
  if (job.isTerminal) return <DomainStatusBadge status={job.simulated && job.state === 'Succeeded' ? 'SimulatedCompleted' : job.state} tones={assemblyTones}>{job.simulated && job.state === 'Succeeded' ? 'Simulation completed' : assemblyStateLabel(job.state)}</DomainStatusBadge>
  return <div className="min-w-0 space-y-2"><span className="text-sm">{job.cancellationRequested ? 'Cancellation requested' : assemblyStateLabel(job.state)}</span>
    <ProgressBar aria-label={`Assembly progress for ${job.sampleName}, run ${job.sequencingRunNumber}`} value={percentage}
      aria-valuetext={percentage === null ? 'Progress unavailable' : `${Math.round(percentage)}% reported`} />
    {percentage === null ? <p className="text-xs text-muted-foreground">Progress unavailable</p> : <p className="text-xs tabular-nums">{Math.round(percentage)}%</p>}
  </div>
}

export function AssemblyJobsList({ enabled, workOrderId, specimenId, search = '', onSearch }: {
  enabled: boolean; workOrderId?: string; specimenId?: string; search?: string; onSearch?: (value: string) => void
}) {
  const [creating, setCreating] = useState(false)
  const list = useRecordListState('assembly')
  const settled = useDebouncedSearch(search)
  const global = !workOrderId && !specimenId
  const query = useQuery({ queryKey: ['assembly-jobs', workOrderId, specimenId, global ? settled : '', global ? list.page : 1], queryFn: () => global ? getAssemblyJobsPage(settled,list.page) : getAssemblyJobs(workOrderId, specimenId), enabled: enabled && (!global || settled === search),
    refetchInterval: q => q.state.data?.jobs.some(j => !j.isTerminal || j.attentionReason) ? 5000 : false })
  const data = query.isError ? undefined : query.data
  useAssemblyNotifications(data?.jobs.map(job => job.id) ?? [], enabled)
  return <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Sequencing assembly</CardTitle>
    {workOrderId && specimenId && data?.canOperate ? <Button onClick={() => setCreating(true)} disabled={!data.availability.available}>Start assembly</Button> : null}</div></CardHeader><CardContent className="space-y-4">
    {!enabled ? <p className="text-sm text-muted-foreground">Connect with an authorized Phaeno session to view assembly jobs.</p> : null}
    {query.isPending && enabled ? <LoadingState label="Loading assembly jobs…" /> : null}
    {query.isFetching && !query.isPending ? <LoadingState label="Refreshing assembly jobs…" refreshing /> : null}
    {query.error ? <ErrorState title="Assembly jobs could not be refreshed" onRetry={() => void query.refetch()} retryLabel="Refresh" busy={query.isFetching}>{getLabOperationsError(query.error, 'Refresh to recover the current job status.')}</ErrorState> : null}
    {data && !data.availability.available ? <Alert><AlertTitle>Assembly setup required</AlertTitle><AlertDescription>{data.availability.message}</AlertDescription></Alert> : null}
    {onSearch ? <p className="text-sm text-muted-foreground">Track requested PSeq Service assembly attempts here. Start a new assembly from <Link to="/lab-operations" search={p => ({ ...p, section: 'assembly', assemblyTab: 'inputs' })} className={linkStyle}>Sequencing inputs</Link>.</p> : null}
    {onSearch ? <ListToolbar><Field><Label htmlFor="assembly-search">Find assembly jobs</Label><Input id="assembly-search" value={search} onChange={event => onSearch(event.target.value)} placeholder="Sample, run, or disposition" /></Field></ListToolbar> : null}
    {data && !data.jobs.length ? <p className="text-sm text-muted-foreground">{search ? 'No assembly jobs match this search.' : global && 'totalCount' in data && typeof data.totalCount === 'number' && data.totalCount > 0 ? 'This page has no assembly jobs. Choose an earlier page.' : 'No assembly jobs have been requested.'}</p> : null}
    {!global && data?.jobs.length && !data.jobs.some(j => assemblyMatches(j, search)) ? <p>No assembly jobs match this search.</p> : null}
    <RecordList aria-label="Sequencing assembly jobs">{data?.jobs.filter(j => global || assemblyMatches(j, search)).map(job => <RecordListItem key={job.id}
      title={<><RecordLink asChild><Link to="/lab-operations/assembly-jobs/$jobId" params={{ jobId: job.id }} search={p => ({ ...p, section: 'assembly', assemblyTab: 'jobs' })}>{job.sampleName} · Run {job.sequencingRunNumber}</Link></RecordLink>{job.simulated ? <Badge variant="outline">Simulated</Badge> : null}</>}
      metadata={<><p>Requested {date(job.requestedAtUtc)}</p><p>Start: {date(job.startedAtUtc)} · Stop: {date(job.stoppedAtUtc)}</p></>}
      status={<div className="w-56 max-w-full"><AssemblyJobProgress job={job} /></div>}>
      {job.attentionReason ? <p className="text-sm">{job.attentionReason}</p> : null}
    </RecordListItem>)}</RecordList>
    <p className="text-xs text-muted-foreground">Percentages are shown live. Job start, stop and final disposition are retained. Assembly completion requires separate scientific QC and customer release.</p>
    {global ? <RecordPagination label="Assembly job pages" data={query.isError ? undefined : data as { page: number; pageSize: number; totalCount: number } | undefined} busy={query.isFetching} onPage={page => list.change({ listPage:page })} /> : null}
    {creating && data ? <AssemblyStartDialog availability={data.availability} workOrderId={workOrderId} specimenId={specimenId} onClose={() => setCreating(false)} /> : null}
  </CardContent></Card>
}

export function AssemblyJobPage({ jobId }: { jobId: string }) {
  useAssemblyNotifications([jobId])
  const { session, authProvider } = usePhaenoSession()
  const allowed = Boolean(session?.capabilities.canManageLabOperations)
  const navigate = useNavigate()
  const [action, setAction] = useState<'retry' | 'cancel' | 'analysis' | null>(null)
  const query = useQuery({ queryKey: ['assembly-job', jobId], queryFn: () => getAssemblyJob(jobId), enabled: allowed && authProvider !== 'mock',
    refetchInterval: q => q.state.data && (!q.state.data.job.isTerminal || q.state.data.job.attentionReason) ? 5000 : false })
  const data = query.data
  const job = data?.job
  if (!allowed) return <main className="page-wrap px-4 py-8"><PageTitle>Laboratory access required</PageTitle></main>
  const actions: { label: string; action: 'retry' | 'cancel' | 'analysis' | 'qc' }[] = data && job && data.canOperate ? [
    ...(job.isTerminal && !job.attentionReason && data.availability.available ? [{ label: 'Repeat assembly', action: 'retry' as const }] : []),
    ...(!job.isTerminal && !job.cancellationRequested && (job.state === 'Queued' || data.availability.supportsCancellation) ? [{ label: 'Request cancellation', action: 'cancel' as const }] : []),
    ...(job.state === 'Succeeded' && !job.simulated && !job.attentionReason && !job.labAnalysisRunId && data.analyses.length ? [{ label: 'Link completed analysis', action: 'analysis' as const }] : []),
    ...(job.state === 'Succeeded' && !job.simulated && job.labAnalysisRunId && !job.attentionReason ? [{ label: 'Review QC', action: 'qc' as const }] : []),
  ] : []
  const openAction = (action: typeof actions[number]['action']) => action === 'qc' ? void navigate({ to: '/lab-operations/assembly-jobs/$jobId/qc', params: { jobId }, search: p => ({ ...p, section: 'assembly', assemblyTab: 'jobs' }) }) : setAction(action)
  return <main className="page-wrap space-y-5 px-4 py-8">
    <BackLink asChild><Link to="/lab-operations" search={p => ({ ...p, section: 'assembly', assemblyTab: 'jobs' })}>Back to sequencing assembly</Link></BackLink>
    {query.error ? <Alert variant="destructive"><AlertTitle>Assembly could not be refreshed</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh to recover the saved job.')}<Button variant="outline" onClick={() => void query.refetch()}>Refresh</Button></AlertDescription></Alert> : null}
    {!data ? <p role="status">{authProvider === 'mock' ? 'Use a connected Phaeno session to view this job.' : 'Loading assembly job…'}</p> : null}
    {data && job ? <>
      <PageHeader title={<>{job.sampleName} · Run {job.sequencingRunNumber}</>}
        description={<>Assembly attempt · {data.recipe.name} {data.recipe.version}</>}
        actions={actions.length === 1 ? <Button onClick={() => openAction(actions[0].action)}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end">{actions.map(item => <DropdownMenuItem key={item.action} onSelect={() => openAction(item.action)}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null} />
      {job.simulated ? <Alert><AlertTitle>Simulated assembly</AlertTitle><AlertDescription>The server processes this sample’s verified inputs with a mock pipeline. Outputs are diagnostic placeholders and cannot enter scientific QC or Customer release.</AlertDescription></Alert> : null}
      {job.attentionReason ? <Alert><AlertTitle>Attention required</AlertTitle><AlertDescription>{job.attentionReason}</AlertDescription></Alert> : null}
      {!data.availability.available ? <Alert><AlertDescription>{data.availability.message}</AlertDescription></Alert> : null}
      <Card><CardHeader><CardTitle>Execution</CardTitle></CardHeader><CardContent className="space-y-4"><AssemblyJobProgress job={job} />
        <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Actual start</dt><dd>{date(job.startedAtUtc)}</dd></div><div><dt className="text-muted-foreground">Actual stop</dt><dd>{date(job.stoppedAtUtc)}</dd></div><div><dt className="text-muted-foreground">Elapsed duration</dt><dd>{assemblyDuration(job.durationSeconds)}</dd></div><div><dt className="text-muted-foreground">Final disposition</dt><dd>{job.isTerminal ? `${assemblyStateLabel(job.state)} · ${date(job.dispositionAtUtc)}` : 'Not yet confirmed'}</dd></div></dl>
        {job.dispositionReason ? <p>{job.dispositionReason}</p> : null}{job.retryReason ? <p>Reason for repeat: {job.retryReason}</p> : null}
        {job.previousJobId ? <RecordLink asChild><Link to="/lab-operations/assembly-jobs/$jobId" params={{ jobId: job.previousJobId }} search={p => ({ ...p, section: 'assembly', assemblyTab: 'jobs' })}>Previous assembly attempt</Link></RecordLink> : null}
      </CardContent></Card>
      {data.delivery.length ? <Card><CardHeader><CardTitle>Delivery and recovery</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">A command receipt confirms delivery. Actual start and final outcome require processing evidence.</p>
        {data.delivery.map(command => <div key={command.kind} className="space-y-1 rounded-lg border p-3">
          <p className="font-medium">{command.kind === 'Run' ? 'Run request' : 'Cancellation request'} · {command.suppressed ? 'Further delivery stopped' : command.confirmedAtUtc ? command.kind === 'Run' && !job.isTerminal ? 'Start confirmed' : 'Outcome confirmed' : command.escalatedAtUtc ? 'Operations review required' : 'Awaiting confirmation'}</p>
          <p>{command.attemptCount} delivery attempt{command.attemptCount === 1 ? '' : 's'} · Last attempt: {date(command.lastAttemptAtUtc)}</p>
          <p>Receipt: {date(command.receivedAtUtc)} · Confirmation: {date(command.confirmedAtUtc)}</p>
          {command.nextAttemptAtUtc ? <p>Next recovery attempt: {date(command.nextAttemptAtUtc)}</p> : null}
          {command.escalatedAtUtc ? <p>Escalated: {date(command.escalatedAtUtc)}</p> : null}
        </div>)}
      </CardContent></Card> : null}
      <Card><CardHeader><CardTitle>Inputs and results</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
        <p>{data.inputs.length} registered sequencing input{data.inputs.length === 1 ? '' : 's'} · exact input identities retained.</p>
        {data.inputs.map((input, i) => <div key={input.sequencingOutputId} className="break-all border-b pb-2"><p>Input {i + 1} · {input.sizeBytes.toLocaleString()} bytes</p><p className="text-xs text-muted-foreground">SHA-256: {input.sha256}</p></div>)}
        <p>{job.simulated ? job.state === 'Succeeded' ? 'Simulation completed. Verified placeholder outputs are available for inspection below.' : 'Diagnostic outputs become available after the simulation completes and their checksums are verified.' : job.labAnalysisRunId ? 'Completed analysis linked. Review the exact output package and record QC before scientific approval and Customer release.' : job.state === 'Succeeded' ? 'Execution succeeded. Completed-analysis evidence and verified result files must be registered and linked before review.' : 'Results become eligible for inspection only after successful assembly and output verification.'}</p>
        {job.simulated ? <SimulatedOutputs jobId={job.id} outputs={data.simulatedOutputs} /> : null}
        <RecordLink asChild><Link to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId: job.labWorkOrderId, specimenId: job.labSpecimenId }} search={p => ({ ...p, section: 'jobs' })}>Open sample and scientific evidence</Link></RecordLink>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Job history</CardTitle></CardHeader><CardContent><ol className="space-y-3 text-sm">{data.events.map(event => <li key={event.id} className="border-b pb-2"><span className="font-medium">{assemblyStateLabel(event.kind)}</span><p className="text-xs text-muted-foreground">Recorded {date(event.recordedAtUtc)}</p></li>)}</ol></CardContent></Card>
      {action === 'retry' ? <AssemblyStartDialog availability={data.availability} previous={job} workOrderId={job.labWorkOrderId} specimenId={job.labSpecimenId} onClose={() => setAction(null)} /> : null}
      {action === 'cancel' || action === 'analysis' ? <AssemblyActionDialog data={data} action={action} onClose={() => setAction(null)} /> : null}
    </> : null}
  </main>
}

function SimulatedOutputs({ jobId, outputs }: { jobId: string; outputs: AssemblyDetail['simulatedOutputs'] }) {
  const download = useMutation({ mutationFn: (output: AssemblyDetail['simulatedOutputs'][number]) =>
    downloadSimulatedAssemblyOutput(jobId, output.artifactId, output.fileName) })
  if (!outputs.length) return null
  return <div className="space-y-2">
    {outputs.map(output => <div key={output.artifactId} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded border p-3">
      <span className="min-w-0 break-words">{output.fileName}<span className="block text-xs text-muted-foreground">Simulated · {output.sizeBytes.toLocaleString()} bytes</span></span>
      <Button variant="outline" disabled={download.isPending} aria-label={`Download simulated ${output.fileName}`} onClick={() => download.mutate(output)}>{download.isPending && download.variables?.artifactId === output.artifactId ? 'Downloading…' : 'Download'}</Button>
    </div>)}
    {download.error ? <p role="alert" className="text-destructive">{getLabOperationsError(download.error, 'The simulated output could not be downloaded.')}</p> : null}
  </div>
}

function AssemblyActionDialog({ data, action, onClose }: { data: AssemblyDetail; action: 'cancel' | 'analysis'; onClose: () => void }) {
  const client = useQueryClient()
  const form = useForm<{ value: string }>({ resolver: zodResolver(z.object({ value: action === 'cancel' ? z.string().trim().min(1, 'Enter a reason.').max(2000) : z.string().uuid('Select an analysis.') })), defaultValues: { value: '' } })
  const __modalGuard = useModalDraftGuard(form.formState.isDirty, form.formState.isSubmitting)

  const mutation = useMutation({ mutationFn: (value: string) => action === 'cancel' ? cancelAssembly(data.job, value) : linkAssemblyAnalysis(data.job, value),
    onSuccess: async () => {
    __modalGuard.allowNavigation()
 await Promise.all([client.invalidateQueries({ queryKey: ['assembly-job', data.job.id] }), client.invalidateQueries({ queryKey: ['assembly-jobs'] })]); onClose() } })
  return <Dialog open onOpenChange={open => { if (open) (open => { if (!open && !mutation.isPending) onClose() })(open); else void __modalGuard.close(() => (open => { if (!open && !mutation.isPending) onClose() })(false)) }}><DialogContent>
    <DialogHeader><DialogTitle>{action === 'cancel' ? 'Request cancellation' : 'Link completed analysis'}</DialogTitle><DialogDescription>{action === 'cancel' ? 'The job remains active until the processing service confirms its final disposition.' : 'The analysis must match this execution, its inputs and actual start/stop times. Linking does not approve or release results.'}</DialogDescription>
      {mutation.error ? <Alert variant="destructive"><AlertDescription>{getLabOperationsError(mutation.error, 'The request could not be completed.')}</AlertDescription></Alert> : null}
    </DialogHeader>
    <form id="assembly-action" noValidate onSubmit={form.handleSubmit(v => mutation.mutate(v.value))} className="space-y-2"><Label htmlFor="assembly-action-value"><RequiredFieldName>{action === 'cancel' ? 'Reason' : 'Completed analysis'}</RequiredFieldName></Label>
      {action === 'cancel' ? <Textarea id="assembly-action-value" {...form.register('value')} aria-invalid={Boolean(form.formState.errors.value)} aria-describedby="assembly-action-error" /> : <NativeSelect id="assembly-action-value" className="w-full" {...form.register('value')} aria-invalid={Boolean(form.formState.errors.value)} aria-describedby="assembly-action-error"><option value="">Choose an analysis</option>{data.analyses.map(a => <option key={a.id} value={a.id}>{a.runReference} · {date(a.recordedAtUtc)}</option>)}</NativeSelect>}
      <p id="assembly-action-error" className="text-sm text-destructive">{form.formState.errors.value?.message}</p>
    </form><RequiredDialogFooter><Button variant="outline" onClick={() => { void __modalGuard.close(() => (onClose)()) }} disabled={mutation.isPending}>Cancel</Button><Button type="submit" form="assembly-action" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : action === 'cancel' ? 'Request cancellation' : 'Link analysis'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
