import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { useCallback, useRef, useState } from 'react'
import { useFieldArray, useForm, type FieldPath, type UseFormReturn } from 'react-hook-form'
import { getScientificSendouts, getScientificFiles, scientificFilesKey, scientificFileLabel, recordAnalysis, recordSequencing, scientificKey, type AnalysisRecord, type ScientificWorkspace, type SequencingRecord } from '#/api/lab-scientific-evidence'
import { ScientificFilePicker } from './ScientificFilePicker'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { FieldError } from '#/components/ui/field'
import { Textarea } from '#/components/ui/textarea'
import { RequiredFieldName } from '#/components/ui/required-field'
import { EvidenceError } from './InvestigationEvidence'
import { captureDefaults, captureMetadata, captureSchema, type CaptureValues } from './scientific-capture'
import { localTimeOccurrences } from './step-performance'

const selectClass = 'h-9 w-full cursor-pointer rounded-lg border bg-background px-3 text-sm'
type Form = UseFormReturn<CaptureValues>
function Field({ form, name, label, required = false, multiline = false, type = 'text' }: { form: Form; name: FieldPath<CaptureValues>; label: string; required?: boolean; multiline?: boolean; type?: string }) {
  const id = `capture-${name.replaceAll('.', '-')}`
  const error = form.getFieldState(name, form.formState).error?.message
  const props = { id, ...form.register(name), required, 'aria-invalid': Boolean(error), 'aria-describedby': `${id}-error` }
  return <div className="min-w-0 space-y-1.5"><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>{multiline ? <Textarea {...props} /> : <Input {...props} type={type} />}<FieldError id={`${id}-error`}>{error}</FieldError></div>
}
function ClockField({ form, name, label }: { form: Form; name: 'start' | 'end' | 'submitted' | 'received'; label: string }) {
  const choices = localTimeOccurrences(form.watch(name))
  const occurrence = `${name}Occurrence` as const
  return <div className="space-y-2"><Field form={form} name={name} label={label} required={name === 'start' || name === 'end'} type="datetime-local" />{choices.length > 1 ? <div><Label htmlFor={`capture-${occurrence}`}><RequiredFieldName>{label}: clock occurrence</RequiredFieldName></Label><select id={`capture-${occurrence}`} className={selectClass} required {...form.register(occurrence)}><option value="">Choose an occurrence</option>{choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div> : null}</div>
}
function Versions({ form, name, title }: { form: Form; name: 'software' | 'references'; title: string }) {
  const rows = useFieldArray({ control: form.control, name })
  return <div className="space-y-3">{rows.fields.map((row, index) => <fieldset key={row.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"><legend className="px-1 text-sm">{title} {index + 1}</legend><Field form={form} name={`${name}.${index}.name`} label={`${title} name ${index + 1}`} required /><Field form={form} name={`${name}.${index}.version`} label={`${title} version ${index + 1}`} required /><Button type="button" variant="outline" className="self-end" onClick={() => rows.remove(index)}>Remove {title.toLowerCase()} {index + 1}</Button></fieldset>)}<FieldError>{form.formState.errors[name]?.message}</FieldError><Button type="button" variant="outline" disabled={rows.fields.length >= 64} onClick={() => rows.append({ name: '', version: '', sha256: '' })}>Add {title.toLowerCase()}</Button></div>
}
function Exception({ form, name, reason, label }: { form: Form; name: 'qcNa' | 'softwareNa' | 'referenceNa' | 'parametersNa'; reason: 'qcReason' | 'softwareReason' | 'referenceReason' | 'parametersReason'; label: string }) {
  return <div className="space-y-2"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" {...form.register(name)} />{label} is not applicable</label>{form.watch(name) ? <Field form={form} name={reason} label={`Why ${label.toLowerCase()} is not applicable`} required multiline /> : null}</div>
}
export function ScientificCaptureForm({ kind, data, source, saved, cancel }: { kind: 'sequencing' | 'analysis'; data: ScientificWorkspace; source?: SequencingRecord | AnalysisRecord; saved: (id: string) => void; cancel: () => void }) {
  const form = useForm<CaptureValues>({ resolver: zodResolver(captureSchema), defaultValues: captureDefaults(kind, source, data), mode: 'onSubmit' })
  const [uploading, setUploading] = useState(0)
  const uploadBusy = useCallback((busy: boolean) => setUploading(n => n + (busy ? 1 : -1)), [])
  const documents = useFieldArray({ control: form.control, name: 'documents' })
  const metrics = useFieldArray({ control: form.control, name: 'metrics' })
  const client = useQueryClient()
  const request = useRef<{ fingerprint: string; id: string } | null>(null)
  const leaving = useRef(false)
  const uploadedFiles = useQuery({ queryKey: scientificFilesKey(data.workOrderId, data.specimenId), queryFn: () => getScientificFiles(data.workOrderId, data.specimenId) })
  const libraryId = form.watch('libraryId')
  const sendouts = useQuery({ queryKey: ['scientific-sendouts', data.workOrderId, data.specimenId, libraryId], queryFn: () => getScientificSendouts(data.workOrderId, data.specimenId, libraryId), enabled: kind === 'sequencing' && Boolean(libraryId) })
  const mutation = useMutation({ mutationFn: async (v: CaptureValues) => {
    const common = { labWorkOrderId: data.workOrderId, labSpecimenId: data.specimenId, providerKey: v.providerKey, scientificEvidence: captureMetadata(v, source?.scientificEvidenceJson ? JSON.parse(source.scientificEvidenceJson) : undefined) }
    const body = kind === 'sequencing' ? { ...common, sequencingRunNumber: Number(v.sequencingRunNumber), libraryPreparationChoice: v.libraryPreparationChoice, labLibraryId: v.libraryId, labNgsSendoutId: v.sendoutId, providerRunReference: v.runReference, sampleMappingReference: v.mapping, externalFileReference: v.fileReference, sha256: v.checksum, sizeBytes: Number(v.size), correctsOutputId: source?.id ?? null, correctionReason: source ? v.reason : null }
      : { ...common, runReference: v.runReference, sequencingOutputIds: v.inputs.map(i => i.id), previousAnalysisRunId: source?.id ?? null, reanalysisReason: source ? v.reason : null, requirementsVersion: 1 as const }
    const fingerprint = JSON.stringify(body)
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() }
    return 'labLibraryId' in body ? recordSequencing({ ...body, id: request.current.id }) : recordAnalysis({ ...body, id: request.current.id })
  }, retry: false, onSuccess: async result => {
    await Promise.all([client.invalidateQueries({ queryKey: scientificKey(data.workOrderId, data.specimenId) }), client.invalidateQueries({ queryKey: ['sample-investigation', data.workOrderId, data.specimenId] })])
    leaving.current = true; saved(result.id)
  } })
  useBlocker({ shouldBlockFn: () => !leaving.current && (mutation.isPending || uploading > 0 || form.formState.isDirty && !window.confirm('Discard the unsaved scientific evidence?')), enableBeforeUnload: () => !leaving.current && (form.formState.isDirty || mutation.isPending || uploading > 0) })
  const inputs = form.watch('inputs')
  const firstAttempt = data.outputs.find(o => o.id === inputs[0]?.id)?.labSpecimenAttemptId
  const submit = (v: CaptureValues) => {
    if (kind === 'sequencing' && Number(v.sequencingRunNumber) > (data.sequencingRunCount ?? 1)) {
      form.setError('sequencingRunNumber', { message: `This sample has ${data.sequencingRunCount ?? 1} purchased runs.` }); return
    }
    if (kind === 'analysis' && (v.inputs.some(i => !data.outputs.some(o => o.id === i.id)) || new Set(v.inputs.map(i => data.outputs.find(o => o.id === i.id)?.labSpecimenAttemptId)).size !== 1)) {
      form.setError('inputs', { message: 'Choose exact inputs belonging to a single source-tube attempt.' }); return
    }
    if (uploading === 0) mutation.mutate(v)
  }
  return <form className="space-y-5" noValidate onSubmit={form.handleSubmit(submit)}>
    <p className="text-sm text-muted-foreground">Record actual completed work. Saving retains this evidence permanently; later changes create a linked record. Required evidence does not replace scientific review.</p>
    <fieldset disabled={mutation.isPending} className="space-y-5">
      <section className="space-y-3 rounded-lg border p-4"><h2 className="font-medium">Source and run</h2>
        {kind === 'sequencing' ? <>
          <p className="text-sm text-muted-foreground">This sample has {data.sequencingRunCount ?? 1} purchased runs. Use the same purchased run number for its additional files or corrections. One prepared library can supply multiple runs.</p>
          <div className="grid gap-3 sm:grid-cols-2"><Field form={form} name="sequencingRunNumber" label="Purchased run number" required type="number" />
            <div><Label htmlFor="capture-preparation-choice"><RequiredFieldName>Library preparation</RequiredFieldName></Label>
              <select id="capture-preparation-choice" className={selectClass} required {...form.register('libraryPreparationChoice')} aria-invalid={Boolean(form.formState.errors.libraryPreparationChoice)} aria-describedby="capture-preparation-choice-error">
                <option value="">Choose preparation</option><option value="NewPreparation">New preparation for this run</option><option value="ExistingLibrary">Use an existing prepared library</option>
              </select><FieldError id="capture-preparation-choice-error">{form.formState.errors.libraryPreparationChoice?.message}</FieldError>
            </div></div>
          <p className="text-sm text-muted-foreground">Select the library actually used. For a new preparation, complete its preparation and QC first. Reusing a library retains its original preparation evidence.</p>
        </> : null}
        {kind === 'sequencing' ? <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="capture-library"><RequiredFieldName>Library / tube</RequiredFieldName></Label><select id="capture-library" className={selectClass} required {...form.register('libraryId', { onChange: () => form.setValue('sendoutId', '') })} aria-invalid={Boolean(form.formState.errors.libraryId)} aria-describedby="capture-library-error"><option value="">Select a library</option>{data.libraries.map(l => <option key={l.id} value={l.id}>{l.libraryKey} · {l.barcode} · {l.status}</option>)}</select><FieldError id="capture-library-error">{form.formState.errors.libraryId?.message}</FieldError></div>
          <div><Label htmlFor="capture-sendout"><RequiredFieldName>Sequencing submission</RequiredFieldName></Label><select id="capture-sendout" className={selectClass} required {...form.register('sendoutId')} disabled={!libraryId || sendouts.isPending || sendouts.isError} aria-invalid={Boolean(form.formState.errors.sendoutId)} aria-describedby="capture-sendout-error"><option value="">Select a recorded submission</option>{sendouts.data?.map(s => <option key={s.id} value={s.id}>{s.providerName} · {s.providerReference ?? s.id.slice(0, 8)} · {s.status}</option>)}</select><FieldError id="capture-sendout-error">{form.formState.errors.sendoutId?.message}</FieldError>{libraryId && sendouts.data?.length === 0 ? <p className="text-sm">No eligible submission contains this exact library and barcode. Review its sequencing handoff.</p> : null}{sendouts.isError ? <><EvidenceError error={sendouts.error} /><Button type="button" variant="outline" onClick={() => void sendouts.refetch()}>Reload submissions</Button></> : null}</div></div> : <div className="space-y-2"><p className="text-sm">Select the exact inputs. Inputs from different source-tube attempts cannot be combined.</p>{data.outputs.map(output => {
          const selected = inputs.find(i => i.id === output.id)
          const incompatible = Boolean(firstAttempt && firstAttempt !== output.labSpecimenAttemptId)
          return <div key={output.id} className="grid gap-2 border-b pb-3 sm:grid-cols-2"><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={Boolean(selected)} disabled={!selected && incompatible} onChange={event => form.setValue('inputs', event.target.checked ? [...inputs, { id: output.id, role: '' }] : inputs.filter(i => i.id !== output.id), { shouldDirty: true, shouldValidate: true })} /><span>{scientificFileLabel(output.externalFileReference, uploadedFiles.data?.files)} · {output.providerRunReference}{incompatible ? ' (different tube attempt)' : ''}</span></label>{selected ? <Field form={form} name={`inputs.${inputs.findIndex(i => i.id === output.id)}.role`} label={`Input role for ${scientificFileLabel(output.externalFileReference, uploadedFiles.data?.files)}`} required /> : null}</div>
        })}{!data.outputs.length ? <p>No sequencing outputs have been recorded for this sample.</p> : null}<FieldError>{form.formState.errors.inputs?.message}</FieldError></div>}
        <div className="grid gap-3 sm:grid-cols-2"><Field form={form} name="providerKey" label="Provider / producing team" required /><Field form={form} name="runReference" label="Actual run reference" required /></div>
        <p className="text-xs text-muted-foreground">Run times use {Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ')} and retain the selected UTC offset.</p><div className="grid gap-3 sm:grid-cols-2"><ClockField form={form} name="start" label="Run started" /><ClockField form={form} name="end" label="Run completed" /></div>
        {source ? <Field form={form} name="reason" label={kind === 'sequencing' ? 'Correction reason' : 'Reanalysis / replacement reason'} required multiline /> : null}
      </section>
      {kind === 'sequencing' ? <>
        <section className="space-y-3 rounded-lg border p-4"><h2 className="font-medium">File and sample mapping</h2>
          <Field form={form} name="mapping" label="Sample mapping / index / lane reference" required />
          <ScientificFilePicker work={data.workOrderId} specimen={data.specimenId} label="Sequencing file" reference={form.watch('fileReference')} required
            error={form.formState.errors.fileReference?.message || form.formState.errors.checksum?.message || form.formState.errors.size?.message}
            onBusyChange={uploadBusy} onUploaded={file => {
              form.setValue('fileReference', file.externalFileReference, { shouldDirty: true, shouldValidate: true })
              form.setValue('checksum', file.sha256, { shouldDirty: true, shouldValidate: true })
              form.setValue('size', String(file.sizeBytes), { shouldDirty: true, shouldValidate: true })
            }} />
        </section>
        <section className="space-y-3 rounded-lg border p-4"><h2 className="font-medium">Sequencing QC</h2><Exception form={form} name="qcNa" reason="qcReason" label="QC" />{!form.watch('qcNa') ? <><Field form={form} name="qcSummary" label="QC summary" required multiline /><p className="text-sm">Include named measurements below or a document with role “qc” in Supporting documents.</p>{metrics.fields.map((row, index) => <fieldset key={row.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3"><legend className="px-1 text-sm">QC metric {index + 1}</legend><Field form={form} name={`metrics.${index}.name`} label={`Metric name ${index + 1}`} required /><Field form={form} name={`metrics.${index}.value`} label={`Metric value ${index + 1}`} required type="number" /><Field form={form} name={`metrics.${index}.unit`} label={`Metric unit ${index + 1}`} required /><Button type="button" variant="outline" onClick={() => metrics.remove(index)}>Remove metric {index + 1}</Button></fieldset>)}<Button type="button" variant="outline" disabled={metrics.fields.length >= 128} onClick={() => metrics.append({ name: '', value: '', unit: '' })}>Add QC metric</Button><FieldError>{form.formState.errors.metrics?.message}</FieldError></> : <FieldError>{form.formState.errors.qcSummary?.message}</FieldError>}</section>
      </> : <section className="space-y-4 rounded-lg border p-4"><h2 className="font-medium">Analysis software, settings and references</h2><Exception form={form} name="softwareNa" reason="softwareReason" label="Software" />{!form.watch('softwareNa') ? <Versions form={form} name="software" title="Software" /> : <FieldError>{form.formState.errors.software?.message}</FieldError>}{form.watch('parameters') && !form.watch('documents').some(d => d.role === 'parameters') ? <p className="text-sm text-muted-foreground">The previously recorded settings fingerprint is retained. Upload a settings file to store it in POMS.</p> : null}<Exception form={form} name="parametersNa" reason="parametersReason" label="Settings" />{!form.watch('parametersNa') ? <ScientificFilePicker work={data.workOrderId} specimen={data.specimenId} label="Analysis settings file" required
        reference={form.watch('documents').find(d => d.role === 'parameters')?.externalFileReference ?? ''}
        error={form.formState.errors.parameters?.message} onBusyChange={uploadBusy} onUploaded={file => {
          form.setValue('parameters', file.sha256, { shouldDirty: true, shouldValidate: true })
          const next = form.getValues('documents').filter(d => d.role !== 'parameters')
          form.setValue('documents', [...next, { role: 'parameters', externalFileReference: file.externalFileReference, sha256: file.sha256, sizeBytes: String(file.sizeBytes) }], { shouldDirty: true, shouldValidate: true })
        }} /> : <FieldError>{form.formState.errors.parameters?.message}</FieldError>}<Exception form={form} name="referenceNa" reason="referenceReason" label="Reference data" />{!form.watch('referenceNa') ? <Versions form={form} name="references" title="Reference" /> : <FieldError>{form.formState.errors.references?.message}</FieldError>}</section>}
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Additional run details</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{(['instrument', 'flowcell', 'lane', 'pool', 'indexMapping', 'workflowVersion'] as const).map((name, i) => <Field key={name} form={form} name={name} label={['Instrument', 'Flowcell', 'Lane', 'Pool', 'Index mapping', 'Workflow version'][i]} />)}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><ClockField form={form} name="submitted" label="Submitted to provider (optional)" /><ClockField form={form} name="received" label="Received from provider (optional)" /></div></details>
      <section className="space-y-3 rounded-lg border p-4"><h2 className="font-medium">Supporting documents</h2>
        {documents.fields.map((row, index) => <fieldset key={row.id} className="space-y-3 rounded-lg border p-3">
          <legend className="px-1 text-sm">Document {index + 1}</legend>
          <Field form={form} name={`documents.${index}.role`} label={`Document role ${index + 1}`} required />
          <ScientificFilePicker work={data.workOrderId} specimen={data.specimenId} label={`Document ${index + 1}`} required
            reference={form.watch(`documents.${index}.externalFileReference`)}
            error={form.formState.errors.documents?.[index]?.externalFileReference?.message}
            onBusyChange={uploadBusy} onUploaded={file => {
              form.setValue(`documents.${index}.externalFileReference`, file.externalFileReference, { shouldDirty: true, shouldValidate: true })
              form.setValue(`documents.${index}.sha256`, file.sha256, { shouldDirty: true, shouldValidate: true })
              form.setValue(`documents.${index}.sizeBytes`, String(file.sizeBytes), { shouldDirty: true, shouldValidate: true })
            }} />
          <Button type="button" variant="outline" disabled={uploading > 0} onClick={() => documents.remove(index)}>Remove document {index + 1}</Button>
        </fieldset>)}
        <FieldError>{form.formState.errors.documents?.message}</FieldError>
        <Button type="button" variant="outline" disabled={documents.fields.length >= 64 || uploading > 0} onClick={() => documents.append({ role: kind === 'sequencing' ? 'qc' : 'parameters', externalFileReference: '', sha256: '', sizeBytes: '' })}>Add document</Button>
      </section>
    </fieldset>
    {form.formState.isSubmitted && Object.keys(form.formState.errors).length ? <p role="alert" className="text-sm text-destructive">Review the highlighted fields before saving.</p> : null}
    {mutation.isError ? <EvidenceError error={mutation.error} /> : null}
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">* Required</p><div className="flex gap-2"><Button type="button" variant="outline" disabled={mutation.isPending || uploading > 0} onClick={cancel}>Cancel</Button><Button type="submit" disabled={mutation.isPending || uploading > 0 || kind === 'sequencing' && sendouts.isError}>{mutation.isPending ? 'Saving…' : 'Save evidence'}</Button></div></div>
  </form>
}
