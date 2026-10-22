import { formatDisplayDate } from '#/lib/display-format'
import { formatByteSize } from '#/lib/display-format'
import { PageTitle } from '#/components/ui/page-header'
import { RecordLink } from '#/components/ui/record-link'
import { BackLink } from '#/components/ui/back-link'
import { KitLotSubmissionSummary, PartnerKitLotDialog } from './KitLotSubmission'
import { CustomerSourceText, useCustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { confirmPortal } from '#/components/PortalConfirmation'
import { useOrderDraftGuard } from './use-order-draft-guard'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { createAssemblyRequest, getAssemblyRequest, getOrderErrorMessage, listAssemblyProfiles, removeAssemblyInput, submitAssemblyRequest, updateAssemblyRequest, uploadAssemblyInput } from '#/api/order-management'
import { getReagentOrder } from '#/api/order-management'
import { prepareKitAssemblyRequest } from '#/api/order-bundles'
import { readContract } from './KitAssemblyCasesPanel'
import type { DataAssemblyRequest, OperationalFile } from '#/api/order-management'
import { ResumableDraft } from './resumable-draft'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
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

export function DataAssemblyCreatePage({ requestId, kitOrderId, kitCaseId }: { requestId?: string; kitOrderId?: string; kitCaseId?: string }) {
  const __customerSource = useCustomerSourceText()

  const { authProvider, session } = usePhaenoSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [lotDialogOpen, setLotDialogOpen] = useState(false)
  const lotSubmissionButton = useRef<HTMLButtonElement>(null)
  const [savedRequestId, setSavedRequestId] = useState<string | null>(null)
  const effectiveRequestId = requestId ?? savedRequestId
  const [files, setFiles] = useState<File[]>([])
  const [metadataValues, setMetadataValues] = useState<Record<string, string>>({})
  const canCreate = Boolean(session?.capabilities.canCreateDataAssemblyRequests)
  const apiEnabled = canCreate && authProvider !== 'mock'
  const kitOrder = useQuery({ queryKey: ['reagent-order', kitOrderId], queryFn: () => getReagentOrder(kitOrderId!), enabled: apiEnabled && Boolean(kitOrderId && kitCaseId) })
  const kitCase = kitOrder.data?.assemblyCases?.find(item => item.id === kitCaseId)
  const existingRequest = useQuery({ queryKey: ['assembly-request', effectiveRequestId], queryFn: () => getAssemblyRequest(effectiveRequestId!), enabled: apiEnabled && Boolean(effectiveRequestId) })
  const linkedKit = useQuery({ queryKey: ['reagent-order', existingRequest.data?.kitOrderId], queryFn: () => getReagentOrder(existingRequest.data!.kitOrderId!), enabled: apiEnabled && Boolean(existingRequest.data?.kitOrderId) })
  const includedCase = kitCase ?? linkedKit.data?.assemblyCases?.find(item => item.id === existingRequest.data?.kitAssemblyCaseId)
  const profiles = useQuery({ queryKey: ['order-catalog', 'assembly-profiles'], queryFn: listAssemblyProfiles, enabled: apiEnabled && Boolean(requestId && existingRequest.data) && !existingRequest.data?.isIncludedAssembly })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { assemblyProfileId: '', projectReference: '', projectMetadata: '', requestedOutput: '', processingNotes: '', prohibitedDataConfirmed: false } })
  const { isDirty: __formDraftDirty } = form.formState

  const initializedRecord = useRef<string | null>(null)
  useEffect(() => {
    if (requestId || !kitCase || initializedRecord.current === kitCase.id) return
    initializedRecord.current = kitCase.id
    form.reset({ assemblyProfileId: kitCase.profile.id, projectReference: '', projectMetadata: '', requestedOutput: `Included outputs for ${kitCase.profile.name}`, processingNotes: '', prohibitedDataConfirmed: false })
  }, [kitCase, form, requestId])
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
  const selectedProfile = includedCase?.profile ?? profiles.data?.find((profile) => profile.id === form.watch('assemblyProfileId'))
  const profileMetadataFields = metadataFields(selectedProfile?.metadataSchemaJson)
  const profileReady = !existingRequest.data?.isIncludedAssembly || Boolean(includedCase)
  type DraftInput = Parameters<typeof createAssemblyRequest>[0]
  const draftSession = useRef(new ResumableDraft<DraftInput, DataAssemblyRequest>())
  const uploadKeys = useRef(new WeakMap<File, string>())
  const refresh = async () => {
    await Promise.all(['assembly-request', 'data-assembly-request', 'data-assembly-requests', 'reagent-order'].map(key =>
      queryClient.invalidateQueries({ queryKey: [key] })))
  }
  const removeInput = useMutation({
    mutationFn: (file: OperationalFile) => removeAssemblyInput(effectiveRequestId!, file),
    onSuccess: refresh,
  })
  const submitMutation = useMutation({
    mutationFn: async ({ values, submit }: { values: Values; submit: boolean }) => {
      if (submit && includedCase && !includedCase.lotSubmission?.usedOn) throw new Error('Save the kit lot and actual kit-use date before submitting assembly inputs. You can still save your draft.')
      const missing = profileMetadataFields.find((field) => field.required && !metadataValues[field.name]?.trim())
      if (missing) throw new Error(`${missing.label} is required.`)
      const metadataJson = profileMetadataFields.length
        ? JSON.stringify(Object.fromEntries(profileMetadataFields.filter(field => field.required || metadataValues[field.name]?.trim()).map((field) => [field.name, field.type === 'number' ? Number(metadataValues[field.name]) : field.type === 'boolean' ? metadataValues[field.name] === 'true' : metadataValues[field.name] ?? ''])))
        : JSON.stringify({ projectMetadata: values.projectMetadata })
      const input = { assemblyProfileId: values.assemblyProfileId, projectReference: values.projectReference,
        metadataJson, requestedOutput: values.requestedOutput,
        processingNotes: values.processingNotes, prohibitedDataConfirmed: values.prohibitedDataConfirmed }
      if (!requestId && !savedRequestId && (!kitCase || !kitOrderId || !kitCase.canPrepare)) throw new Error('Open an available assembly case from its PSeq Kit order before preparing inputs.')
      const created = requestId ? null : await draftSession.current.getOrCreate(input, (draft, key) => prepareKitAssemblyRequest(kitOrderId!, kitCase!.id, { version: kitCase!.version, projectReference: draft.projectReference, metadataJson: draft.metadataJson, requestedOutput: draft.requestedOutput, processingNotes: draft.processingNotes ?? '', prohibitedDataConfirmed: draft.prohibitedDataConfirmed }, key))
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
      return submitAssemblyRequest(id, saved.version, saved.inputFiles, includedCase?.lotSubmission?.currentAssessment.lotVersion)
    },
    onSuccess: async (request) => {
      form.reset(form.getValues())
      permitNavigation()
      await refresh()
      await navigate({ to: '/data-assembly/$requestId', params: { requestId: request.id }, search: previous => previous })
    },
    onError: refresh,
  })

  const permitNavigation = useOrderDraftGuard(__formDraftDirty || files.length > 0, submitMutation.isPending || removeInput.isPending)

  if (!canCreate) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Request creation unavailable"} /></AlertTitle><AlertDescription><CustomerSourceText source={"An active organization or Department administrator is required."} /></AlertDescription></Alert></main>
  if (!requestId && (!kitOrderId || !kitCaseId)) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle><CustomerSourceText source={"Choose an included assembly case"} /></AlertTitle><AlertDescription><CustomerSourceText source={"New assembly work belongs to a purchased PSeq Kit. Open the kit order and select Prepare inputs for an available case."} /> <Link to="/reagent-orders" className="underline"><CustomerSourceText source={"Open PSeq Kit orders"} /></Link></AlertDescription></Alert></main>
  if (!requestId && kitOrder.isLoading) return <main className="page-wrap px-4 py-8"><p role="status"><CustomerSourceText source={"Loading the included assembly case…"} /></p></main>
  if (!requestId && (kitOrder.error || !kitCase)) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Assembly case could not be loaded"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(kitOrder.error, 'Return to the kit order and choose an available case.')} />} <Button variant="outline" onClick={() => void kitOrder.refetch()}><CustomerSourceText source={"Retry case"} /></Button></AlertDescription></Alert></main>
  if (!requestId && !savedRequestId && kitCase && !kitCase.canPrepare) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle><CustomerSourceText source={"Case is not available for a new submission"} /></AlertTitle><AlertDescription>{kitCase.assemblyRequestId ? <RecordLink asChild><Link to="/data-assembly/$requestId" params={{ requestId: kitCase.assemblyRequestId }} ><CustomerSourceText source={"Open the saved assembly case"} /></Link></RecordLink> : <BackLink asChild><Link to="/reagent-orders/$orderId" params={{ orderId: kitOrderId! }}><CustomerSourceText source={"Return to the kit order to review shipment, deadline and status"} /></Link></BackLink>}</AlertDescription></Alert></main>
  return <main className="page-wrap px-4 py-8">
    <section className="mb-6 max-w-3xl"><p className="text-sm text-muted-foreground"><BackLink asChild><Link to="/data-assembly" search={previous => previous}><CustomerSourceText source={"Assembly cases"} /></Link></BackLink> / {requestId ? <CustomerSourceText source={"Edit request"} /> : <CustomerSourceText source={"New request"} />}</p><PageTitle className="mt-2">{requestId ? <CustomerSourceText source={"Edit assembly inputs"} /> : <CustomerSourceText source={"Prepare included assembly inputs"} />}</PageTitle><p className="mt-2 text-sm leading-6 text-muted-foreground"><CustomerSourceText source={"Provide the included profile context, upload scientific inputs, and submit a versioned input set for intake validation. Your Partner reference does not identify or transfer ownership to a downstream customer."} /></p></section>
    {includedCase ? <p className="mb-4 text-sm"><BackLink asChild><Link to="/reagent-orders/$orderId" params={{ orderId: kitOrderId ?? existingRequest.data!.kitOrderId! }}><CustomerSourceText source={"Return to Kit order"} /></Link></BackLink> · {includedCase.caseNumber} <CustomerSourceText source={"· Submission deadline"} /> {includedCase.submissionDeadlineAt ? formatDisplayDate(includedCase.submissionDeadlineAt) : <CustomerSourceText source={"set at shipment"} />}</p> : null}
    {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle><CustomerSourceText source={"Submission is paused in mock-session mode"} /></AlertTitle><AlertDescription><CustomerSourceText source={"Connect a real Partner session to upload inputs."} /></AlertDescription></Alert> : null}
    {existingRequest.data && !existingRequest.data.canEdit ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerSourceText source={"Request is no longer editable"} /></AlertTitle><AlertDescription><CustomerSourceText source={"Return to the request to review its current status."} /></AlertDescription></Alert> : null}
    {existingRequest.data?.isIncludedAssembly && !includedCase && !linkedKit.error ? <p role="status"><CustomerSourceText source={"Loading the included profile…"} /></p> : null}
    {submitMutation.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>{savedRequestId ? <CustomerSourceText source={"Draft saved; submission needs attention"} /> : <CustomerSourceText source={"Assembly request was not saved"} />}</AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(submitMutation.error, 'Review the request and try again.')} />}{savedRequestId ? <span className="ml-2"><RecordLink asChild><Link to="/data-assembly/$requestId" params={{ requestId: savedRequestId }} ><CustomerSourceText source={"Open saved draft"} /></Link></RecordLink></span> : null}</AlertDescription></Alert> : null}
    {profiles.error || existingRequest.error || linkedKit.error || removeInput.error ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerSourceText source={"Inputs could not be updated"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(profiles.error ?? existingRequest.error ?? linkedKit.error ?? removeInput.error, 'Retry without leaving your draft.')} />} <Button type="button" variant="outline" onClick={() => { if (!existingRequest.data?.isIncludedAssembly) void profiles.refetch(); if (existingRequest.data?.kitOrderId) void linkedKit.refetch(); if (effectiveRequestId) void existingRequest.refetch() }}><CustomerSourceText source={"Retry"} /></Button></AlertDescription></Alert> : null}
    {includedCase ? <Card className="mb-5"><CardHeader><CardTitle>Kit lot</CardTitle><CardDescription>Your earlier lot submission is reused here. Record the actual kit-use date before submitting assembly inputs.</CardDescription></CardHeader><CardContent className="space-y-4"><KitLotSubmissionSummary submission={includedCase.lotSubmission} />{includedCase.canSubmitLot ? <Button ref={lotSubmissionButton} type="button" variant="outline" disabled={submitMutation.isPending} onClick={() => setLotDialogOpen(true)}>{includedCase.lotSubmission ? 'Update kit lot submission' : 'Submit kit lot'}</Button> : null}</CardContent></Card> : null}
    {lotDialogOpen && includedCase ? <PartnerKitLotDialog key={includedCase.currentKitUnitId} orderId={kitOrderId ?? existingRequest.data!.kitOrderId!} kitCase={includedCase} onClose={() => setLotDialogOpen(false)} restoreFocus={() => lotSubmissionButton.current?.focus()} /> : null}
    <form noValidate onSubmit={form.handleSubmit((values) => submitMutation.mutate({ values, submit: true }))} className="space-y-5">
      <fieldset disabled={submitMutation.isPending} className="contents">
      <RequiredLegend />
      <Card><CardHeader><CardTitle><CustomerSourceText source={"Assembly profile"} /></CardTitle><CardDescription><CustomerSourceText source={"The selected profile version and instructions are frozen in the request."} /></CardDescription></CardHeader><CardContent><Label htmlFor="assemblyProfileId"><RequiredFieldName><CustomerSourceText source={"Profile"} /></RequiredFieldName></Label><NativeSelect id="assemblyProfileId" required aria-invalid={Boolean(form.formState.errors.assemblyProfileId)} aria-describedby={form.formState.errors.assemblyProfileId ? 'assemblyProfileId-error' : undefined} disabled={Boolean(includedCase || existingRequest.data?.isIncludedAssembly)} value={form.watch('assemblyProfileId')} onChange={(event) => { form.setValue('assemblyProfileId', event.target.value, { shouldDirty: true, shouldValidate: true }); setMetadataValues({}) }} className="w-full max-w-xl"><option value=""><CustomerSourceText source={"Select profile"} /></option>{(includedCase ? [includedCase.profile] : profiles.data ?? []).map((profile) => <option key={profile.id} value={profile.id}>{profile.name} v{profile.profileVersion}</option>)}</NativeSelect><ErrorText id="assemblyProfileId-error" message={form.formState.errors.assemblyProfileId?.message} />{selectedProfile ? <Alert className="mt-4"><AlertTitle>{selectedProfile.name} <CustomerSourceText source={"instructions"} /></AlertTitle><AlertDescription><span className="whitespace-pre-wrap">{selectedProfile.instructions}</span>{includedCase ? <p className="mt-3 whitespace-pre-wrap"><CustomerSourceText source={"Included outputs:"} /> {readContract(includedCase.profile.outputContractJson)}</p> : null}</AlertDescription></Alert> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle><CustomerSourceText source={"Project and requested output"} /></CardTitle></CardHeader><CardContent className="space-y-5"><Field label="Partner project or reference" id="projectReference" error={form.formState.errors.projectReference?.message}><Input id="projectReference" required aria-invalid={Boolean(form.formState.errors.projectReference)} aria-describedby={form.formState.errors.projectReference ? 'projectReference-error' : undefined} {...form.register('projectReference')} /></Field>{profileMetadataFields.length ? <div className="grid gap-4 sm:grid-cols-2">{profileMetadataFields.map((field) => <div key={field.name}><Label htmlFor={`metadata-${field.name}`}>{field.required ? <RequiredFieldName>{field.label}</RequiredFieldName> : field.label}</Label>{field.type === 'boolean' ? <NativeSelect id={`metadata-${field.name}`} value={metadataValues[field.name] ?? ''} onChange={(event) => { setMetadataValues((current) => ({ ...current, [field.name]: event.target.value })); form.setValue('projectMetadata', 'Updated profile values', { shouldDirty: true }) }} className="w-full"><option value=""><CustomerSourceText source={"Select"} /></option><option value="true"><CustomerSourceText source={"Yes"} /></option><option value="false">No</option></NativeSelect> : <Input id={`metadata-${field.name}`} type={field.type === 'number' ? 'number' : 'text'} className="mt-2" value={metadataValues[field.name] ?? ''} onChange={(event) => { setMetadataValues((current) => ({ ...current, [field.name]: event.target.value })); form.setValue('projectMetadata', 'Updated profile values', { shouldDirty: true }) }} />}</div>)}</div> : <Field label="Project metadata" id="projectMetadata" required={false} error={form.formState.errors.projectMetadata?.message}><textarea id="projectMetadata" aria-invalid={Boolean(form.formState.errors.projectMetadata)} aria-describedby={form.formState.errors.projectMetadata ? 'projectMetadata-error' : undefined} {...form.register('projectMetadata')} className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></Field>}<Field label="Requested output" id="requestedOutput" error={form.formState.errors.requestedOutput?.message}><textarea id="requestedOutput" required aria-invalid={Boolean(form.formState.errors.requestedOutput)} aria-describedby={form.formState.errors.requestedOutput ? 'requestedOutput-error' : undefined} readOnly={Boolean(includedCase || existingRequest.data?.isIncludedAssembly)} {...form.register('requestedOutput')} className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></Field><div><Label htmlFor="processingNotes"><CustomerSourceText source={"Processing notes"} /></Label><textarea id="processingNotes" aria-invalid={Boolean(form.formState.errors.processingNotes)} aria-describedby={form.formState.errors.processingNotes ? 'processingNotes-error' : undefined} {...form.register('processingNotes')} className="mt-2 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div></CardContent></Card>
      <Card><CardHeader><CardTitle><CustomerSourceText source={"Input files"} /></CardTitle><CardDescription><CustomerSourceText source={"Files are stored with server-generated keys, checksummed, and scanned before submission. Do not upload patient identifiers or PHI."} /></CardDescription></CardHeader><CardContent>
        {existingRequest.data?.inputFiles.length ? <ul aria-label={__customerSource("Saved input files")} className="mb-4 divide-y">{existingRequest.data.inputFiles.map(file => <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="break-all">{file.fileName} · {formatBytes(file.sizeBytes)} <CustomerSourceText source={"· Scan:"} /> {file.scanStatus}</span>{existingRequest.data?.canEdit ? <Button type="button" variant="outline" size="sm" disabled={removeInput.isPending || submitMutation.isPending} onClick={async () => { if ((await confirmPortal(`Remove ${file.fileName} from the current draft? Earlier submitted revisions remain in history.`))) removeInput.mutate(file) }}><CustomerSourceText source={"Remove input"} /></Button> : null}</li>)}</ul> : null}
        {selectedProfile ? <p className="mb-3 text-sm text-muted-foreground"><CustomerSourceText source={"Allowed file types:"} /> {fileKindsText(selectedProfile.allowedFileKindsJson)}<CustomerSourceText source={". Maximum per file:"} /> {formatBytes(selectedProfile.maximumFileSizeBytes)}<CustomerSourceText source={". Maximum total:"} /> {formatBytes(selectedProfile.maximumTotalSizeBytes)}.</p> : null}
        <label className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed p-8 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"><UploadCloud aria-hidden="true" className="mb-2 size-8 text-muted-foreground" /><span className="font-medium"><CustomerSourceText source={"Choose assembly inputs"} /></span><span className="mt-1 text-sm text-muted-foreground"><CustomerSourceText source={"Allowed types and limits come from this case’s profile."} /></span><input type="file" multiple className="sr-only" disabled={submitMutation.isPending} onChange={(event) => { const selectedFiles = Array.from(event.currentTarget.files ?? []); setFiles(previous => [...previous, ...selectedFiles]); event.currentTarget.value = '' }} /></label>{files.length ? <ul className="mt-3 space-y-1 text-sm" aria-live="polite">{files.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name} · {formatBytes(file.size)} <Button type="button" variant="ghost" size="sm" disabled={submitMutation.isPending} onClick={() => setFiles(selected => selected.filter(value => value !== file))}><CustomerSourceText source={"Remove selection"} /></Button></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground" aria-live="polite"><CustomerSourceText source={"No additional files selected."} /></p>}</CardContent></Card>
      <Card><CardHeader><CardTitle><CustomerSourceText source={"Review and submit"} /></CardTitle><CardDescription>{includedCase || existingRequest.data?.isIncludedAssembly ? <CustomerSourceText source={"Submission begins intake validation for the assembly included with your kit. No separate quote or purchase is required."} /> : <CustomerSourceText source={"This historical request retains its original commercial terms."} />}</CardDescription></CardHeader><CardContent><div className="flex cursor-pointer items-start gap-3"><Checkbox id="assemblyProhibitedData" aria-required="true" aria-invalid={Boolean(form.formState.errors.prohibitedDataConfirmed)} aria-describedby={form.formState.errors.prohibitedDataConfirmed ? 'assemblyProhibitedData-error' : undefined} checked={form.watch('prohibitedDataConfirmed')} onCheckedChange={(checked) => form.setValue('prohibitedDataConfirmed', checked === true, { shouldValidate: true, shouldDirty: true })} /><Label htmlFor="assemblyProhibitedData" className="cursor-pointer text-sm font-normal leading-relaxed"><RequiredFieldName><CustomerSourceText source={"I confirm that the metadata, file names, and file contents contain no patient identifiers, PHI, or unnecessary personal data."} /></RequiredFieldName></Label></div><ErrorText id="assemblyProhibitedData-error" message={form.formState.errors.prohibitedDataConfirmed?.message} /></CardContent></Card>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" asChild><Link to={requestId ? '/data-assembly/$requestId' : kitOrderId ? '/reagent-orders/$orderId' : '/data-assembly'} params={requestId ? { requestId } : kitOrderId ? { orderId: kitOrderId } : undefined} search={previous => previous}><CustomerSourceText source={"Cancel"} /></Link></Button><Button type="button" variant="secondary" disabled={!apiEnabled || !profileReady || submitMutation.isPending || removeInput.isPending || (Boolean(requestId) && !existingRequest.data?.canEdit)} onClick={form.handleSubmit((values) => submitMutation.mutate({ values, submit: false }))}>{submitMutation.isPending ? <CustomerSourceText source={"Saving…"} /> : <CustomerSourceText source={"Save draft"} />}</Button><Button type="submit" disabled={!apiEnabled || !profileReady || submitMutation.isPending || removeInput.isPending || (Boolean(requestId) && !existingRequest.data?.canSubmit)}>{submitMutation.isPending ? <CustomerSourceText source={"Uploading and submitting…"} /> : <CustomerSourceText source={"Submit for intake validation"} />}</Button></div>
      </fieldset>
    </form>
  </main>
}

function Field({ label, id, error, children, required = true }: { label: string; id: string; error?: string; required?: boolean; children: React.ReactNode }) { return <div><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label><div className="mt-2">{children}</div><ErrorText id={`${id}-error`} message={error} /></div> }
function ErrorText({ id, message }: { id?: string; message?: string }) { return message ? <p id={id} role="alert" className="mt-1 text-sm text-destructive">{message}</p> : null }
function formatBytes(value: number) { return formatByteSize(value) }
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
