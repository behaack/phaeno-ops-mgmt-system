import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { getLabBatchDetail, getLabOperationsError, recordVendorResults, type LabBatchDetail } from '#/api/lab-operations'
import { getFastqIntake, saveResultsDraft, restartResultsDraft, type FastqIntake, type ResultsDraft } from '#/api/lab-fastq'
import { usePhaenoSession } from '#/features/auth/session-context'
import { useOrderDecisionDismissal } from '#/features/orders/use-order-decision-dismissal'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { Textarea } from '#/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '#/components/ui/dialog'
import { PreparationField } from './preparation-ui'
import { FastqBatchZipUpload } from './FastqBatchZipUpload'
import { PillToggle } from '#/components/ui/pill-toggle'
import { FastqLibraryUpload } from './FastqLibraryUpload'
import { canRecordVendorResults } from './vendor-workflow'

const localTime = (v?: string | null) => v ? new Date(new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60_000).toISOString().slice(0, 19) : ''
const toUtc = (value: string, stored?: string | null) => stored && value === localTime(stored) ? stored : new Date(value).toISOString()
const valuesSchema = z.object({ jobReference: z.string().trim().min(1, 'Enter the vendor job reference.').max(255), start: z.string(), end: z.string(), receipt: z.string(),
  notPerformed: z.boolean(), uploadMethod: z.enum(['Zip', 'Files']), zipArchiveId: z.string(), zipConfirmed: z.boolean(), zipRows: z.array(z.object({ index: z.number(), memberId: z.string(), read: z.string(), group: z.string(), part: z.string(), description: z.string(), excluded: z.boolean(), exclusionReason: z.string(), uploadId: z.string() })), outcome: z.enum(['', 'Success', 'Failure']), notes: z.string().trim().max(4000), confirmedFiles: z.boolean(),
  files: z.array(z.object({ memberId: z.string(), setId: z.string(), layout: z.string(), run: z.string(), preparation: z.string(), group: z.string(), part: z.string(), read: z.string(), description: z.string() })),
  exceptions: z.array(z.object({ memberId: z.string(), reason: z.string().trim().min(1, 'Record the library exception reason.').max(4000) })) })
export type VendorResultsValues = z.infer<typeof valuesSchema>
type Values = VendorResultsValues

export function VendorResultsWorkspacePage({ batchId }: { batchId: string }) {
  const [recoveryGeneration, setRecoveryGeneration] = useState(0)
  const { session, authProvider } = usePhaenoSession()
  const permitted = Boolean(session?.capabilities.canOperateLabWork && authProvider !== 'mock')
  const query = useQuery({ queryKey: ['lab-batch', batchId], queryFn: () => getLabBatchDetail(batchId), enabled: permitted })
  const intake = useQuery({ queryKey: ['vendor-fastq-intake', query.data?.sendout?.id], queryFn: () => getFastqIntake(query.data!.sendout!.id), enabled: permitted && Boolean(query.data?.sendout) })
  const navigate = useNavigate()
  if (!permitted) return <main className="page-wrap px-4 py-8"><h1>Laboratory operator access required</h1></main>
  if (query.error || intake.error) return <main className="page-wrap space-y-3 px-4 py-8"><h1>Results workspace unavailable</h1><p role="alert">{getLabOperationsError(query.error ?? intake.error, 'Reload the current batch before recording results.')}</p><Button onClick={() => { void query.refetch(); void intake.refetch() }}>Reload</Button></main>
  if (!query.data || intake.isPending) return <main className="page-wrap px-4 py-8" role="status">Loading results and upload workspace…</main>
  if (!canRecordVendorResults(query.data.batch) || !query.data.sendout || !intake.data) return <main className="page-wrap px-4 py-8"><h1>Results are not ready to record</h1><Link to="/lab-operations/batches/$batchId" params={{ batchId }}>Return to batch</Link></main>
  return <VendorResultsForm key={recoveryGeneration} focusOnRecovery={recoveryGeneration > 0} workspace={query.data} intake={intake.data} refreshFiles={() => intake.refetch()} onRestarted={async () => { await Promise.all([query.refetch(), intake.refetch()]); setRecoveryGeneration(v => v + 1) }} close={() => void navigate({ to: '/lab-operations/batches/$batchId', params: { batchId }, search: p => ({ ...p, section: 'batches' }) })} />
}

function VendorResultsForm({ workspace, intake, refreshFiles, onRestarted, close, focusOnRecovery }: { workspace: LabBatchDetail; intake: FastqIntake; refreshFiles: () => Promise<unknown>; onRestarted: () => Promise<void>; close: () => void; focusOnRecovery: boolean }) {
  const reviewed = useRef(workspace).current
  const { batch, sendout, tubes } = reviewed
  const recorded = batch.resultsVersion != null
  const draft = useRef<ResultsDraft | null>(intake.draft)
  const newId = useRef(crypto.randomUUID())
  const busyUploads = useRef(0)
  const [uploadCount, setUploadCount] = useState(0)
  const pendingUploads = uploadCount > 0
  const [restartOpen, setRestartOpen] = useState(false)
  const restartTrigger = useRef<HTMLButtonElement>(null)
  const restartCancel = useRef<HTMLButtonElement>(null)
  const restartCommand = useRef<Parameters<typeof restartResultsDraft>[1] | null>(null)
  const needsRestart = Boolean(intake.draft?.stale || intake.draft?.expired || intake.draft && new Date(intake.draft.expiresAtUtc).getTime() <= Date.now()
    || intake.sendoutVersion !== batch.sendoutVersion)
  const schema = valuesSchema.superRefine((v, ctx) => {
    const issue = (key: keyof Values, message: string) => ctx.addIssue({ code: 'custom', path: [key], message })
    if (recorded && !v.notes || (v.notPerformed || v.outcome === 'Failure') && !v.notes) issue('notes', recorded ? 'Explain the change to the recorded result.' : 'Record the failure or no-run reason.')
    if (!v.outcome) issue('outcome', 'Choose the batch outcome.')
    if (!v.notPerformed) {
      for (const key of ['start', 'end', 'receipt'] as const) if (!v[key] || !Number.isFinite(new Date(v[key]).getTime())) issue(key, 'Enter the actual date and time.')
      if (v.start && v.end && new Date(v.end) < new Date(v.start)) issue('end', 'Completion cannot precede start.')
      if (v.end && v.receipt && new Date(v.receipt) < new Date(v.end)) issue('receipt', 'Receipt cannot precede run completion.')
    }
    if (v.outcome === 'Success' && !v.notPerformed) {
      const successful = tubes.members.filter(m => !v.exceptions.some(e => e.memberId === m.id))
      if (successful.some(m => !v.files.find(f => f.memberId === m.id)?.setId)) issue('files', 'Select a complete verified file set for every successful library.')
      for (const member of successful) {
        const set = intake.sets.find(s => s.id === v.files.find(f => f.memberId === member.id)?.setId)
        if (!set || set.files.length === 0 || set.files.some(f => !f.fileId)) { issue('files', 'Finish uploading and verifying every selected file set.'); break }
      }
      if (successful.length && !v.confirmedFiles) issue('confirmedFiles', 'Confirm the vendor files and library/run mapping are complete.')
    }
  })
  const initial: Values = { jobReference: sendout?.providerReference ?? '', start: localTime(sendout?.sequencingStartedAtUtc), end: localTime(sendout?.sequencingCompletedAtUtc),
    receipt: localTime(sendout?.resultsReceivedAtUtc), uploadMethod: 'Zip', zipArchiveId: '', zipConfirmed: false, zipRows: [], notPerformed: sendout?.runNotPerformed === true, outcome: sendout?.outcome ?? '', notes: '', confirmedFiles: false,
    files: tubes.members.map(m => ({ memberId: m.id, setId: intake.sets.find(s => s.memberId === m.id && s.sealedSet)?.id ?? '', layout: '', run: '', preparation: '', group: '1', part: '1', read: '', description: '' })),
    exceptions: reviewed.libraryExceptions.map(e => ({ memberId: e.memberId, reason: e.reason })) }
  const draftShape = valuesSchema.extend({ jobReference: z.string(), exceptions: z.array(z.object({ memberId: z.string(), reason: z.string() })) })
  const parsedDraft = draftShape.safeParse(intake.draft?.payload)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: parsedDraft.success ? parsedDraft.data : initial, mode: 'onBlur' })
  useEffect(() => { if (focusOnRecovery) form.setFocus('jobReference') }, [focusOnRecovery, form])
  const exceptions = useFieldArray({ control: form.control, name: 'exceptions' })
  const selectedFiles = form.watch('files')
  const noRun = form.watch('notPerformed')
  const outcome = form.watch('outcome')
  const client = useQueryClient()
  async function persistDraft() {
    if (needsRestart) throw new Error('Restart this draft after reviewing the latest submission. Completed files and your entries are preserved.')
    if (!sendout || batch.sendoutVersion == null) throw new Error('Reload this submission before recording results.')
    const saved = await saveResultsDraft(sendout.id, { id: draft.current?.id ?? newId.current, sendoutVersion: batch.sendoutVersion, version: draft.current?.version, payload: form.getValues() })
    draft.current = saved; return saved
  }
  async function getDraft() { if (needsRestart) throw new Error('Restart this outdated draft before uploading files.'); return (draft.current ?? await persistDraft()).id }
  const draftSave = useMutation({ mutationFn: persistDraft, onSuccess: () => { form.reset(form.getValues()); void refreshFiles() } })
  const finalRequest = useRef<{ fingerprint: string; body: Parameters<typeof recordVendorResults>[1] } | null>(null)
  const save = useMutation({ mutationFn: async (v: Values) => {
    const fingerprint = JSON.stringify(v)
    if (finalRequest.current) {
      if (finalRequest.current.fingerprint !== fingerprint) throw new Error('The previous save has an uncertain outcome. Reload the batch before changing that request.')
      return recordVendorResults(sendout!.id, finalRequest.current.body)
    }
    if (pendingUploads) throw new Error('Wait for file verification to finish.')
    const savedDraft = await persistDraft()
    const sets = v.outcome === 'Success' && !v.notPerformed ? v.files.filter(f => !v.exceptions.some(e => e.memberId === f.memberId)).map(f => f.setId) : []
    const body: Parameters<typeof recordVendorResults>[1] = { requestId: savedDraft.id, version: batch.sendoutVersion!, vendorJobReference: v.jobReference, runNotPerformed: v.notPerformed,
      runStartedAtUtc: v.notPerformed ? null : toUtc(v.start, sendout?.sequencingStartedAtUtc), runCompletedAtUtc: v.notPerformed ? null : toUtc(v.end, sendout?.sequencingCompletedAtUtc), resultsReceivedAtUtc: v.notPerformed ? null : toUtc(v.receipt, sendout?.resultsReceivedAtUtc),
      outcome: v.notPerformed ? 'Failure' : v.outcome as 'Success' | 'Failure', exceptions: v.notPerformed || v.outcome === 'Failure' ? [] : v.exceptions.map(e => ({ ...e, outcome: 'Failure' })),
      fastqSetIds: sets, notes: v.notes || null, draftId: savedDraft.id, draftVersion: savedDraft.version, filesConfirmed: v.confirmedFiles }
    finalRequest.current = { fingerprint, body }
    return recordVendorResults(sendout!.id, body)
  }, onError: error => { if (isAxiosError(error) && error.response && error.response.status < 500) finalRequest.current = null }, onSuccess: async () => { dismissal.allowNavigation(); form.reset(form.getValues()); await Promise.all([client.invalidateQueries({ queryKey: ['lab-batch', batch.id] }), client.invalidateQueries({ queryKey: ['lab-batches'] }), client.invalidateQueries({ queryKey: ['vendor-results-versions', batch.id] }), client.invalidateQueries({ queryKey: ['assembly-inputs'] }), client.invalidateQueries({ queryKey: ['lab-operations'] })]); close() } })
  const restart = useMutation({ mutationFn: () => {
    if (!intake.draft || !sendout) throw new Error('Reload the current draft before restarting.')
    restartCommand.current ??= { id: crypto.randomUUID(), sourceDraftId: intake.draft.id, sourceVersion: intake.draft.version, sendoutVersion: intake.sendoutVersion, payload: form.getValues() }
    return restartResultsDraft(sendout.id, restartCommand.current)
  }, onSuccess: onRestarted })
  const busy = pendingUploads || save.isPending || draftSave.isPending || restart.isPending
  const dismissal = useOrderDecisionDismissal(form.formState.isDirty, busy, close, { scope: 'results changes', description: 'Unsaved form changes will be discarded. Saved drafts and verified uploaded files are retained.' })
  const clock = (key: 'start' | 'end' | 'receipt', label: string) => <PreparationField id={`results-${key}`} label={label} required error={form.formState.errors[key]?.message}><Input id={`results-${key}`} type="datetime-local" step="1" disabled={busy} {...form.register(key)} /></PreparationField>
  return <main className="page-wrap space-y-5 px-4 py-8">
    <button className="cursor-pointer text-sm text-primary underline focus-visible:outline-ring" onClick={dismissal.close}>← Back to batch</button>
    <header><h1 className="text-2xl font-semibold">{recorded ? 'Edit results' : 'Record results'}</h1><p className="mt-1 text-sm">{batch.batchNumber} · {tubes.members.length} libraries{recorded ? ` · Results v${batch.resultsVersion} → v${batch.resultsVersion! + 1}` : ''}</p><p className="mt-2 text-sm text-muted-foreground">Save the vendor report and verified FASTQ files together. Scientific approval and Customer release follow assembly and QC.</p></header>
    {needsRestart ? <section className="space-y-3 rounded-lg border p-4" aria-label="Draft recovery"><p role="alert" className="text-sm">This draft is outdated or expired. Restart against the current submission to preserve your entries and retain complete verified file sets for review. Incomplete sets require a new upload.</p><Button ref={restartTrigger} type="button" variant="outline" disabled={busy || !intake.draft} onClick={() => setRestartOpen(true)}>Restart draft</Button>{!intake.draft ? <Button type="button" variant="outline" disabled={busy} onClick={() => void onRestarted()}>Reload submission</Button> : null}</section> : null}
    {intake.draft?.payload.recoveredFromDraftId ? <p role="status" className="text-sm">Draft restarted. Review the retained run details, outcomes and file mappings against the current saved result before saving.</p> : null}
    {intake.protectedPackages.length ? <section className="space-y-2 rounded-lg border p-4" aria-label="Approved results affected by corrections"><p className="text-sm">Changes to run details, library outcomes or files may affect approved results. The result release manager must withdraw affected packages before those changes can save. Notes-only edits retain unchanged inputs.</p><ul className="space-y-1 text-sm">{intake.protectedPackages.map(p => <li key={p.id}>{p.trialProjectId ? <span>Trial package v{p.packageVersion} · {p.state} · Manage withdrawal in the owning Trial Project.</span> : <Link to="/lab-operations/result-packages/$packageId" params={{ packageId: p.id }} className="text-primary underline">Package v{p.packageVersion} · {p.state}</Link>}</li>)}</ul></section> : null}
    <form noValidate className="space-y-5" onSubmit={form.handleSubmit(v => save.mutate(v))}>
      <section className="space-y-3 rounded-lg border p-4"><h2 className="font-medium">Vendor run</h2><PreparationField id="results-reference" label="Vendor job reference" required error={form.formState.errors.jobReference?.message}><Input id="results-reference" disabled={busy} {...form.register('jobReference')} /></PreparationField>
        <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-1" disabled={busy} {...form.register('notPerformed', { onChange: e => { if (e.target.checked) { form.setValue('outcome', 'Failure', { shouldDirty: true }); exceptions.replace([]) } } })} />Run not performed</label>
        {noRun ? <PreparationField id="results-notes" label="Reason run not performed" required error={form.formState.errors.notes?.message}><Textarea id="results-notes" disabled={busy} {...form.register('notes')} /></PreparationField> : <><div className="grid gap-3 sm:grid-cols-2">{clock('start', 'Run started')}{clock('end', 'Run completed')}</div>{clock('receipt', 'Results received')}</>}
      </section>
      {!noRun ? <><section className="space-y-3 rounded-lg border p-4"><h2 className="font-medium">Library results</h2><PreparationField id="results-outcome" label="Batch outcome" required error={form.formState.errors.outcome?.message}><NativeSelect id="results-outcome" disabled={busy} {...form.register('outcome', { onChange: () => exceptions.replace([]) })}><option value="">Choose outcome</option><option value="Success">Success</option><option value="Failure">Fail</option></NativeSelect></PreparationField>
        {outcome === 'Failure' ? <p className="text-sm text-muted-foreground">All libraries are marked Fail. FASTQ uploads are not required.</p> : outcome === 'Success' ? <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Library exceptions · Fail</legend>{tubes.members.map(member => { const index = exceptions.fields.findIndex(e => e.memberId === member.id); return <div key={member.id} className="space-y-2 border-b pb-2"><label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" disabled={busy} checked={index >= 0} onChange={e => e.target.checked ? exceptions.append({ memberId: member.id, reason: '' }) : exceptions.remove(index)} /><span className="break-words">{member.libraryKey} · {index >= 0 ? 'Fail' : 'Success'}</span></label>{index >= 0 ? <PreparationField id={`exception-${member.id}`} label="Exception reason" required error={form.formState.errors.exceptions?.[index]?.reason?.message}><Input id={`exception-${member.id}`} disabled={busy} {...form.register(`exceptions.${index}.reason`)} /></PreparationField> : null}</div> })}</fieldset> : null}
      </section>
      {outcome === 'Success' ? <section className="space-y-4 rounded-lg border p-4"><h2 className="font-medium">FASTQ uploads</h2><p className="text-xs text-muted-foreground">Configuration values are tentative. Effective file limit: {(intake.effectiveMaximumFileBytes / 1024 / 1024).toLocaleString()} MiB; file-set limit: {(intake.policy.maximumFileSetBytes / 1024 ** 3).toLocaleString()} GiB. Layout selection and complete file verification are required.</p>
        <PillToggle label="Upload method" value={form.watch('uploadMethod')} options={[{ value: 'Zip', label: 'Batch ZIP', disabled: busy }, { value: 'Files', label: 'Individual files', disabled: busy }]} onValueChange={value => form.setValue('uploadMethod', value as 'Zip' | 'Files', { shouldDirty: true })} />
        {form.watch('uploadMethod') === 'Zip' ? <FastqBatchZipUpload form={form} intake={intake} sendoutId={sendout!.id} tubes={tubes.members} getDraft={getDraft} saveDraft={persistDraft} refresh={refreshFiles} disabled={busy} onBusy={value => { busyUploads.current += value ? 1 : -1; setUploadCount(busyUploads.current) }} /> : <>
        {tubes.members.map((member, i) => exceptions.fields.some(e => e.memberId === member.id) ? <p key={member.id} className="text-sm text-muted-foreground">{member.libraryKey} · Fail · No FASTQ files required.</p> : <details key={member.id} className="rounded-md border p-3" open={i === 0}><summary className="cursor-pointer text-sm font-medium">{member.libraryKey} · {selectedFiles[i]?.setId ? 'File set selected' : 'Uploads required'}</summary><div className="mt-3 space-y-3"><PreparationField id={`set-${member.id}`} label={`File set for ${member.libraryKey}`} required><NativeSelect id={`set-${member.id}`} disabled={busy} value={selectedFiles[i]?.setId ?? ''} onChange={e => form.setValue(`files.${i}.setId`, e.target.value, { shouldDirty: true })}><option value="">Upload or select a file set</option>{intake.sets.filter(s => s.memberId === member.id).map(s => <option key={s.id} value={s.id}>File set v{s.setVersion} · Run {s.sequencingRunNumber} · {s.readLayout} · {s.sealedSet ? 'Retained' : 'Draft'}</option>)}</NativeSelect></PreparationField>
          <FastqLibraryUpload form={form} index={i} disabled={busy} intake={intake} memberId={member.id} sendoutId={sendout!.id} selected={intake.sets.find(s => s.id === selectedFiles[i]?.setId)} getDraft={getDraft} onSelected={id => form.setValue(`files.${i}.setId`, id, { shouldDirty: true })} refresh={refreshFiles} onBusy={value => { busyUploads.current += value ? 1 : -1; setUploadCount(busyUploads.current) }} />
        </div></details>)}
        </>}
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.files?.message}</p><PreparationField id="results-confirm-files" label="Upload completeness" required error={form.formState.errors.confirmedFiles?.message}><label className="flex cursor-pointer items-start gap-2 text-sm"><input id="results-confirm-files" type="checkbox" disabled={busy} {...form.register('confirmedFiles')} />I confirm all required vendor files are present and mapped to the correct library and purchased run.</label></PreparationField>
      </section> : null}
      {sendout?.outcomeNote ? <p className="text-sm text-muted-foreground">Previous note: {sendout.outcomeNote}</p> : null}<PreparationField id="results-notes" label="Results notes" required={recorded || outcome === 'Failure'} error={form.formState.errors.notes?.message}><Textarea id="results-notes" disabled={busy} {...form.register('notes')} /></PreparationField></> : null}
      {save.error || draftSave.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(save.error ?? draftSave.error, 'Saving failed. Your draft and files remain available for review.')}</p> : null}
      {draftSave.isSuccess ? <p role="status" className="text-sm">Draft saved. It does not record receipt or create a results version.</p> : null}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-xs text-muted-foreground">* Required</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={dismissal.close}>Cancel</Button><Button type="button" variant="outline" disabled={busy || needsRestart} onClick={() => draftSave.mutate()}>Save draft</Button><Button type="submit" disabled={busy || needsRestart}>{save.isPending ? 'Saving…' : recorded ? 'Save changes' : 'Record results'}</Button></div></footer>
    </form>{dismissal.confirmation}
    <Dialog open={restartOpen} onOpenChange={value => { if (!restart.isPending) setRestartOpen(value) }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); restartCancel.current?.focus() }} onCloseAutoFocus={event => { event.preventDefault(); restartTrigger.current?.focus() }}><DialogHeader><DialogTitle>Restart results draft</DialogTitle><DialogDescription>{batch.batchNumber} · Review the current submission before saving.</DialogDescription></DialogHeader><div><p className="text-sm">Your current entries and complete verified file sets will be copied into a new draft for the current submission. Confirm their library, run and outcome mappings again. Incomplete uploads remain preserved but cannot be resumed through the new draft. No saved result or internal evidence is changed.</p>{restart.error ? <p role="alert" className="mt-3 text-sm text-destructive">{getLabOperationsError(restart.error, 'Restart failed. Your entries and files are preserved.')}</p> : null}</div><DialogFooter><Button ref={restartCancel} variant="outline" disabled={restart.isPending} onClick={() => setRestartOpen(false)}>Keep reviewing</Button><Button disabled={restart.isPending} onClick={() => restart.mutate()}>{restart.isPending ? 'Restarting…' : 'Restart draft'}</Button></DialogFooter></DialogContent></Dialog>
  </main>
}
