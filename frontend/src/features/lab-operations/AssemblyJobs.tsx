import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { cancelAssembly, getAssemblyJob, getAssemblyJobs, linkAssemblyAnalysis, type AssemblyDetail, type AssemblyJob } from '#/api/lab-assembly'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Textarea } from '#/components/ui/textarea'
import { usePhaenoSession } from '#/features/auth/session-context'
import { AssemblyStartDialog } from './AssemblyStartDialog'
import { assemblyDuration, assemblyMatches, assemblyStateLabel, currentAssemblyPercentage } from './assembly-jobs'
import { LabManufacturingQueue } from './LabManufacturingPage'

const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not reported'
const linkStyle = 'text-primary underline underline-offset-4'

export function DataAssemblyWorkspace({ apiEnabled }: { apiEnabled: boolean }) {
  const search = useSearch({ from: '/lab-operations' })
  const navigate = useNavigate()
  const tab = search.assemblyTab ?? 'runs'
  return <Tabs value={tab} onValueChange={value => void navigate({ to: '/lab-operations', search: p => ({ ...p, section: 'assembly', assemblyTab: value === 'cases' ? 'cases' : 'runs' }), resetScroll: false })}>
    <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="runs">Sequencing runs</TabsTrigger><TabsTrigger value="cases">Assembly cases</TabsTrigger></TabsList>
    <TabsContent value="runs"><AssemblyJobsList enabled={apiEnabled} search={search.assemblySearch ?? ''} onSearch={value => void navigate({ to: '/lab-operations', search: p => ({ ...p, section: 'assembly', assemblyTab: 'runs', assemblySearch: value || undefined }), replace: true, resetScroll: false })} /></TabsContent>
    <TabsContent value="cases"><LabManufacturingQueue workflow="assembly" apiEnabled={apiEnabled} /></TabsContent>
  </Tabs>
}

export function AssemblyJobProgress({ job }: { job: AssemblyJob }) {
  const percentage = currentAssemblyPercentage(job.progress, job.isTerminal)
  if (job.isTerminal) return <Badge variant="outline">{assemblyStateLabel(job.state)}</Badge>
  return <div className="space-y-1"><span className="text-sm">{job.cancellationRequested ? 'Cancellation requested' : assemblyStateLabel(job.state)}</span>
    {percentage === null ? <p className="text-xs text-muted-foreground">Progress unavailable</p> : <><progress aria-label={`Assembly progress for ${job.sampleName}, run ${job.sequencingRunNumber}`} max={100} value={percentage} className="h-2 w-full accent-primary" /><p className="text-xs tabular-nums">{Math.round(percentage)}%</p></>}
  </div>
}

export function AssemblyJobsList({ enabled, workOrderId, specimenId, search = '', onSearch }: {
  enabled: boolean; workOrderId?: string; specimenId?: string; search?: string; onSearch?: (value: string) => void
}) {
  const [creating, setCreating] = useState(false)
  const query = useQuery({ queryKey: ['assembly-jobs', workOrderId, specimenId], queryFn: () => getAssemblyJobs(workOrderId, specimenId), enabled,
    refetchInterval: q => q.state.data?.jobs.some(j => !j.isTerminal || j.attentionReason) ? 5000 : false })
  const data = query.data
  return <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Sequencing assembly</CardTitle>
    {data?.canOperate ? <Button onClick={() => setCreating(true)} disabled={!data.availability.available}>Start assembly</Button> : null}</div></CardHeader><CardContent className="space-y-4">
    {!enabled ? <p className="text-sm text-muted-foreground">Connect with an authorized Phaeno session to view assembly jobs.</p> : null}
    {query.isPending && enabled ? <p role="status">Loading assembly jobs…</p> : null}
    {query.error ? <Alert variant="destructive"><AlertTitle>Assembly jobs could not be refreshed</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh to recover the current job status.')}<Button variant="outline" onClick={() => void query.refetch()}>Refresh</Button></AlertDescription></Alert> : null}
    {data && !data.availability.available ? <Alert><AlertTitle>Assembly setup required</AlertTitle><AlertDescription>{data.availability.message}</AlertDescription></Alert> : null}
    {onSearch ? <div className="space-y-1"><Label htmlFor="assembly-search">Find assembly jobs</Label><Input id="assembly-search" value={search} onChange={event => onSearch(event.target.value)} placeholder="Sample, run, or disposition" /></div> : null}
    {data && !data.jobs.length ? <p className="text-sm text-muted-foreground">No assembly jobs have been requested.</p> : null}
    {data?.jobs.length && !data.jobs.some(j => assemblyMatches(j, search)) ? <p>No assembly jobs match this search.</p> : null}
    {data?.jobs.filter(j => assemblyMatches(j, search)).map(job => <div key={job.id} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,16rem)]">
      <div className="min-w-0"><Link className={`${linkStyle} font-medium`} to="/lab-operations/assembly-jobs/$jobId" params={{ jobId: job.id }} search={p => ({ ...p, section: 'assembly', assemblyTab: 'runs' })}>{job.sampleName} · Run {job.sequencingRunNumber}</Link>
        <p className="mt-1 text-xs text-muted-foreground">Requested {date(job.requestedAtUtc)}</p><p className="text-xs text-muted-foreground">Start: {date(job.startedAtUtc)} · Stop: {date(job.stoppedAtUtc)}</p>
        {job.attentionReason ? <p className="mt-1 text-sm">{job.attentionReason}</p> : null}</div><AssemblyJobProgress job={job} />
    </div>)}
    <p className="text-xs text-muted-foreground">Percentages are shown live. Job start, stop and final disposition are retained. Assembly completion requires separate scientific QC and customer release.</p>
    {creating && data ? <AssemblyStartDialog availability={data.availability} workOrderId={workOrderId} specimenId={specimenId} onClose={() => setCreating(false)} /> : null}
  </CardContent></Card>
}

export function AssemblyJobPage({ jobId }: { jobId: string }) {
  const { session, authProvider } = usePhaenoSession()
  const allowed = Boolean(session?.capabilities.canManageLabOperations)
  const [action, setAction] = useState<'retry' | 'cancel' | 'analysis' | null>(null)
  const query = useQuery({ queryKey: ['assembly-job', jobId], queryFn: () => getAssemblyJob(jobId), enabled: allowed && authProvider !== 'mock',
    refetchInterval: q => q.state.data && (!q.state.data.job.isTerminal || q.state.data.job.attentionReason) ? 5000 : false })
  const data = query.data
  const job = data?.job
  if (!allowed) return <main className="page-wrap px-4 py-8"><h1 className="text-xl font-semibold">Laboratory access required</h1></main>
  const actions: { label: string; action: 'retry' | 'cancel' | 'analysis' }[] = data && job && data.canOperate ? [
    ...(job.isTerminal && !job.attentionReason && data.availability.available ? [{ label: 'Repeat assembly', action: 'retry' as const }] : []),
    ...(!job.isTerminal && !job.cancellationRequested && (job.state === 'Queued' || data.availability.supportsCancellation) ? [{ label: 'Request cancellation', action: 'cancel' as const }] : []),
    ...(job.state === 'Succeeded' && !job.attentionReason && !job.labAnalysisRunId && data.analyses.length ? [{ label: 'Link completed analysis', action: 'analysis' as const }] : []),
  ] : []
  return <main className="page-wrap space-y-5 px-4 py-8">
    <Link className={linkStyle} to="/lab-operations" search={p => ({ ...p, section: 'assembly', assemblyTab: 'runs' })}>Back to sequencing assembly</Link>
    {query.error ? <Alert variant="destructive"><AlertTitle>Assembly could not be refreshed</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh to recover the saved job.')}<Button variant="outline" onClick={() => void query.refetch()}>Refresh</Button></AlertDescription></Alert> : null}
    {!data ? <p role="status">{authProvider === 'mock' ? 'Use a connected Phaeno session to view this job.' : 'Loading assembly job…'}</p> : null}
    {data && job ? <>
      <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">{job.sampleName} · Run {job.sequencingRunNumber}</h1><p className="text-sm text-muted-foreground">Assembly attempt · {data.recipe.name} {data.recipe.version}</p></div>
        {actions.length === 1 ? <Button onClick={() => setAction(actions[0].action)}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions<ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{actions.map(item => <DropdownMenuItem key={item.action} onSelect={() => setAction(item.action)}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}
      </header>
      {job.attentionReason ? <Alert><AlertTitle>Attention required</AlertTitle><AlertDescription>{job.attentionReason}</AlertDescription></Alert> : null}
      {!data.availability.available ? <Alert><AlertDescription>{data.availability.message}</AlertDescription></Alert> : null}
      <Card><CardHeader><CardTitle>Execution</CardTitle></CardHeader><CardContent className="space-y-4"><AssemblyJobProgress job={job} />
        <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Actual start</dt><dd>{date(job.startedAtUtc)}</dd></div><div><dt className="text-muted-foreground">Actual stop</dt><dd>{date(job.stoppedAtUtc)}</dd></div><div><dt className="text-muted-foreground">Elapsed duration</dt><dd>{assemblyDuration(job.durationSeconds)}</dd></div><div><dt className="text-muted-foreground">Final disposition</dt><dd>{job.isTerminal ? `${assemblyStateLabel(job.state)} · ${date(job.dispositionAtUtc)}` : 'Not yet confirmed'}</dd></div></dl>
        {job.dispositionReason ? <p>{job.dispositionReason}</p> : null}{job.retryReason ? <p>Reason for repeat: {job.retryReason}</p> : null}
        {job.previousJobId ? <Link className={linkStyle} to="/lab-operations/assembly-jobs/$jobId" params={{ jobId: job.previousJobId }} search={p => ({ ...p, section: 'assembly', assemblyTab: 'runs' })}>Previous assembly attempt</Link> : null}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Inputs and results</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
        <p>{data.inputs.length} registered sequencing input{data.inputs.length === 1 ? '' : 's'} · exact input identities retained.</p>
        {data.inputs.map((input, i) => <div key={input.sequencingOutputId} className="break-all border-b pb-2"><p>Input {i + 1} · {input.sizeBytes.toLocaleString()} bytes</p><p className="text-xs text-muted-foreground">SHA-256: {input.sha256}</p></div>)}
        <p>{job.labAnalysisRunId ? 'Completed analysis linked. Scientific QC and customer release are managed in the sample workspace.' : job.state === 'Succeeded' ? 'Execution succeeded. Completed-analysis evidence and verified result files must be registered and linked before review.' : 'Results become eligible for inspection only after successful assembly and output verification.'}</p>
        <Link className={linkStyle} to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId: job.labWorkOrderId, specimenId: job.labSpecimenId }} search={p => ({ ...p, section: 'jobs' })}>Open sample and scientific evidence</Link>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Job history</CardTitle></CardHeader><CardContent><ol className="space-y-3 text-sm">{data.events.map(event => <li key={event.id} className="border-b pb-2"><span className="font-medium">{assemblyStateLabel(event.kind)}</span><p className="text-xs text-muted-foreground">Recorded {date(event.recordedAtUtc)}</p></li>)}</ol></CardContent></Card>
      {action === 'retry' ? <AssemblyStartDialog availability={data.availability} previous={job} workOrderId={job.labWorkOrderId} specimenId={job.labSpecimenId} onClose={() => setAction(null)} /> : null}
      {action === 'cancel' || action === 'analysis' ? <AssemblyActionDialog data={data} action={action} onClose={() => setAction(null)} /> : null}
    </> : null}
  </main>
}

function AssemblyActionDialog({ data, action, onClose }: { data: AssemblyDetail; action: 'cancel' | 'analysis'; onClose: () => void }) {
  const client = useQueryClient()
  const form = useForm<{ value: string }>({ resolver: zodResolver(z.object({ value: action === 'cancel' ? z.string().trim().min(1, 'Enter a reason.').max(2000) : z.string().uuid('Select an analysis.') })), defaultValues: { value: '' } })
  const mutation = useMutation({ mutationFn: (value: string) => action === 'cancel' ? cancelAssembly(data.job, value) : linkAssemblyAnalysis(data.job, value),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['assembly-job', data.job.id] }), client.invalidateQueries({ queryKey: ['assembly-jobs'] })]); onClose() } })
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}><DialogContent>
    <DialogHeader><DialogTitle>{action === 'cancel' ? 'Request cancellation' : 'Link completed analysis'}</DialogTitle><DialogDescription>{action === 'cancel' ? 'The job remains active until the processing service confirms its final disposition.' : 'The analysis must match this execution, its inputs and actual start/stop times. Linking does not approve or release results.'}</DialogDescription>
      {mutation.error ? <Alert variant="destructive"><AlertDescription>{getLabOperationsError(mutation.error, 'The request could not be completed.')}</AlertDescription></Alert> : null}
    </DialogHeader>
    <form id="assembly-action" noValidate onSubmit={form.handleSubmit(v => mutation.mutate(v.value))} className="space-y-2"><Label htmlFor="assembly-action-value"><RequiredFieldName>{action === 'cancel' ? 'Reason' : 'Completed analysis'}</RequiredFieldName></Label>
      {action === 'cancel' ? <Textarea id="assembly-action-value" {...form.register('value')} aria-invalid={Boolean(form.formState.errors.value)} aria-describedby="assembly-action-error" /> : <select id="assembly-action-value" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-ring" {...form.register('value')} aria-invalid={Boolean(form.formState.errors.value)} aria-describedby="assembly-action-error"><option value="">Choose an analysis</option>{data.analyses.map(a => <option key={a.id} value={a.id}>{a.runReference} · {date(a.recordedAtUtc)}</option>)}</select>}
      <p id="assembly-action-error" className="text-sm text-destructive">{form.formState.errors.value?.message}</p>
    </form><RequiredDialogFooter><Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button type="submit" form="assembly-action" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : action === 'cancel' ? 'Request cancellation' : 'Link analysis'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
