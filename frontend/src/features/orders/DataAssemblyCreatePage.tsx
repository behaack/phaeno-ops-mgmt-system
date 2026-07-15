import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { createAssemblyRequest, getAssemblyRequest, getOrderErrorMessage, listAssemblyProfiles, submitAssemblyRequest, updateAssemblyRequest, uploadAssemblyInput } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
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
  const [files, setFiles] = useState<File[]>([])
  const [metadataValues, setMetadataValues] = useState<Record<string, string>>({})
  const canCreate = Boolean(session?.capabilities.canCreateDataAssemblyRequests)
  const apiEnabled = canCreate && authProvider !== 'mock'
  const profiles = useQuery({ queryKey: ['order-catalog', 'assembly-profiles'], queryFn: listAssemblyProfiles, enabled: apiEnabled })
  const existingRequest = useQuery({ queryKey: ['assembly-request', requestId], queryFn: () => getAssemblyRequest(requestId!), enabled: apiEnabled && Boolean(requestId) })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { assemblyProfileId: '', projectReference: '', projectMetadata: '', requestedOutput: '', processingNotes: '', prohibitedDataConfirmed: false } })
  useEffect(() => {
    if (!existingRequest.data) return
    form.reset({
      assemblyProfileId: existingRequest.data.assemblyProfileId,
      projectReference: existingRequest.data.projectReference,
      projectMetadata: readProjectMetadata(existingRequest.data.metadataJson),
      requestedOutput: existingRequest.data.requestedOutput,
      processingNotes: existingRequest.data.processingNotes ?? '',
      prohibitedDataConfirmed: existingRequest.data.prohibitedDataConfirmed,
    })
    setMetadataValues(readMetadataValues(existingRequest.data.metadataJson))
  }, [existingRequest.data, form])
  const selectedProfile = profiles.data?.find((profile) => profile.id === form.watch('assemblyProfileId'))
  const profileMetadataFields = metadataFields(selectedProfile?.metadataSchemaJson)
  const submitMutation = useMutation({
    mutationFn: async ({ values, submit }: { values: Values; submit: boolean }) => {
      const missing = profileMetadataFields.find((field) => field.required && !metadataValues[field.name]?.trim())
      if (missing) throw new Error(`${missing.label} is required.`)
      const metadataJson = profileMetadataFields.length
        ? JSON.stringify(Object.fromEntries(profileMetadataFields.map((field) => [field.name, field.type === 'number' ? Number(metadataValues[field.name]) : field.type === 'boolean' ? metadataValues[field.name] === 'true' : metadataValues[field.name] ?? ''])))
        : JSON.stringify({ projectMetadata: values.projectMetadata })
      const input = { assemblyProfileId: values.assemblyProfileId, projectReference: values.projectReference,
        metadataJson, requestedOutput: values.requestedOutput,
        processingNotes: values.processingNotes, prohibitedDataConfirmed: values.prohibitedDataConfirmed }
      const request = requestId
        ? await updateAssemblyRequest(requestId, { ...input, version: existingRequest.data!.version })
        : await createAssemblyRequest(input)
      const uploaded = []
      for (const file of files) uploaded.push(await uploadAssemblyInput(request.id, file))
      if (!submit) return request
      const manifestFiles = [...(existingRequest.data?.inputFiles ?? []), ...uploaded]
      if (manifestFiles.length === 0) throw new Error('Select at least one assembly input file.')
      return submitAssemblyRequest(request.id, request.version, manifestFiles)
    },
    onSuccess: (request) => navigate({ to: '/data-assembly/$requestId', params: { requestId: request.id } }),
  })

  if (!canCreate) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Request creation unavailable</AlertTitle><AlertDescription>An active Partner administrator is required.</AlertDescription></Alert></main>
  return <main className="page-wrap px-4 py-8">
    <section className="mb-6 max-w-3xl"><p className="text-sm text-muted-foreground"><Link to="/data-assembly" className="hover:underline">Data assembly</Link> / {requestId ? 'Edit request' : 'New request'}</p><h1 className="mt-2 text-3xl font-semibold">{requestId ? 'Edit data assembly request' : 'Request data assembly'}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose an approved profile, provide its required context, upload scientific inputs, and submit an immutable input revision for intake validation.</p></section>
    {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Submission is paused in mock-session mode</AlertTitle><AlertDescription>Connect a real Partner session to upload inputs.</AlertDescription></Alert> : null}
    {existingRequest.data && !existingRequest.data.canEdit ? <Alert variant="destructive" className="mb-5"><AlertTitle>Request is no longer editable</AlertTitle><AlertDescription>Return to the request to review its current status.</AlertDescription></Alert> : null}
    {submitMutation.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Assembly request was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(submitMutation.error, 'Review the request and try again.')}</AlertDescription></Alert> : null}
    <form noValidate onSubmit={form.handleSubmit((values) => submitMutation.mutate({ values, submit: true }))} className="space-y-5">
      <p className="text-sm text-muted-foreground"><Required /> Required field</p>
      <Card><CardHeader><CardTitle>Assembly profile</CardTitle><CardDescription>The selected profile version and instructions are frozen in the request.</CardDescription></CardHeader><CardContent><Label htmlFor="assemblyProfileId">Profile <Required /></Label><select id="assemblyProfileId" value={form.watch('assemblyProfileId')} onChange={(event) => { form.setValue('assemblyProfileId', event.target.value, { shouldDirty: true, shouldValidate: true }); setMetadataValues({}) }} className="mt-2 h-9 w-full max-w-xl rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><option value="">Select profile</option>{(profiles.data ?? []).map((profile) => <option key={profile.id} value={profile.id}>{profile.name} v{profile.profileVersion}</option>)}</select><ErrorText message={form.formState.errors.assemblyProfileId?.message} />{selectedProfile ? <Alert className="mt-4"><AlertTitle>{selectedProfile.name} instructions</AlertTitle><AlertDescription><span className="whitespace-pre-wrap">{selectedProfile.instructions}</span></AlertDescription></Alert> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle>Project and requested output</CardTitle></CardHeader><CardContent className="space-y-5"><Field label="Partner project or reference" id="projectReference" error={form.formState.errors.projectReference?.message}><Input id="projectReference" {...form.register('projectReference')} /></Field>{profileMetadataFields.length ? <div className="grid gap-4 sm:grid-cols-2">{profileMetadataFields.map((field) => <div key={field.name}><Label htmlFor={`metadata-${field.name}`}>{field.label}{field.required ? <> <Required /></> : null}</Label>{field.type === 'boolean' ? <select id={`metadata-${field.name}`} value={metadataValues[field.name] ?? ''} onChange={(event) => setMetadataValues((current) => ({ ...current, [field.name]: event.target.value }))} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select</option><option value="true">Yes</option><option value="false">No</option></select> : <Input id={`metadata-${field.name}`} type={field.type === 'number' ? 'number' : 'text'} className="mt-2" value={metadataValues[field.name] ?? ''} onChange={(event) => setMetadataValues((current) => ({ ...current, [field.name]: event.target.value }))} />}</div>)}</div> : <Field label="Project metadata" id="projectMetadata" error={form.formState.errors.projectMetadata?.message}><textarea id="projectMetadata" {...form.register('projectMetadata')} className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></Field>}<Field label="Requested output" id="requestedOutput" error={form.formState.errors.requestedOutput?.message}><textarea id="requestedOutput" {...form.register('requestedOutput')} className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></Field><div><Label htmlFor="processingNotes">Processing notes</Label><textarea id="processingNotes" {...form.register('processingNotes')} className="mt-2 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Input files</CardTitle><CardDescription>Files are stored with server-generated keys, checksummed, and scanned before submission. Do not upload patient identifiers or PHI.</CardDescription></CardHeader><CardContent><label className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed p-8 text-center focus-within:ring-3 focus-within:ring-ring/50"><UploadCloud aria-hidden="true" className="mb-2 size-8 text-muted-foreground" /><span className="font-medium">Choose assembly inputs</span><span className="mt-1 text-sm text-muted-foreground">Allowed types and limits come from the active profile.</span><input type="file" multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>{files.length ? <ul className="mt-3 space-y-1 text-sm" aria-live="polite">{files.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name} · {formatBytes(file.size)}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">No files selected.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Review and submit</CardTitle><CardDescription>Submission begins intake validation. Phaeno will issue job-specific pricing only after the inputs pass intake.</CardDescription></CardHeader><CardContent><div className="flex cursor-pointer items-start gap-3"><Checkbox id="assemblyProhibitedData" checked={form.watch('prohibitedDataConfirmed')} onCheckedChange={(checked) => form.setValue('prohibitedDataConfirmed', checked === true, { shouldValidate: true, shouldDirty: true })} /><Label htmlFor="assemblyProhibitedData" className="cursor-pointer text-sm font-normal">I confirm that the metadata, file names, and file contents contain no patient identifiers, PHI, or unnecessary personal data. <Required /></Label></div><ErrorText message={form.formState.errors.prohibitedDataConfirmed?.message} /></CardContent></Card>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" asChild><Link to={requestId ? '/data-assembly/$requestId' : '/data-assembly'} params={requestId ? { requestId } : undefined}>Cancel</Link></Button><Button type="button" variant="secondary" disabled={!apiEnabled || submitMutation.isPending || (Boolean(requestId) && !existingRequest.data?.canEdit)} onClick={form.handleSubmit((values) => submitMutation.mutate({ values, submit: false }))}>{submitMutation.isPending ? 'Saving…' : 'Save draft'}</Button><Button type="submit" disabled={!apiEnabled || submitMutation.isPending || (Boolean(requestId) && !existingRequest.data?.canSubmit)}>{submitMutation.isPending ? 'Uploading and submitting…' : 'Submit for intake validation'}</Button></div>
    </form>
  </main>
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) { return <div><Label htmlFor={id}>{label} <Required /></Label><div className="mt-2">{children}</div><ErrorText message={error} /></div> }
function Required() { return <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> }
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
