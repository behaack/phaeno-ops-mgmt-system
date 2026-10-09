import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getAssemblyQc, recordAssemblyQc, type AssemblyQcWorkspace } from '#/api/lab-fastq'
import { getLabOperationsError } from '#/api/lab-operations'
import { usePhaenoSession } from '#/features/auth/session-context'
import { useOrderDecisionDismissal } from '#/features/orders/use-order-decision-dismissal'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { Textarea } from '#/components/ui/textarea'
import { PreparationField } from './preparation-ui'
import { ScientificFilePicker } from './ScientificFilePicker'
import { ScientificFileDownload } from './ScientificFileDownload'

const schema = z.object({ packageId: z.string().uuid('Choose a verified output package.'), decision: z.enum(['', 'Pass', 'Fail', 'Hold']), note: z.string().trim().min(1, 'Record the decision basis.').max(4000), reportFileId: z.string().uuid('Upload the QC report.'), reportReference: z.string(), coversInputs: z.boolean(),
  measurements: z.array(z.object({ name: z.string().trim().min(1).max(100), value: z.string().refine(v => v.trim() !== '' && Number.isFinite(Number(v)), 'Enter a finite measurement.'), unit: z.string().trim().min(1).max(100) })).max(128) })
  .superRefine((v, ctx) => { if (!v.decision) ctx.addIssue({ code: 'custom', path: ['decision'], message: 'Choose Pass, Fail or Hold.' }); if (v.decision === 'Pass' && !v.coversInputs) ctx.addIssue({ code: 'custom', path: ['coversInputs'], message: 'Confirm input QC coverage before Pass.' }) })
type Values = z.infer<typeof schema>
export function AssemblyQcPage({ jobId, capture = false }: { jobId: string; capture?: boolean }) {
  const { session, authProvider } = usePhaenoSession()
  const allowed = session?.capabilities.canManageLabOperations && authProvider !== 'mock'
  const query = useQuery({ queryKey: ['assembly-qc', jobId], queryFn: () => getAssemblyQc(jobId), enabled: Boolean(allowed) })
  if (!allowed) return <main className="page-wrap px-4 py-8">Laboratory access required.</main>
  if (query.error) return <main className="page-wrap px-4 py-8"><p role="alert">{getLabOperationsError(query.error, 'QC could not be loaded.')}</p><Button onClick={() => void query.refetch()}>Reload</Button></main>
  if (!query.data) return <main className="page-wrap px-4 py-8" role="status">Loading QC and exact output packages…</main>
  return <QcWorkspace data={query.data} capture={capture} />
}
function QcWorkspace({ data, capture }: { data: AssemblyQcWorkspace; capture: boolean }) {
  const navigate = useNavigate()
  const close = () => void navigate({ to: '/lab-operations/assembly-jobs/$jobId/qc', params: { jobId: data.jobId }, search: p => ({ ...p, section: 'assembly', assemblyTab: 'jobs' }) })
  return <main className="page-wrap space-y-5 px-4 py-8"><Link to="/lab-operations/assembly-jobs/$jobId" params={{ jobId: data.jobId }} className="text-sm text-primary underline">← Assembly attempt</Link>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Assembly QC</h1><p className="mt-1 text-sm text-muted-foreground">Review the exact assembly output and retain the decision, report and measurements.</p></div>{data.canRecord && data.packages.some(p => p.state === 'ReadyForReview') && !capture ? <Button onClick={() => void navigate({ to: '/lab-operations/assembly-jobs/$jobId/record-qc', params: { jobId: data.jobId }, search: p => ({ ...p, section: 'assembly', assemblyTab: 'jobs' }) })}>{data.reviews.length ? 'Record new QC decision' : 'Record QC'}</Button> : null}</header>
    <section className="space-y-3 rounded-lg border p-4"><h2 className="font-medium">Output packages</h2>{!data.packages.length ? <p className="text-sm">A verified output package must be registered and linked to this successful assembly before QC.</p> : data.packages.map(p => <div key={p.id} className="space-y-2 border-t pt-3"><p>Package v{p.packageVersion} · {p.state}</p><ul className="divide-y">{p.artifacts.map(a => <li key={a.id} className="min-w-0 py-2"><p className="break-all text-sm">{a.fileName} · {a.logicalRole}</p><p className="text-xs text-muted-foreground">{a.sizeBytes.toLocaleString()} bytes · {a.scanState}</p></li>)}</ul>{p.state === 'ReadyForRelease' || p.state === 'Released' ? <Link to="/lab-operations/result-packages/$packageId" params={{ packageId: p.id }} className="text-sm text-primary underline">Review Customer release · v{p.packageVersion}</Link> : null}</div>)}</section>
    {capture && data.canRecord ? <QcForm data={data} close={close} /> : <><section className="space-y-3 rounded-lg border p-4"><h2 className="font-medium">QC versions</h2>{!data.reviews.length ? <p className="text-sm text-muted-foreground">QC has not been recorded. Assembly completion does not approve the results.</p> : data.reviews.map(q => <article key={q.id} className="space-y-2 border-t pt-3"><p className="font-medium">QC v{q.reviewVersion} · {q.decision}</p><p className="text-xs text-muted-foreground">{q.author} · {new Date(q.recordedAtUtc).toLocaleString()}</p><p className="whitespace-pre-wrap text-sm">{q.note}</p><ScientificFileDownload work={data.labWorkOrderId} specimen={data.labSpecimenId} reference={`poms-file:${q.reportFileId}`} /></article>)}</section><p className="text-sm text-muted-foreground">Pass permits independent scientific approval. Fail or Hold blocks approval and Customer publication. Automatic scientific thresholds are not configured.</p><Link to="/lab-operations/$workOrderId" params={{ workOrderId: data.labWorkOrderId }} search={p => ({ ...p, section: 'results', tab: 'review' })} className="text-sm text-primary underline">Open Job for scientific review</Link></>}
  </main>
}
function QcForm({ data, close }: { data: AssemblyQcWorkspace; close: () => void }) {
  const reviewed = useRef(data).current
  const [uploading, setUploading] = useState(false)
  const id = useRef(crypto.randomUUID())
  const client = useQueryClient()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { packageId: '', decision: '', note: '', reportFileId: '', reportReference: '', coversInputs: false, measurements: [] }, mode: 'onBlur' })
  const metrics = useFieldArray({ control: form.control, name: 'measurements' })
  const save = useMutation({ mutationFn: (v: Values) => {
    const p = reviewed.packages.find(p => p.id === v.packageId)!
    return recordAssemblyQc(reviewed.jobId, { id: id.current, jobVersion: reviewed.version, packageId: p.id, packageVersion: p.version,
      previousReviewVersion: reviewed.reviews.find(q => q.resultOutputPackageId === p.id)?.reviewVersion ?? 0, decision: v.decision, note: v.note, reportFileId: v.reportFileId,
      measurements: v.measurements.map(m => ({ ...m, value: Number(m.value) })), coversSequencingInputs: v.coversInputs })
  }, onSuccess: async () => { dismissal.allowNavigation(); form.reset(form.getValues()); await client.invalidateQueries({ queryKey: ['assembly-qc', data.jobId] }); close() } })
  const dismissal = useOrderDecisionDismissal(form.formState.isDirty, uploading || save.isPending, close, { scope: 'QC decision', description: 'The unsaved QC decision and measurements will be discarded. Uploaded report evidence is retained.' })
  return <form noValidate className="space-y-4 rounded-lg border p-4" onSubmit={form.handleSubmit(v => save.mutate(v))}><h2 className="font-medium">Record QC</h2>
    <PreparationField id="qc-package" label="Exact output package" required error={form.formState.errors.packageId?.message}><NativeSelect id="qc-package" {...form.register('packageId')}><option value="">Choose package</option>{reviewed.packages.filter(p => p.state === 'ReadyForReview').map(p => <option key={p.id} value={p.id}>Package v{p.packageVersion} · {p.artifacts.length} files</option>)}</NativeSelect></PreparationField>
    <PreparationField id="qc-decision" label="QC decision" required error={form.formState.errors.decision?.message}><NativeSelect id="qc-decision" {...form.register('decision')}><option value="">Choose decision</option><option>Pass</option><option>Fail</option><option>Hold</option></NativeSelect></PreparationField>
    <PreparationField id="qc-note" label="Decision note" required error={form.formState.errors.note?.message}><Textarea id="qc-note" {...form.register('note')} /></PreparationField>
    <ScientificFilePicker work={reviewed.labWorkOrderId} specimen={reviewed.labSpecimenId} label="QC report" required reference={form.watch('reportReference')} error={form.formState.errors.reportFileId?.message} onBusyChange={setUploading} onUploaded={file => { form.setValue('reportFileId', file.id, { shouldDirty: true }); form.setValue('reportReference', file.externalFileReference, { shouldDirty: true }) }} />
    <PreparationField id="qc-input-coverage" label="Report scope" required={form.watch('decision') === 'Pass'} error={form.formState.errors.coversInputs?.message}><label className="flex cursor-pointer items-start gap-2 text-sm"><input id="qc-input-coverage" type="checkbox" {...form.register('coversInputs')} />This QC report covers the assembly output and all {reviewed.inputs.length} sequencing inputs listed for this attempt.</label></PreparationField>
    <details><summary className="cursor-pointer text-sm">Review input identities</summary><ul className="mt-2 space-y-2 text-xs">{reviewed.inputs.map(i => <li key={i.sequencingOutputId} className="break-all">{i.sequencingOutputId} · {i.sizeBytes.toLocaleString()} bytes · SHA-256 {i.sha256}</li>)}</ul></details>
    <fieldset className="space-y-3"><legend className="text-sm font-medium">Measurements (optional)</legend>{metrics.fields.map((m, i) => <div key={m.id} className="grid gap-3 border-t pt-3 sm:grid-cols-3">{(['name', 'value', 'unit'] as const).map(key => <PreparationField key={key} id={`qc-${i}-${key}`} required label={key === 'name' ? 'Measurement' : key === 'value' ? 'Value' : 'Unit'} error={form.formState.errors.measurements?.[i]?.[key]?.message}><Input id={`qc-${i}-${key}`} {...form.register(`measurements.${i}.${key}`)} /></PreparationField>)}<Button type="button" variant="outline" onClick={() => metrics.remove(i)}>Remove measurement {i + 1}</Button></div>)}<Button type="button" variant="outline" disabled={metrics.fields.length >= 128} onClick={() => metrics.append({ name: '', value: '', unit: '' })}>Add measurement</Button></fieldset>
    {save.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(save.error, 'QC could not be saved. Your entries are retained.')}</p> : null}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-xs text-muted-foreground">* Required</p><div className="flex gap-2"><Button type="button" variant="outline" disabled={uploading || save.isPending} onClick={dismissal.close}>Cancel</Button><Button type="submit" disabled={uploading || save.isPending}>Record QC</Button></div></footer>{dismissal.confirmation}
  </form>
}
