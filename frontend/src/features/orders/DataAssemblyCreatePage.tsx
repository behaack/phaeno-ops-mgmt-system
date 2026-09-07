import { useOrderDraftGuard } from './use-order-draft-guard'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { createAssemblyRequest, getAssemblyRequest, getOrderErrorMessage, listAssemblyProfiles, removeAssemblyInput, submitAssemblyRequest, updateAssemblyRequest, uploadAssemblyInput } from '#/api/order-management'
import type { DataAssemblyRequest, OperationalFile } from '#/api/order-management'
import { ResumableDraft } from './resumable-draft'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredLegend, RequiredMark as Required } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'

const schema = z.object({
  assemblyProfileId: z.string().uuid('Select an assembly profile.'),
  projectReference: z.string().trim().min(1, 'Project reference is required.').max(255),
  projectMetadata: z.string().trim().max(4000).optional(),
  requestedOutput: z.string().trim().min(1, 'Requested output is required.').max(2000),
  processingNotes: z.string().trim().max(4000).optional(),
  prohibitedDataConfirmed: z.boolean().refine((value) => value, 'Confirm that the submission contains no PHI or patient identifiers.'),
})
type Values = z.infer<typeof schema>

export function DataAssemblyCreatePage({ requestId }: { requestId?: string }) {
  const { authProvider, session } = usePhaenoSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [savedRequestId, setSavedRequestId] = useState<string | null>(null)
  const effectiveRequestId = requestId ?? savedRequestId
  const [files, setFiles] = useState<File[]>([])
  const [metadataValues, setMetadataValues] = useState<Record<string, string>>({})
  const canCreate = Boolean(session?.capabilities.canCreateDataAssemblyRequests)
  const apiEnabled = canCreate && authProvider !== 'mock'
  const profiles = useQuery({ queryKey: ['order-catalog', 'assembly-profiles'], queryFn: listAssemblyProfiles, enabled: apiEnabled })
  const existingRequest = useQuery({ queryKey: ['assembly-request', effectiveRequestId], queryFn: () => getAssemblyRequest(effectiveRequestId!), enabled: apiEnabled && Boolean(effectiveRequestId) })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { assemblyProfileId: '', projectReference: '', projectMetadata: '', requestedOutput: '', processingNotes: '', prohibitedDataConfirmed: false } })
  const initializedRecord = useRef<string | null>(null)
  useEffect(() => {
    if (!requestId || !existingRequest.data || initializedRecord.current === existingRequest.data.id) return
    initializedRecord.current = existingRequest.data.id
    form.reset({
      assemblyProfileId: existingRequest.data.assemblyProfileId,
      projectReference: existingRequest.data.projectReference,
      projectMetadata: readProjectMetadata(existingRequest.data.metadataJson),
      requestedOutput: existingRequest.data.requestedOutput,
      processingNotes: existingRequest.data.processingNotes ?? '',
      prohibitedDataConfirmed: existingRequest.data.prohibitedDataConfirmed,
    })
    setMetadataValues(readMetadataValues(existingRequest.data.metadataJson))
  }, [existingRequest.data, form, requestId])
  const selectedProfile = profiles.data?.find((profile) => profile.id === form.watch('assemblyProfileId'))
  const profileMetadataFields = metadataFields(selectedProfile?.metadataSchemaJson)
  type DraftInput = Parameters<typeof createAssemblyRequest>[0]
  const draftSession = useRef(new ResumableDraft<DraftInput, DataAssemblyRequest>())
  const uploadKeys = useRef(new WeakMap<File, string>())
  const refresh = async () => {
    await Promise.all(['assembly-request', 'data-assembly-request', 'data-assembly-requests'].map(key =>
      queryClient.invalidateQueries({ queryKey: [key] })))
  }
  const removeInput = useMutation({
    mutationFn: (file: OperationalFile) => removeAssemblyInput(effectiveRequestId!, file),
    onSuccess: refresh,
  })
  const submitMutation = useMutation({
    mutationFn: async ({ values, submit }: { values: Values; submit: boolean }) => {
      const missing = profileMetadataFields.find((field) => field.required && !metadataValues[field.name]?.trim())
      if (missing) throw new Error(`${missing.label} is required.`)
      const metadataJson = profileMetadataFields.length
        ? JSON.stringify(Object.fromEntries(profileMetadataFields.filter(field => field.required || metadataValues[field.name]?.trim()).map((field) => [field.name, field.type === 'number' ? Number(metadataValues[field.name]) : field.type === 'boolean' ? metadataValues[field.name] === 'true' : metadataValues[field.name] ?? ''])))
        : JSON.stringify({ projectMetadata: values.projectMetadata })
      const input = { assemblyProfileId: values.assemblyProfileId, projectReference: values.projectReference,
        metadataJson, requestedOutput: values.requestedOutput,
        processingNotes: values.processingNotes, prohibitedDataConfirmed: values.prohibitedDataConfirmed }
      const created = requestId ? null : await draftSession.current.getOrCreate(input, createAssemblyRequest)
      const id = requestId ?? created!.id
      setSavedRequestId(id)
      const current = await getAssemblyRequest(id)
      if (!current.canEdit) return current
      await updateAssemblyRequest(id, { ...input, version: current.version })
      for (const file of files) {
        let key = uploadKeys.current.get(file)
        if (!key) { key = crypto.randomUUID(); uploadKeys.current.set(file, key) }
        await uploadAssemblyInput(id, file, key)
        setFiles(selected => selected.filter(value => value !== file))
      }
      const saved = await getAssemblyRequest(id)
      if (!submit) return saved
      if (!saved.inputFiles.length) throw new Error('Add at least one input file before submitting. Your draft is saved.')
      return submitAssemblyRequest(id, saved.version, saved.inputFiles)
    },
    onSuccess: async (request) => {
      form.reset(form.getValues())
      permitNavigation()
      await refresh()
      await navigate({ to: '/data-assembly/$requestId', params: { requestId: request.id }, search: previous => previous })
    },
    onError: refresh,
  })

  const permitNavigation = useOrderDraftGuard(form.formState.isDirty || files.length > 0, submitMutation.isPending || removeInput.isPending)

  if (!canCreate) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Request creation unavailable</AlertTitle><AlertDescription>An active organization or Department administrator is required.</AlertDescription></Alert></main>
  return <main className="page-wrap px-4 py-8">
    <section className="mb-6 max-w-3xl"><p className="text-sm text-muted-foreground"><Link to="/data-assembly" search={previous => previous} className="hover:underline">Data assembly</Link> / {requestId ? 'Edit request' : 'New request'}</p><h1 className="mt-2 text-3xl font-semibold">{requestId ? 'Edit data assembly request' : 'Request data assembly'}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose an approved profile, provide its required context, upload scientific inputs, and submit an immutable input revision for intake validation.</p></section>
    {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Submission is paused in mock-session mode</AlertTitle><AlertDescription>Connect a real Partner session to upload inputs.</AlertDescription></Alert> : null}
    {existingRequest.data && !existingRequest.data.canEdit ? <Alert variant="destructive" className="mb-5"><AlertTitle>Request is no longer editable</AlertTitle><AlertDescription>Return to the request to review its current status.</AlertDescription></Alert> : null}
    {submitMutation.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>{savedRequestId ? 'Draft saved; submission needs attention' : 'Assembly request was not saved'}</AlertTitle><AlertDescription>{getOrderErrorMessage(submitMutation.error, 'Review the request and try again.')}{savedRequestId ? <Link to="/data-assembly/$requestId" params={{ requestId: savedRequestId }} className="ml-2 underline">Open saved draft</Link> : null}</AlertDescription></Alert> : null}
    {profiles.error || existingRequest.error || removeInput.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Inputs could not be updated</AlertTitle><AlertDescription>{getOrderErrorMessage(profiles.error ?? existingRequest.error ?? removeInput.error, 'Retry without leaving your draft.')} <Button type="button" variant="outline" onClick={() => { void profiles.refetch(); if (effectiveRequestId) void existingRequest.refetch() }}>Retry</Button></AlertDescription></Alert> : null}
    <form noValidate onSubmit={form.handleSubmit((values) => submitMutation.mutate({ values, submit: true }))} className="space-y-5">
      <fieldset disabled={submitMutation.isPending} className="contents">
      <RequiredLegend />
      <Card><CardHeader><CardTitle>Assembly profile</CardTitle><CardDescription>The selected profile version and instructions are frozen in the request.</CardDescription></CardHeader><CardContent><Label htmlFor="assemblyProfileId">Profile <Required /></Label><select id="assemblyProfileId" value={form.watch('assemblyProfileId')} onChange={(event) => { form.setValue('assemblyProfileId', event.target.value, { shouldDirty: true, shouldValidate: true }); setMetadataValues({}) }} className="mt-2 h-9 w-full max-w-xl rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><option value="">Select profile</option>{(profiles.data ?? []).map((profile) => <option key={profile.id} value={profile.id}>{profile.name} v{profile.profileVersion}</option>)}</select><ErrorText message={form.formState.errors.assemblyProfileId?.message} />{selectedProfile ? <Alert className="mt-4"><AlertTitle>{selectedProfile.name} instructions</AlertTitle><AlertDescription><span className="whitespace-pre-wrap">{selectedProfile.instructions}</span></AlertDescription></Alert> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle>Project and requested output</CardTitle></CardHeader><CardContent className="space-y-5"><Field label="Partner project or reference" id="projectReference" error={form.formState.errors.projectReference?.message}><Input id="projectReference" {...form.register('projectReference')} /></Field>{profileMetadataFields.length ? <div className="grid gap-4 sm:grid-cols-2">{profileMetadataFields.map((field) => <div key={field.name}><Label htmlFor={`metadata-${field.name}`}>{field.label}{field.required ? <> <Required /></> : null}</Label>{field.type === 'boolean' ? <select id={`metadata-${field.name}`} value={metadataValues[field.name] ?? ''} onChange={(event) => { setMetadataValues((current) => ({ ...current, [field.name]: event.target.value })); form.setValue('projectMetadata', 'Updated profile values', { shouldDirty: true }) }} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select</option><option value="true">Yes</option><option value="false">No</option></select> : <Input id={`metadata-${field.name}`} type={field.type === 'number' ? 'number' : 'text'} className="mt-2" value={metadataValues[field.name] ?? ''} onChange={(event) => { setMetadataValues((current) => ({ ...current, [field.name]: event.target.value })); form.setValue('projectMetadata', 'Updated profile values', { shouldDirty: true }) }} />}</div>)}</div> : <Field label="Project metadata" id="projectMetadata" required={false} error={form.formState.errors.projectMetadata?.message}><textarea id="projectMetadata" {...form.register('projectMetadata')} className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></Field>}<Field label="Requested output" id="requestedOutput" error={form.formState.errors.requestedOutput?.message}><textarea id="requestedOutput" {...form.register('requestedOutput')} className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></Field><div><Label htmlFor="processingNotes">Processing notes</Label><textarea id="processingNotes" {...form.register('processingNotes')} className="mt-2 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Input files</CardTitle><CardDescription>Files are stored with server-generated keys, checksummed, and scanned before submission. Do not upload patient identifiers or PHI.</CardDescription></CardHeader><CardContent>
        {existingRequest.data?.inputFiles.length ? <ul aria-label="Saved input files" className="mb-4 divide-y">{existingRequest.data.inputFiles.map(file => <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="break-all">{file.fileName} · {formatBytes(file.sizeBytes)} · Scan: {file.scanStatus}</span>{existingRequest.data?.canEdit ? <Button type="button" variant="outline" size="sm" disabled={removeInput.isPending || submitMutation.isPending} onClick={() => { if (window.confirm(`Remove ${file.fileName} from the current draft? Earlier submitted revisions remain in history.`)) removeInput.mutate(file) }}>Remove input</Button> : null}</li>)}</ul> : null}
        {selectedProfile ? <p className="mb-3 text-sm text-muted-foreground">Allowed file types: {fileKindsText(selectedProfile.allowedFileKindsJson)}. Maximum per file: {formatBytes(selectedProfile.maximumFileSizeBytes)}. Maximum total: {formatBytes(selectedProfile.maximumTotalSizeBytes)}.</p> : null}
        <label className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed p-8 text-center focus-within:ring-3 focus-within:ring-ring/50"><UploadCloud aria-hidden="true" className="mb-2 size-8 text-muted-foreground" /><span className="font-medium">Choose assembly inputs</span><span className="mt-1 text-sm text-muted-foreground">Allowed types and limits come from the active profile.</span><input type="file" multiple className="sr-only" disabled={submitMutation.isPending} onChange={(event) => { setFiles(previous => [...previous, ...Array.from(event.target.files ?? [])]); event.target.value = '' }} /></label>{files.length ? <ul className="mt-3 space-y-1 text-sm" aria-live="polite">{files.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name} · {formatBytes(file.size)} <Button type="button" variant="ghost" size="sm" disabled={submitMutation.isPending} onClick={() => setFiles(selected => selected.filter(value => value !== file))}>Remove selection</Button></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">No additional files selected.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Review and submit</CardTitle><CardDescription>Submission begins intake validation. Phaeno will issue job-specific pricing only after the inputs pass intake.</CardDescription></CardHeader><CardContent><div className="flex cursor-pointer items-start gap-3"><Checkbox id="assemblyProhibitedData" checked={form.watch('prohibitedDataConfirmed')} onCheckedChange={(checked) => form.setValue('prohibitedDataConfirmed', checked === true, { shouldValidate: true, shouldDirty: true })} /><Label htmlFor="assemblyProhibitedData" className="cursor-pointer text-sm font-normal">I confirm that the metadata, file names, and file contents contain no patient identifiers, PHI, or unnecessary personal data. <Required /></Label></div><ErrorText message={form.formState.errors.prohibitedDataConfirmed?.message} /></CardContent></Card>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" asChild><Link to={requestId ? '/data-assembly/$requestId' : '/data-assembly'} params={requestId ? { requestId } : undefined} search={previous => previous}>Cancel</Link></Button><Button type="button" variant="secondary" disabled={!apiEnabled || submitMutation.isPending || removeInput.isPending || (Boolean(requestId) && !existingRequest.data?.canEdit)} onClick={form.handleSubmit((values) => submitMutation.mutate({ values, submit: false }))}>{submitMutation.isPending ? 'Saving…' : 'Save draft'}</Button><Button type="submit" disabled={!apiEnabled || submitMutation.isPending || removeInput.isPending || (Boolean(requestId) && !existingRequest.data?.canSubmit)}>{submitMutation.isPending ? 'Uploading and submitting…' : 'Submit for intake validation'}</Button></div>
      </fieldset>
    </form>
  </main>
}

function Field({ label, id, error, children, required = true }: { label: string; id: string; error?: string; required?: boolean; children: React.ReactNode }) { return <div><Label htmlFor={id}>{label}{required ? <> <Required /></> : null}</Label><div className="mt-2">{children}</div><ErrorText message={error} /></div> }
function ErrorText({ message }: { message?: string }) { return message ? <p role="alert" className="mt-1 text-sm text-destructive">{message}</p> : null }
function formatBytes(value: number) { return new Intl.NumberFormat('en-US', { style: 'unit', unit: value >= 1_000_000 ? 'megabyte' : 'kilobyte', maximumFractionDigits: 1 }).format(value >= 1_000_000 ? value / 1_000_000 : value / 1_000) }
function readProjectMetadata(metadataJson: string) { try { const parsed = JSON.parse(metadataJson) as { projectMetadata?: unknown }; return typeof parsed.projectMetadata === 'string' ? parsed.projectMetadata : metadataJson } catch { return metadataJson } }
function readMetadataValues(metadataJson: string) { try { const parsed = JSON.parse(metadataJson) as Record<string, unknown>; return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value ?? '')])) } catch { return {} } }
function metadataFields(schemaJson?: string) {
  if (!schemaJson) return []
  try {
    const schema = JSON.parse(schemaJson) as { properties?: Record<string, { title?: string; type?: string }>; required?: string[] }
    const required = new Set(schema.required ?? [])
    return Object.entries(schema.properties ?? {}).map(([name, definition]) => ({ name, label: definition.title || name.replace(/([a-z])([A-Z])/g, '$1 $2'), type: definition.type === 'number' || definition.type === 'integer' ? 'number' : definition.type === 'boolean' ? 'boolean' : 'string', required: required.has(name) }))
  } catch { return [] }
}

function fileKindsText(value: string) { try { const kinds = JSON.parse(value) as unknown; return Array.isArray(kinds) ? kinds.join(', ') : 'See profile instructions' } catch { return 'See profile instructions' } }
