import { useRef, useState } from 'react'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronDown, Printer } from 'lucide-react'
import { z } from 'zod'
import {
  approveMasterMixDeviation, completeMasterMix, discardMasterMix, getMasterMix, masterMixesKey,
  recordMasterMixCorrection, recordMasterMixIngredient, recordMasterMixStep,
  type MasterMix,
} from '#/api/lab-master-mix'
import { getLabOperationsDashboard, getLabOperationsError } from '#/api/lab-operations'
import { IdentifierQrCode } from '#/components/identifier-qr-code'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { LabCommandStorageError, useLabCommandRecovery } from './lab-command-recovery'
import { isMasterMixDecimalQuantity } from './decimal-quantity'
import { PreparationField, prepSelectClass } from './preparation-ui'
import './preparation-label-print.css'

type Action = 'ingredient' | 'step' | 'complete' | 'deviation' | 'discard'
type IngredientInput = { sourceMaterialLotId: string; quantityText: string; quantityUnit: string; materialExhausted: boolean }
type PendingIngredient = { requestId: string; version: number; input: IngredientInput }
type CorrectionTarget = { kind: 'Ingredient' | 'TrayUse'; id: string }
type CorrectionInput = { requestId: string; targetEntryId: string; targetKind: 'Ingredient' | 'TrayUse'; action: 'VerifiedVoid' | 'Discrepancy'; reason: string; confirmedNoPhysicalUse: boolean }
const ingredientSchema = z.object({ sourceMaterialLotId: z.string().uuid('Choose a source lot.'), quantityText: z.string().refine(value => isMasterMixDecimalQuantity(value), 'Enter a positive exact decimal with up to 12 fractional places.'), materialExhausted: z.boolean() })
const textSchema = z.object({ reason: z.string().trim().min(1, 'Record a reason.').max(2000) })
const stepSchema = z.object({ notes: z.string().trim().min(1, 'Record what happened.').max(4000) })
const completeSchema = z.object({ preparedQuantityText: z.string().refine(value => isMasterMixDecimalQuantity(value), 'Enter a positive exact decimal with up to 12 fractional places.') })
const discardSchema = textSchema.extend({ measuredDiscardQuantity: z.string() }).superRefine((value, context) => {
  if (value.measuredDiscardQuantity && !isMasterMixDecimalQuantity(value.measuredDiscardQuantity, true)) context.addIssue({ code: 'custom', path: ['measuredDiscardQuantity'], message: 'Enter an exact nonnegative decimal with up to 12 fractional places, or leave it blank.' })
})

function when(value: string | null | undefined) { return value ? new Date(value).toLocaleString() : 'Not recorded' }
function labCutoff(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Los_Angeles', timeZoneName: 'short' }).format(new Date(value)) }
function actor(mix: MasterMix, id: string | null | undefined) { return id ? mix.actors.find(item => item.id === id)?.name ?? id : 'Not recorded' }
function closeDirty(dirty: boolean, close: () => void) { if (!dirty || window.confirm('Discard unsaved master-mix changes?')) close() }

export function MasterMixPage({ mixId }: { mixId: string }) {
  const { authProvider, session } = usePhaenoSession()
  const enabled = Boolean(session?.capabilities.canManageLabOperations) && authProvider !== 'mock'
  const canOperate = Boolean(session?.capabilities.canOperateLabWork)
  const canSupervise = Boolean(session?.capabilities.canSuperviseLabWork)
  const client = useQueryClient()
  const query = useQuery({ queryKey: [...masterMixesKey, mixId], queryFn: () => getMasterMix(mixId), enabled })
  const mix = query.data
  const recovery = useLabCommandRecovery<PendingIngredient>(`master-mix-ingredient:${mixId}`, session?.user?.id)
  const [uncertain, setUncertain] = useState<PendingIngredient | null>(null)
  const pending = uncertain ?? recovery.data
  const [action, setAction] = useState<Action | null>(null)
  const [correctionTarget, setCorrectionTarget] = useState<CorrectionTarget | null>(null)
  const [printOpen, setPrintOpen] = useState(false)
  const sourceLots = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled: enabled && action === 'ingredient' })
  const refresh = async () => { await Promise.allSettled([
    client.invalidateQueries({ queryKey: [...masterMixesKey, mixId] }),
    client.invalidateQueries({ queryKey: masterMixesKey }),
    client.invalidateQueries({ queryKey: ['lab-operations'] }),
    client.invalidateQueries({ queryKey: ['lab-preparation'] }),
  ]) }
  const saved = async (data: MasterMix) => { client.setQueryData([...masterMixesKey, mixId], data); setAction(null); setCorrectionTarget(null); await refresh() }
  const ingredientSave = useMutation({
    mutationFn: async (command: PendingIngredient) => {
      if (!mix) throw new Error('Refresh the master-mix record before recording a source lot.')
      await recovery.retain(command, command.requestId)
      return recordMasterMixIngredient({ ...mix, version: command.version }, command.input, command.requestId)
    },
    onSuccess: async (data, command) => { await recovery.clear(command.requestId); setUncertain(null); await saved(data) },
    onError: async (error, command) => {
      if (error instanceof LabCommandStorageError) { await recovery.refetch(); return }
      const definite = axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 408
      if (definite) { await recovery.clear(command.requestId); setUncertain(null) }
      else setUncertain(command)
      await refresh()
    },
  })
  const correctionSave = useMutation({
    mutationFn: (input: CorrectionInput) => recordMasterMixCorrection(mix!, input),
    onSuccess: saved,
    onError: refresh,
  })
  const nextStep = mix?.steps[mix.recordedSteps.length]
  const expired = Boolean(mix && new Date(mix.useByUtc).getTime() <= Date.now())
  const canComplete = Boolean(mix && mix.ingredients.some(item => !item.voidedAtUtc) && !nextStep && (mix.recipeMatches || mix.recipeDeviationApprovalCurrent))
  const actions: { key: Action | 'print'; label: string }[] = mix ? [
    { key: 'print', label: 'Print container label' },
    ...(canOperate && mix.status === 'Preparing' && !expired && !pending ? [
      { key: 'ingredient' as const, label: 'Record ingredient use' },
      ...(nextStep ? [{ key: 'step' as const, label: 'Record next step' }] : []),
      ...(canComplete ? [{ key: 'complete' as const, label: 'Complete mix' }] : []),
    ] : []),
    ...(canSupervise && mix.status === 'Preparing' && !mix.recipeMatches && mix.ingredients.length && !expired ? [{ key: 'deviation' as const, label: 'Approve recipe deviation' }] : []),
    ...(canOperate && mix.status !== 'Discarded' ? [{ key: 'discard' as const, label: mix.status === 'Ready' ? 'Discard remainder' : 'Discard preparation' }] : []),
  ] : []
  const selectAction = (key: Action | 'print') => { if (key === 'print') setPrintOpen(true); else setAction(key) }
  const correctedIds = new Set(mix?.corrections.map(item => item.targetEntryId) ?? [])

  if (!enabled) return <main className="page-wrap py-8"><p role="alert">You need a connected Phaeno laboratory session to view this mix.</p></main>
  return <main className="page-wrap space-y-5 py-8"><Link to="/lab-operations" search={{ section: 'master-mixes' }} className="text-sm text-primary hover:underline">← Master mixes</Link>
    {query.isPending ? <p role="status">Loading master mix…</p> : query.isError ? <p role="alert">{getLabOperationsError(query.error, 'The mix could not be loaded.')}</p> : mix ? <>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">{mix.workflowName}</h1><p className="mt-1 break-all font-mono text-sm">{mix.barcode}</p><p className="text-sm text-muted-foreground">Approved procedure revision {mix.workflowRevision} · Preparation {mix.id}</p></div><div className="flex items-center gap-2"><Badge variant="secondary">{mix.status}</Badge>{actions.length === 1 ? <Button type="button" onClick={() => selectAction(actions[0].key)}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button type="button">Actions <ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{actions.map(item => <DropdownMenuItem key={item.key} onSelect={() => selectAction(item.key)}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}</div></div>
      {expired && mix.status !== 'Discarded' ? <p role="alert" className="rounded-md border border-destructive p-3 text-sm">This mix passed the end of its local work day. POMS blocks new ingredients, completion, and tray use. Discard it and prepare a new mix.</p> : null}
      {pending ? <div role="alert" className="space-y-2 rounded-md border border-amber-500 p-3 text-sm"><p>A source-lot save still needs confirmation. Do not record the ingredient again with a new request.</p>{mix.ingredients.some(item => item.id === pending.requestId) ? <Button type="button" variant="outline" onClick={async () => { await recovery.clear(pending.requestId); setUncertain(null); await refresh() }}>Saved use confirmed — clear recovery</Button> : <Button type="button" variant="outline" disabled={ingredientSave.isPending || recovery.isPending} onClick={() => ingredientSave.mutate(pending)}>{ingredientSave.isPending ? 'Checking…' : 'Retry the exact saved use'}</Button>}{ingredientSave.error ? <p role="alert" className="text-destructive">{getLabOperationsError(ingredientSave.error, 'The saved ingredient use could not be confirmed.')}</p> : null}</div> : null}
      <Card><CardHeader><CardTitle>Preparation and amount</CardTitle><CardDescription>One physical container may serve several trays until {labCutoff(mix.useByUtc)}. It is not inventory stock.</CardDescription></CardHeader><CardContent className="grid gap-2 text-sm sm:grid-cols-3"><p>Started: {when(mix.startedAtUtc)} by {actor(mix, mix.startedByUserId)}</p><p>Made: {mix.preparedQuantityText === null ? 'Not recorded' : `${mix.preparedQuantityText} ${mix.quantityUnit}`}</p><p>Completed: {when(mix.preparedAtUtc)} by {actor(mix, mix.preparedByUserId)}</p><p>Used on trays: {mix.usedQuantityText} {mix.quantityUnit}</p><p>Calculated unused: {mix.remainingQuantityText ?? 'Not known yet'} {mix.remainingQuantityText ? mix.quantityUnit : ''}</p><p>Use by: {labCutoff(mix.useByUtc)}</p>{mix.discardedAtUtc ? <p className="sm:col-span-3">Discarded {when(mix.discardedAtUtc)} by {actor(mix, mix.discardedByUserId)} · {mix.discardReason}. {mix.measuredDiscardQuantityText === null ? 'Discarded amount was not measured.' : `Measured discarded amount: ${mix.measuredDiscardQuantityText} ${mix.quantityUnit}.`}</p> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle>Approved recipe</CardTitle><CardDescription>Frozen source materials and exact amounts for this procedure revision.</CardDescription></CardHeader><CardContent className="space-y-2 text-sm"><ul className="space-y-1">{mix.recipeIngredients.map(item => <li key={item.materialDefinitionId}>{item.name}: {item.quantityText ?? item.quantity} {item.quantityUnit}</li>)}</ul><p className={mix.recipeMatches ? '' : 'text-destructive'}>{mix.recipeMatches ? 'Recorded ingredient totals match the approved recipe.' : 'Recorded ingredient totals differ from the approved recipe. A different supervisor must approve the deviation before completion.'}</p>{mix.recipeDeviationApprovedByUserId ? <p>Deviation {mix.recipeDeviationApprovalCurrent ? 'approved' : 'approval needs renewal after an ingredient change'} by {actor(mix, mix.recipeDeviationApprovedByUserId)} at {when(mix.recipeDeviationApprovedAtUtc)} · {mix.recipeDeviationReason}</p> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle>Procedure steps</CardTitle><CardDescription>These instructions were frozen when the preparation started.</CardDescription></CardHeader><CardContent><ol className="space-y-2">{mix.steps.map((step, index) => { const recorded = mix.recordedSteps.find(item => item.sequence === index); return <li key={step.key} className="rounded-lg border p-3"><p className="font-medium">{index + 1}. {step.name}</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{step.instructions}</p>{recorded ? <p className="mt-1 text-sm">Recorded by {actor(mix, recorded.performedByUserId)} at {when(recorded.performedAtUtc)}: {recorded.notes}</p> : null}</li> })}</ol></CardContent></Card>
      <Card><CardHeader><CardTitle>Source ingredients</CardTitle><CardDescription>Each recorded use deducts its source lot once. A supervisor correction remains visible.</CardDescription></CardHeader><CardContent>{mix.ingredients.length ? <ul className="space-y-2">{mix.ingredients.map(item => <li key={item.id} className="rounded-lg border p-3 text-sm"><Link to="/lab-operations/materials/$materialLotId" params={{ materialLotId: item.sourceMaterialLotId }} className="font-medium text-primary hover:underline">{item.sourceName} · {item.sourceLotNumber}</Link><p>{item.quantityText} {item.quantityUnit}{item.materialExhausted ? ' · source exhausted' : ''} · recorded by {actor(mix, item.recordedByUserId)} at {when(item.recordedAtUtc)}</p>{item.voidedAtUtc ? <p>Verified void by {actor(mix, item.voidedByUserId)} at {when(item.voidedAtUtc)}</p> : null}{canSupervise && !correctedIds.has(item.id) ? <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setCorrectionTarget({ kind: 'Ingredient', id: item.id })}>Correct recorded use</Button> : null}</li>)}</ul> : <p>No ingredient uses recorded.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Library trays served</CardTitle><CardDescription>Each use links the saved tray step to this preparation.</CardDescription></CardHeader><CardContent>{mix.trayUses.length ? <ul className="space-y-2">{mix.trayUses.map(item => <li key={item.id} className="rounded-lg border p-3 text-sm"><Link to="/lab-operations/preparation/$preparationBatchId" params={{ preparationBatchId: item.labPreparationBatchId }} search={{ section: 'work' }} className="font-medium text-primary hover:underline">{item.trayName}</Link><p>{item.quantityText} {item.quantityUnit} · recorded by {actor(mix, item.recordedByUserId)} at {when(item.recordedAtUtc)}</p>{item.voidedAtUtc ? <p>Verified void by {actor(mix, item.voidedByUserId)} at {when(item.voidedAtUtc)}</p> : null}{canSupervise && !correctedIds.has(item.id) ? <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setCorrectionTarget({ kind: 'TrayUse', id: item.id })}>Correct recorded use</Button> : null}</li>)}</ul> : <p>No tray uses recorded.</p>}</CardContent></Card>
      {mix.corrections.length ? <Card><CardHeader><CardTitle>Correction history</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm">{mix.corrections.map(item => <li key={item.id} className="rounded-lg border p-3">{item.targetKind} · {item.action === 'VerifiedVoid' ? 'Verified void without physical dispensing' : 'Discrepancy retained'} · {item.reason} · {actor(mix, item.recordedByUserId)} at {when(item.recordedAtUtc)}</li>)}</ul></CardContent></Card> : null}
      {action === 'ingredient' && !pending ? <IngredientDialog lots={sourceLots.data?.materialLots ?? []} loading={sourceLots.isPending || recovery.isPending} onClose={() => setAction(null)} onSubmit={input => ingredientSave.mutate({ requestId: crypto.randomUUID(), version: mix.version, input })} pending={ingredientSave.isPending} error={ingredientSave.error} /> : null}
      {action === 'step' && nextStep ? <StepDialog mix={mix} stepName={nextStep.name} onClose={() => setAction(null)} onSaved={saved} onError={refresh} /> : null}
      {action === 'complete' ? <CompleteDialog mix={mix} onClose={() => setAction(null)} onSaved={saved} onError={refresh} /> : null}
      {action === 'deviation' ? <DeviationDialog mix={mix} onClose={() => setAction(null)} onSaved={saved} onError={refresh} /> : null}
      {action === 'discard' ? <DiscardDialog mix={mix} onClose={() => setAction(null)} onSaved={saved} onError={refresh} /> : null}
      {correctionTarget ? <CorrectionDialog mix={mix} target={correctionTarget} onClose={() => setCorrectionTarget(null)} onSubmit={input => correctionSave.mutate(input)} pending={correctionSave.isPending} error={correctionSave.error} /> : null}
      {printOpen ? <Dialog open onOpenChange={open => { if (!open) setPrintOpen(false) }}><DialogContent className="preparation-label-dialog"><DialogHeader><DialogTitle>Print master-mix container label</DialogTitle><DialogDescription>Attach this label to the physical mix container, then scan it on each tray use.</DialogDescription></DialogHeader><div className="preparation-label-surface space-y-2 rounded-md border bg-white p-4 text-black"><p className="text-sm font-semibold">Phaeno · Single-use master mix</p><p>{mix.workflowName} · revision {mix.workflowRevision}</p><IdentifierQrCode value={mix.barcode} label="Master-mix container barcode" /><p className="text-xs">Use by {labCutoff(mix.useByUtc)}</p></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPrintOpen(false)}>Close</Button><Button type="button" onClick={() => window.print()}><Printer aria-hidden="true" /> Print label</Button></div></DialogContent></Dialog> : null}
    </> : null}
  </main>
}

function IngredientDialog({ lots, loading, onClose, onSubmit, pending, error }: {
  lots: Awaited<ReturnType<typeof getLabOperationsDashboard>>['materialLots']; loading: boolean;
  onClose: () => void; onSubmit: (input: IngredientInput) => void; pending: boolean; error: unknown
}) {
  const form = useForm<z.infer<typeof ingredientSchema>>({ resolver: zodResolver(ingredientSchema), defaultValues: { sourceMaterialLotId: '', quantityText: '', materialExhausted: false } })
  const available = lots.filter(item => !item.quantityHoldReason && ['Passed', 'ApprovedException'].includes(item.qcDisposition) && item.availableQuantity > 0 && (!item.expirationOrRetestDate || item.expirationOrRetestDate >= new Date().toISOString().slice(0, 10)))
  const source = available.find(item => item.id === form.watch('sourceMaterialLotId'))
  const close = () => { if (!pending) closeDirty(form.formState.isDirty, onClose) }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(value => { if (source) onSubmit({ ...value, quantityUnit: source.quantityUnit }) })}>
    <DialogHeader><DialogTitle>Record ingredient use</DialogTitle><DialogDescription>Saving deducts the actual amount from its source lot. Compare the approved recipe before recording a source that differs.</DialogDescription></DialogHeader>
    <div className="space-y-3"><PreparationField id="mix-source" label="Source lot" required error={form.formState.errors.sourceMaterialLotId?.message}><select id="mix-source" className={prepSelectClass} {...form.register('sourceMaterialLotId')}><option value="">Choose eligible lot…</option>{available.map(item => <option key={item.id} value={item.id}>{item.name} · {item.lotNumber} · {item.availableQuantity} {item.quantityUnit}</option>)}</select></PreparationField><PreparationField id="mix-source-quantity" label={`Actual amount used${source ? ` (${source.quantityUnit})` : ''}`} required error={form.formState.errors.quantityText?.message}><Input id="mix-source-quantity" type="text" inputMode="decimal" {...form.register('quantityText')} /></PreparationField><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" {...form.register('materialExhausted')} /> Source lot exhausted (optional override)</label>{loading ? <p role="status">Loading source lots and recovery state…</p> : null}{error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(error, 'The ingredient use could not be saved. Review the mix before retrying.')}</p> : null}</div>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={pending} onClick={close}>Cancel</Button><Button type="submit" disabled={pending || loading || !source}>{pending ? 'Saving…' : 'Record use'}</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}

type SimpleDialogProps = { mix: MasterMix; onClose: () => void; onSaved: (data: MasterMix) => Promise<void>; onError: () => Promise<void> }
function StepDialog({ mix, stepName, onClose, onSaved, onError }: SimpleDialogProps & { stepName: string }) {
  const form = useForm<z.infer<typeof stepSchema>>({ resolver: zodResolver(stepSchema), defaultValues: { notes: '' } })
  const requestId = useRef(crypto.randomUUID())
  const mutation = useMutation({ mutationFn: (value: z.infer<typeof stepSchema>) => recordMasterMixStep(mix, mix.recordedSteps.length, value.notes, requestId.current), onSuccess: onSaved, onError })
  const close = () => { if (!mutation.isPending) closeDirty(form.formState.isDirty, onClose) }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(value => mutation.mutate(value))}><DialogHeader><DialogTitle>Record {stepName}</DialogTitle><DialogDescription>Record what was done for this one mix preparation.</DialogDescription></DialogHeader><PreparationField id="mix-step-notes" label="Step notes" required error={form.formState.errors.notes?.message}><textarea id="mix-step-notes" className={`${prepSelectClass} min-h-24 py-2`} maxLength={4000} {...form.register('notes')} /></PreparationField>{mutation.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(mutation.error, 'The step could not be saved.')}</p> : null}<RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Record step'}</Button></RequiredDialogFooter></form></DialogContent></Dialog>
}

function CompleteDialog({ mix, onClose, onSaved, onError }: SimpleDialogProps) {
  const form = useForm<z.infer<typeof completeSchema>>({ resolver: zodResolver(completeSchema), defaultValues: { preparedQuantityText: '' } })
  const mutation = useMutation({ mutationFn: (value: z.infer<typeof completeSchema>) => completeMasterMix(mix, value.preparedQuantityText), onSuccess: onSaved, onError })
  const close = () => { if (!mutation.isPending) closeDirty(form.formState.isDirty, onClose) }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(value => mutation.mutate(value))}><DialogHeader><DialogTitle>Complete master mix</DialogTitle><DialogDescription>Confirm that the recipe matches or has a current supervisor-approved deviation, then record the amount actually made.</DialogDescription></DialogHeader><PreparationField id="mix-prepared" label={`Amount made (${mix.quantityUnit})`} required error={form.formState.errors.preparedQuantityText?.message}><Input id="mix-prepared" type="text" inputMode="decimal" {...form.register('preparedQuantityText')} /></PreparationField>{mutation.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(mutation.error, 'The mix could not be completed.')}</p> : null}<RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Complete mix'}</Button></RequiredDialogFooter></form></DialogContent></Dialog>
}

function DeviationDialog({ mix, onClose, onSaved, onError }: SimpleDialogProps) {
  const form = useForm<z.infer<typeof textSchema>>({ resolver: zodResolver(textSchema), defaultValues: { reason: '' } })
  const mutation = useMutation({ mutationFn: (value: z.infer<typeof textSchema>) => approveMasterMixDeviation(mix, value.reason), onSuccess: onSaved, onError })
  const close = () => { if (!mutation.isPending) closeDirty(form.formState.isDirty, onClose) }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(value => mutation.mutate(value))}><DialogHeader><DialogTitle>Approve recipe deviation?</DialogTitle><DialogDescription>Review the frozen recipe and actual source uses on this page. A different supervisor must approve why they differ. Another ingredient use cancels this approval.</DialogDescription></DialogHeader><PreparationField id="mix-deviation-reason" label="Deviation reason" required error={form.formState.errors.reason?.message}><textarea id="mix-deviation-reason" className={`${prepSelectClass} min-h-24 py-2`} maxLength={2000} {...form.register('reason')} /></PreparationField>{mutation.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(mutation.error, 'The deviation could not be approved.')}</p> : null}<RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Approve deviation'}</Button></RequiredDialogFooter></form></DialogContent></Dialog>
}

function DiscardDialog({ mix, onClose, onSaved, onError }: SimpleDialogProps) {
  const form = useForm<z.infer<typeof discardSchema>>({ resolver: zodResolver(discardSchema), defaultValues: { reason: '', measuredDiscardQuantity: '' } })
  const mutation = useMutation({ mutationFn: (value: z.infer<typeof discardSchema>) => discardMasterMix(mix, value.reason, value.measuredDiscardQuantity || null), onSuccess: onSaved, onError })
  const close = () => { if (!mutation.isPending) closeDirty(form.formState.isDirty, onClose) }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(value => mutation.mutate(value))}><DialogHeader><DialogTitle>Discard master mix?</DialogTitle><DialogDescription>The mix can no longer serve a tray. Ingredient consumption and tray uses remain in history. Calculated unused amount: {mix.remainingQuantityText ?? 'not known'} {mix.quantityUnit}.</DialogDescription></DialogHeader><div className="space-y-3"><PreparationField id="mix-discard-reason" label="Reason" required error={form.formState.errors.reason?.message}><textarea id="mix-discard-reason" className={`${prepSelectClass} min-h-24 py-2`} maxLength={2000} {...form.register('reason')} /></PreparationField><PreparationField id="mix-discard-measured" label={`Measured discarded amount (${mix.quantityUnit}, optional)`} error={form.formState.errors.measuredDiscardQuantity?.message}><Input id="mix-discard-measured" type="number" min="0" step="any" {...form.register('measuredDiscardQuantity')} /></PreparationField><p className="text-xs text-muted-foreground">Leave the measured amount blank when the remainder was not physically measured.</p>{mutation.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(mutation.error, 'The mix could not be discarded.')}</p> : null}</div><RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" variant="destructive" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Discard mix'}</Button></RequiredDialogFooter></form></DialogContent></Dialog>
}

function CorrectionDialog({ mix, target, onClose, onSubmit, pending, error }: {
  mix: MasterMix; target: CorrectionTarget; onClose: () => void; onSubmit: (input: CorrectionInput) => void; pending: boolean; error: unknown
}) {
  const form = useForm<{ action: 'VerifiedVoid' | 'Discrepancy'; reason: string; confirmedNoPhysicalUse: boolean }>({ defaultValues: { action: 'Discrepancy', reason: '', confirmedNoPhysicalUse: false } })
  const requestId = useRef(crypto.randomUUID())
  const action = form.watch('action')
  const close = () => { if (!pending) closeDirty(form.formState.isDirty, onClose) }
  const submit = form.handleSubmit(value => {
    if (!value.reason.trim()) { form.setError('reason', { message: 'Record the correction reason.' }); return }
    if (action === 'VerifiedVoid' && !value.confirmedNoPhysicalUse) { form.setError('confirmedNoPhysicalUse', { message: 'Confirm that nothing was physically dispensed.' }); return }
    onSubmit({ requestId: requestId.current, targetEntryId: target.id, targetKind: target.kind, action: value.action, reason: value.reason.trim(), confirmedNoPhysicalUse: value.confirmedNoPhysicalUse })
  })
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><form className="contents" noValidate onSubmit={submit}><DialogHeader><DialogTitle>Correct recorded {target.kind === 'Ingredient' ? 'ingredient' : 'tray use'}</DialogTitle><DialogDescription>Keep the original audit record. A verified void changes the recorded balance only when a supervisor confirms that the material was never dispensed. A discrepancy preserves the use, discards the mix, and requires a physical count for an ingredient source lot.</DialogDescription></DialogHeader><div className="space-y-3"><fieldset className="space-y-2"><legend className="text-sm font-medium">Correction action *</legend><label className="flex cursor-pointer gap-2 text-sm"><input type="radio" value="VerifiedVoid" {...form.register('action')} />Verified void — no material was physically dispensed</label><label className="flex cursor-pointer gap-2 text-sm"><input type="radio" value="Discrepancy" {...form.register('action')} />Discrepancy — material was dispensed or the facts are uncertain</label></fieldset>{action === 'VerifiedVoid' ? <label className="flex cursor-pointer gap-2 text-sm"><input type="checkbox" {...form.register('confirmedNoPhysicalUse')} />I verified that no material was physically dispensed for this entry.</label> : null}{form.formState.errors.confirmedNoPhysicalUse ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.confirmedNoPhysicalUse.message}</p> : null}<PreparationField id="mix-correction-reason" label="Reason and evidence" required error={form.formState.errors.reason?.message}><textarea id="mix-correction-reason" className={`${prepSelectClass} min-h-24 py-2`} maxLength={2000} {...form.register('reason')} /></PreparationField>{target.kind === 'Ingredient' && action === 'VerifiedVoid' && mix.ingredients.find(item => item.id === target.id)?.materialExhausted ? <p className="text-sm">This source had an exhaustion override. POMS will hold it for a physical recount before stock can be restored.</p> : null}{error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(error, 'The correction could not be recorded. Review the entry before retrying.')}</p> : null}</div><RequiredDialogFooter><Button type="button" variant="outline" disabled={pending} onClick={close}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Record correction'}</Button></RequiredDialogFooter></form></DialogContent></Dialog>
}
