import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getLabOperationsDashboard, getLabOperationsError } from '#/api/lab-operations'
import {
  abandonReagentRun, completeReagentRun, getReagentRun, listReagentRuns,
  listReagentWorkflows, reagentRunsKey, reagentWorkflowsKey,
  recordReagentStep, recordReagentUse, startReagentRun,
  type ReagentRun,
} from '#/api/lab-reagent-manufacturing'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { PreparationField, prepSelectClass } from './preparation-ui'

const positive = z.coerce.number<number>().positive('Enter an amount greater than zero.')
const startSchema = z.object({ materialDefinitionId: z.string().min(1, 'Choose a reagent.'), storageLocationId: z.string().min(1, 'Choose a location.') })
const useSchema = z.object({ sourceMaterialLotId: z.string().min(1, 'Choose a source lot.'), quantity: positive, materialExhausted: z.boolean() })
const stepSchema = z.object({ notes: z.string().trim().min(1, 'Record what happened at this step.').max(4000) })
const completeSchema = z.object({ producedQuantity: positive, expirationOrRetestDate: z.string() })
const abandonSchema = z.object({ reason: z.string().trim().min(1, 'Explain why this run stopped.').max(2000) })

export function ReagentManufacturingWorkspace({ enabled, canOperate }: { enabled: boolean; canOperate: boolean }) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const runs = useQuery({ queryKey: reagentRunsKey, queryFn: listReagentRuns, enabled })
  const workflows = useQuery({ queryKey: reagentWorkflowsKey, queryFn: listReagentWorkflows, enabled })
  const dashboard = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled: enabled && open })
  const form = useForm<z.infer<typeof startSchema>>({ resolver: zodResolver(startSchema), defaultValues: { materialDefinitionId: '', storageLocationId: '' } })
  const eligibleWorkflows = workflows.data?.filter(item => item.status === 'Approved' && item.outputUnit
    && dashboard.data?.materialDefinitions.some(definition => definition.id === item.materialDefinitionId && definition.supplierProductId)) ?? []
  const start = useMutation({
    mutationFn: startReagentRun,
    onSuccess: async run => {
      setOpen(false)
      form.reset()
      await client.invalidateQueries({ queryKey: reagentRunsKey })
      await navigate({ to: '/lab-operations/reagent-runs/$runId', params: { runId: run.id } })
    },
  })
  return <>
    <Card className="gap-0 py-0"><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b bg-muted/50 p-4"><div><CardTitle>Reagent manufacturing</CardTitle><CardDescription>Start an approved procedure, record each material use as it happens, and complete the Phaeno lot.</CardDescription></div>{canOperate ? <Button type="button" onClick={() => setOpen(true)}><Plus data-icon="inline-start" /> Start reagent run</Button> : null}</CardHeader><CardContent className="space-y-3 p-4">
      {runs.isPending ? <p role="status">Loading reagent runs…</p> : runs.isError ? <Alert variant="destructive"><AlertTitle>Runs could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(runs.error, 'Refresh the workspace and try again.')}</AlertDescription></Alert> : runs.data.length ? <ul className="space-y-2">{runs.data.map(run => <li key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><Link to="/lab-operations/reagent-runs/$runId" params={{ runId: run.id }} className="font-medium text-primary hover:underline">{run.materialName} · {run.lotNumber}</Link><p className="text-sm text-muted-foreground">Procedure: {run.workflowName}, revision {run.workflowRevision} · {new Date(run.startedAtUtc).toLocaleString()}</p></div><Badge variant="secondary">{run.status}</Badge></li>)}</ul> : <p className="text-sm text-muted-foreground">No reagent runs yet.</p>}
    </CardContent></Card>
    <Dialog open={open} onOpenChange={value => { if (!start.isPending) setOpen(value) }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(value => start.mutate(value))}><DialogHeader><DialogTitle>Start reagent run</DialogTitle><DialogDescription>Choose the reagent. POMS uses its approved workflow and saved inventory unit, assigns a Phaeno lot number, and records the exact procedure revision. Enter the actual quantity produced after the run is complete.</DialogDescription></DialogHeader><div className="space-y-4">
      <div className="space-y-[3px]">
        <PreparationField id="run-reagent" label="Reagent" required error={form.formState.errors.materialDefinitionId?.message}><select id="run-reagent" className={prepSelectClass} {...form.register('materialDefinitionId')}><option value="">Select reagent…</option>{eligibleWorkflows.sort((a, b) => a.materialName.localeCompare(b.materialName)).map(item => <option key={item.id} value={item.materialDefinitionId}>{item.materialName} ({item.outputUnit})</option>)}</select></PreparationField>
        {!workflows.isPending && !dashboard.isPending && !eligibleWorkflows.length ? <p className="text-xs text-muted-foreground">Define an active reagent product under Phaeno in Suppliers &amp; products, then approve its workflow in Lab settings.</p> : null}
      </div>
      <PreparationField id="run-location" label="Storage location" required error={form.formState.errors.storageLocationId?.message}><select id="run-location" className={prepSelectClass} {...form.register('storageLocationId')}><option value="">Select location…</option>{dashboard.data?.storageLocations.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></PreparationField>
      {start.isError ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(start.error, 'The run could not be started.')}</p> : null}
    </div><RequiredDialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={start.isPending}>Cancel</Button><Button type="submit" disabled={start.isPending || !eligibleWorkflows.length}>{start.isPending ? 'Starting…' : 'Start run'}</Button></RequiredDialogFooter></form></DialogContent></Dialog>
  </>
}

type RunAction = 'use' | 'step' | 'complete' | 'abandon'

export function ReagentRunPage({ runId }: { runId: string }) {
  const { authProvider, session } = usePhaenoSession()
  const enabled = Boolean(session?.capabilities.canManageLabOperations) && authProvider !== 'mock'
  const canOperate = Boolean(session?.capabilities.canOperateLabWork)
  const canSupervise = Boolean(session?.capabilities.canSuperviseLabWork)
  const client = useQueryClient()
  const run = useQuery({ queryKey: [...reagentRunsKey, runId], queryFn: () => getReagentRun(runId), enabled })
  const dashboard = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled: enabled && run.data?.status === 'InProgress' })
  const [action, setAction] = useState<RunAction | null>(null)
  const current = run.data
  const nextStep = current?.steps[current.recordedSteps.length]
  const sourceLots = dashboard.data?.materialLots.filter(lot => lot.id !== current?.materialLotId && (lot.qcDisposition === 'Passed' || lot.qcDisposition === 'ApprovedException') && !lot.quantityHoldReason && lot.availableQuantity > 0 && (!lot.expirationOrRetestDate || lot.expirationOrRetestDate >= new Date().toISOString().slice(0, 10))) ?? []
  const actions: { label: string; value: RunAction }[] = current?.status === 'InProgress' ? [
    ...(canOperate ? [{ label: 'Record material use', value: 'use' as const }] : []),
    ...(canOperate && nextStep ? [{ label: 'Record next step', value: 'step' as const }] : []),
    ...(canOperate && !nextStep && current.materialUses.length > 0 ? [{ label: 'Complete run', value: 'complete' as const }] : []),
    ...(canSupervise ? [{ label: 'Abandon run', value: 'abandon' as const }] : []),
  ] : []
  const saved = async () => {
    await Promise.all([client.invalidateQueries({ queryKey: [...reagentRunsKey, runId] }), client.invalidateQueries({ queryKey: reagentRunsKey }), client.invalidateQueries({ queryKey: ['lab-operations'] })])
    setAction(null)
  }
  if (!enabled) return <main className="page-wrap py-8"><p role="alert">You need a connected Phaeno laboratory session to view this run.</p></main>
  return <main className="page-wrap space-y-5 py-8"><Link to="/lab-operations" search={{ section: 'reagent-runs' }} className="text-sm text-primary hover:underline">← Reagent manufacturing</Link>
    {run.isPending ? <p role="status">Loading reagent run…</p> : run.isError ? <Alert variant="destructive"><AlertTitle>Run could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(run.error, 'Try refreshing this page.')}</AlertDescription></Alert> : current ? <>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">{current.materialName}</h1><p className="mt-1 text-muted-foreground">Lot {current.lotNumber} · Procedure: {current.workflowName}, revision {current.workflowRevision}</p></div><div className="flex items-center gap-2"><Badge variant="secondary">{current.status}</Badge>{actions.length === 1 ? <Button type="button" onClick={() => setAction(actions[0].value)}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button type="button">Actions <ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{actions.map(item => <DropdownMenuItem key={item.value} onSelect={() => setAction(item.value)}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}</div></div>
      <Card><CardHeader><CardTitle>Lot and run</CardTitle><CardDescription>Started {new Date(current.startedAtUtc).toLocaleString()} · Stored at {current.storageLocation}</CardDescription></CardHeader><CardContent className="space-y-2 text-sm"><p>Available quantity: {current.availableQuantity} {current.quantityUnit}</p><p>Quality control: {current.qcDisposition}. The completed lot needs QC approval before use.</p>{current.abandonmentReason ? <p>Stopped: {current.abandonmentReason}</p> : null}<Link to="/lab-operations/materials/$materialLotId" params={{ materialLotId: current.materialLotId }} className="text-primary hover:underline">View material lot</Link></CardContent></Card>
      <Card><CardHeader><CardTitle>Procedure steps</CardTitle><CardDescription>These instructions were captured from the approved revision when the run started. They have no sample or tube assignment.</CardDescription></CardHeader><CardContent><ol className="space-y-3">{current.steps.map((step, index) => { const record = current.recordedSteps.find(item => item.sequence === index); return <li key={`${step.key}-${index}`} className="rounded-lg border p-3"><p className="font-medium">{index + 1}. {step.name} {record ? <Badge variant="secondary">Recorded</Badge> : null}</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{step.instructions}</p>{record ? <p className="mt-2 text-sm">{record.notes} · {new Date(record.performedAtUtc).toLocaleString()}</p> : null}</li> })}</ol></CardContent></Card>
      <Card><CardHeader><CardTitle>Source material uses</CardTitle><CardDescription>Each saved use immediately reduces the source lot’s remaining quantity, including if this run is later stopped.</CardDescription></CardHeader><CardContent>{current.materialUses.length ? <ul className="space-y-2">{current.materialUses.map(item => <li key={item.id} className="rounded-lg border p-3 text-sm"><Link to="/lab-operations/materials/$materialLotId" params={{ materialLotId: item.sourceMaterialLotId }} className="font-medium text-primary hover:underline">{item.sourceName} · {item.sourceLotNumber}</Link><p>{item.quantity} {item.quantityUnit}{item.materialExhausted ? ' · source exhausted' : ''} · {new Date(item.recordedAtUtc).toLocaleString()}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">No material use recorded.</p>}</CardContent></Card>
      {action === 'use' ? <UseDialog run={current} sources={sourceLots} onClose={() => setAction(null)} onSaved={saved} /> : null}
      {action === 'step' && nextStep ? <StepDialog run={current} nextStepName={nextStep.name} onClose={() => setAction(null)} onSaved={saved} /> : null}
      {action === 'complete' ? <CompleteDialog run={current} onClose={() => setAction(null)} onSaved={saved} /> : null}
      {action === 'abandon' ? <AbandonDialog run={current} onClose={() => setAction(null)} onSaved={saved} /> : null}
    </> : null}
  </main>
}

type ActionProps = { run: ReagentRun; onClose: () => void; onSaved: () => Promise<void> }
function UseDialog({ run, sources, onClose, onSaved }: ActionProps & { sources: Awaited<ReturnType<typeof getLabOperationsDashboard>>['materialLots'] }) {
  const form = useForm<z.infer<typeof useSchema>>({ resolver: zodResolver(useSchema), defaultValues: { sourceMaterialLotId: '', quantity: 0, materialExhausted: false } })
  const source = sources.find(item => item.id === form.watch('sourceMaterialLotId'))
  const mutation = useMutation({ mutationFn: (value: z.infer<typeof useSchema>) => recordReagentUse(run, { ...value, quantityUnit: source?.quantityUnit ?? '' }), onSuccess: onSaved })
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(value => mutation.mutate(value))}><DialogHeader><DialogTitle>Record material use</DialogTitle><DialogDescription>Saving deducts this amount immediately from the source lot. It stays deducted if this run is abandoned.</DialogDescription></DialogHeader><div className="space-y-4"><PreparationField id="reagent-source" label="Source lot" required error={form.formState.errors.sourceMaterialLotId?.message}><select id="reagent-source" className={prepSelectClass} {...form.register('sourceMaterialLotId')}><option value="">Select QC-approved lot…</option>{sources.map(item => <option key={item.id} value={item.id}>{item.name} · {item.lotNumber} · {item.availableQuantity} {item.quantityUnit} available</option>)}</select></PreparationField><PreparationField id="reagent-use-quantity" label={`Amount used${source ? ` (${source.quantityUnit})` : ''}`} required error={form.formState.errors.quantity?.message}><Input id="reagent-use-quantity" type="number" min="0" step="any" {...form.register('quantity', { valueAsNumber: true })} /></PreparationField><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('materialExhausted')} /> Mark source lot exhausted</label>{mutation.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(mutation.error, 'The use could not be recorded. Refresh the run before retrying.')}</p> : null}</div><RequiredDialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button type="submit" disabled={mutation.isPending || !source}>{mutation.isPending ? 'Recording…' : 'Record use'}</Button></RequiredDialogFooter></form></DialogContent></Dialog>
}
function StepDialog({ run, nextStepName, onClose, onSaved }: ActionProps & { nextStepName: string }) {
  const form = useForm<z.infer<typeof stepSchema>>({ resolver: zodResolver(stepSchema), defaultValues: { notes: '' } })
  const mutation = useMutation({ mutationFn: (value: z.infer<typeof stepSchema>) => recordReagentStep(run, { sequence: run.recordedSteps.length, notes: value.notes }), onSuccess: onSaved })
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(value => mutation.mutate(value))}><DialogHeader><DialogTitle>Record {nextStepName}</DialogTitle><DialogDescription>Record what was done before proceeding to the next step.</DialogDescription></DialogHeader><div><PreparationField id="reagent-step-notes" label="Run notes" required error={form.formState.errors.notes?.message}><textarea id="reagent-step-notes" className={`${prepSelectClass} min-h-28 py-2`} maxLength={4000} {...form.register('notes')} /></PreparationField>{mutation.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(mutation.error, 'The step could not be recorded.')}</p> : null}</div><RequiredDialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>Record step</Button></RequiredDialogFooter></form></DialogContent></Dialog>
}
function CompleteDialog({ run, onClose, onSaved }: ActionProps) {
  const schema = completeSchema.superRefine((value, context) => {
    if (run.requiresExpiration && !value.expirationOrRetestDate)
      context.addIssue({ code: 'custom', path: ['expirationOrRetestDate'], message: 'Enter the expiration or retest date for this reagent.' })
  })
  const form = useForm<z.infer<typeof completeSchema>>({ resolver: zodResolver(schema), defaultValues: { producedQuantity: 0, expirationOrRetestDate: '' } })
  const mutation = useMutation({ mutationFn: (value: z.infer<typeof completeSchema>) => completeReagentRun(run, { producedQuantity: value.producedQuantity, expirationOrRetestDate: value.expirationOrRetestDate || null }), onSuccess: onSaved })
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(value => mutation.mutate(value))}><DialogHeader><DialogTitle>Complete reagent run</DialogTitle><DialogDescription>The produced quantity becomes the new Phaeno lot’s available amount. QC approval is still required before staff can use it.</DialogDescription></DialogHeader><div className="space-y-4"><PreparationField id="reagent-produced" label={`Produced amount (${run.quantityUnit})`} required error={form.formState.errors.producedQuantity?.message}><Input id="reagent-produced" type="number" min="0" step="any" {...form.register('producedQuantity', { valueAsNumber: true })} /></PreparationField><PreparationField id="reagent-expiration" label="Expiration or retest date" required={run.requiresExpiration} error={form.formState.errors.expirationOrRetestDate?.message}><Input id="reagent-expiration" type="date" min={new Date().toISOString().slice(0, 10)} aria-invalid={Boolean(form.formState.errors.expirationOrRetestDate)} {...form.register('expirationOrRetestDate')} /></PreparationField>{mutation.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(mutation.error, 'The run could not be completed.')}</p> : null}</div><RequiredDialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>Complete run</Button></RequiredDialogFooter></form></DialogContent></Dialog>
}
function AbandonDialog({ run, onClose, onSaved }: ActionProps) {
  const form = useForm<z.infer<typeof abandonSchema>>({ resolver: zodResolver(abandonSchema), defaultValues: { reason: '' } })
  const mutation = useMutation({ mutationFn: (value: z.infer<typeof abandonSchema>) => abandonReagentRun(run, value.reason), onSuccess: onSaved })
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(value => mutation.mutate(value))}><DialogHeader><DialogTitle>Abandon reagent run?</DialogTitle><DialogDescription>The output lot remains unavailable. Source material uses already recorded stay deducted and traceable.</DialogDescription></DialogHeader><div><PreparationField id="reagent-abandon-reason" label="Reason" required error={form.formState.errors.reason?.message}><textarea id="reagent-abandon-reason" className={`${prepSelectClass} min-h-24 py-2`} maxLength={2000} {...form.register('reason')} /></PreparationField>{mutation.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(mutation.error, 'The run could not be abandoned.')}</p> : null}</div><RequiredDialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button type="submit" variant="destructive" disabled={mutation.isPending}>Abandon run</Button></RequiredDialogFooter></form></DialogContent></Dialog>
}
