import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker, useNavigate, useRouterState } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getLabSteps, createLabStep, saveLabStepVersion, transitionLabStep, type LabStep, type LabStepVersion } from '#/api/lab-steps'
import { getLabOperationsError } from '#/api/lab-operations'
import { usePhaenoSession } from '#/features/auth/session-context'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardAction } from '#/components/ui/card'
import { RequiredLegend } from '#/components/ui/required-field'
import { PreparationActions, PreparationFormDialog, PreparationField } from './preparation-ui'
import { ProtocolStepEditor } from './ProtocolStepEditor'
import { ConfigurationPreview } from './ConfigurationPreview'
import { createEmptyProtocolStep, deserializeProtocolDefinition, serializeProtocolDefinition, protocolDefinitionFormSchema, type ProtocolDefinition, type ProtocolDefinitionFormValues } from './protocol-definition'

function useStepCatalog() {
  const { session, authProvider } = usePhaenoSession()
  return useQuery({ queryKey: ['lab-steps'], queryFn: getLabSteps, enabled: Boolean(session?.capabilities.canManageLabOperations) && authProvider !== 'mock' })
}
export function LabStepList() {
  const { session } = usePhaenoSession()
  const query = useStepCatalog()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [create, setCreate] = useState(false)
  const listState = useRouterState({ select: state => state.location.search as { labStepSearch?: string; labStepRetired?: boolean; labStepPage?: number } })
  const search = listState.labStepSearch ?? ''
  const retired = listState.labStepRetired ?? false
  const requestedPage = listState.labStepPage ?? 1
  const updateList = (patch: typeof listState) => void navigate({ to: '/lab-operations', search: previous => ({ ...labStepListSearch(previous), ...patch }), replace: true, resetScroll: false })
  const mutation = useMutation({ mutationFn: createLabStep, onSuccess: async step => {
    await client.invalidateQueries({ queryKey: ['lab-steps'] }); setCreate(false)
    await navigate({ to: '/lab-operations/steps/$stepId', params: { stepId: step.id }, search: labStepListSearch })
  } })
  const items = query.data?.filter(s => (retired || !s.retiredAtUtc) && `${s.name} ${s.key}`.toLowerCase().includes(search.toLowerCase())) ?? []
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(items.length / 10)))
  return <Card><CardHeader><CardTitle>Lab steps</CardTitle><CardDescription>Reusable, independently approved procedures. Protocols pin exact versions.</CardDescription>{session?.capabilities.canManageLabProtocols ? <CardAction><Button onClick={() => setCreate(true)}>Create Lab step</Button></CardAction> : null}</CardHeader><CardContent className="space-y-4">
    <PreparationField label="Find Lab steps" id="find-lab-steps"><Input id="find-lab-steps" value={search} onChange={e => { updateList({ labStepSearch: e.target.value, labStepPage: 1 }) }} /></PreparationField>
    <label className="flex cursor-pointer gap-2 text-sm"><input type="checkbox" checked={retired} onChange={e => { updateList({ labStepRetired: e.target.checked, labStepPage: 1 }) }} />Show retired</label>
    {query.isLoading ? <p role="status">Loading Lab steps…</p> : query.error ? <p role="alert">{getLabOperationsError(query.error, 'Lab steps could not be loaded.')}</p> : !items.length ? <p>No Lab steps match. Create a step to begin.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Lab step</th><th className="p-2">Latest version</th><th className="p-2">Status</th></tr></thead><tbody>{items.slice((page - 1) * 10, page * 10).map(s => <tr key={s.id} className="border-t"><td className="p-2"><Link className="underline" to="/lab-operations/steps/$stepId" params={{ stepId: s.id }} search={labStepListSearch}>{s.name}</Link></td><td className="p-2">{s.latestVersion || 'Not authored'}</td><td className="p-2">{s.retiredAtUtc ? 'Retired' : s.versions.at(-1)?.status ?? 'No draft'}</td></tr>)}</tbody></table></div>}
    {items.length > 10 ? <div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => updateList({ labStepPage: page - 1 })}>Previous</Button><span>Page {page} of {Math.ceil(items.length / 10)}</span><Button variant="outline" disabled={page * 10 >= items.length} onClick={() => updateList({ labStepPage: page + 1 })}>Next</Button></div> : null}
    {create ? <PreparationFormDialog title="Create Lab step" description="Create a reusable procedure identity. Its draft must be approved before a protocol can select it." fields={[{ key: 'name', label: 'Name', required: true }, { key: 'description', label: 'Description', type: 'textarea' }]} pending={mutation.isPending} error={mutation.error ? getLabOperationsError(mutation.error, 'The Lab step could not be created.') : undefined} submitLabel="Create Lab step" onClose={() => setCreate(false)} onSubmit={v => mutation.mutate({ name: v.name, description: v.description })} /> : null}
  </CardContent></Card>
}

export function LabStepPage({ stepId, editing = false }: { stepId: string; editing?: boolean }) {
  const query = useStepCatalog()
  const { session } = usePhaenoSession()
  const step = query.data?.find(s => s.id === stepId)
  return <main className="page-wrap space-y-5 px-4 py-8">
    <Link className="underline" to="/lab-operations" search={labStepListSearch}>Back to Lab steps</Link>
    {query.isLoading ? <p role="status">Loading Lab step…</p> : query.error ? <p role="alert">{getLabOperationsError(query.error, 'The Lab step could not be loaded.')}</p> : !step ? <p>Lab step not found or unavailable to this session.</p> : editing ? session?.capabilities.canManageLabProtocols && !step.retiredAtUtc ? <LabStepEditor key={stepId} step={step} /> : <p>Step authoring is unavailable.</p> : <LabStepDetails step={step} />}
  </main>
}

function LabStepDetails({ step }: { step: LabStep }) {
  const { session } = usePhaenoSession()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<LabStepVersion>()
  const [transition, setTransition] = useState<{ action: string; version?: LabStepVersion }>()
  const canManage = Boolean(session?.capabilities.canManageLabProtocols)
  const mutation = useMutation({ mutationFn: (values: Record<string, string>) => transitionLabStep(step.id, {
    action: transition!.action, version: step.version, versionId: transition?.version?.id,
    reason: values.reason, ...(values.override ? { approvalOverrideReason: values.override } : {}),
  }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['lab-steps'] }); setTransition(undefined) }, onError: () => { void client.invalidateQueries({ queryKey: ['lab-steps'] }) } })
  const selfApproval = transition?.action === 'approve' && transition.version?.authoredByUserId === session?.user?.id
  return <>
    <Card><CardHeader><CardTitle>{step.name}</CardTitle><CardDescription>{step.description || step.key}{step.retiredAtUtc ? ` · Retired: ${step.retirementReason}` : ''}</CardDescription>{canManage && !step.retiredAtUtc ? <CardAction><PreparationActions items={[
      { label: step.versions.some(v => v.status === 'Draft') ? 'Edit draft' : 'New version', onClick: () => void navigate({ to: '/lab-operations/steps/$stepId/edit', params: { stepId: step.id }, search: labStepListSearch }) },
      { label: 'Retire Lab step', onClick: () => setTransition({ action: 'retire' }) },
    ]} /></CardAction> : null}</CardHeader><CardContent className="space-y-4">
      {!step.versions.length ? <p>No version has been authored.</p> : [...step.versions].reverse().map(v => <section key={v.id} className="space-y-3 rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><h2 className="font-medium">Version {v.stepVersion} · {v.status}</h2><PreparationActions items={[
        { label: 'Configuration preview', onClick: () => setPreview(v) },
        ...(canManage && !step.retiredAtUtc && v.status === 'Draft' ? [
          { label: 'Edit draft', onClick: () => void navigate({ to: '/lab-operations/steps/$stepId/edit', params: { stepId: step.id }, search: labStepListSearch }) },
          { label: 'Approve version', onClick: () => setTransition({ action: 'approve', version: v }), disabled: v.authoredByUserId === session?.user?.id && !session?.isPlatformAdmin },
          { label: 'Discard draft', onClick: () => setTransition({ action: 'discard', version: v }) },
        ] : []),
      ]} /></div><p className="text-sm">{v.status === 'Draft' ? 'Requires independent approval. A platform administrator may record an explicit override.' : `Approved ${v.approvedAtUtc?.slice(0, 10) ?? '—'}`}</p>{v.approvalOverrideReason ? <p className="text-sm">Approval override: {v.approvalOverrideReason}</p> : null}<LabStepSummary version={v} /></section>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Used by protocols</CardTitle><CardDescription>Each occurrence retains its own identity and step records. New versions are adopted explicitly in a protocol draft.</CardDescription></CardHeader><CardContent className="space-y-2">{step.usedBy.length ? step.usedBy.map(u => <p key={`${u.protocolVersionId}-${u.occurrenceKey}`} className="text-sm">{u.protocolName} v{u.protocolVersion} · {u.status} · {u.occurrenceKey} · Lab step v{step.versions.find(v => v.id === u.stepVersionId)?.stepVersion}{step.versions.some(v => v.status === 'Approved' && v.stepVersion > (step.versions.find(x => x.id === u.stepVersionId)?.stepVersion ?? 0)) ? ' · Newer approved version available' : ''}</p>) : <p>No protocol references this Lab step.</p>}</CardContent></Card>
    {preview ? <ConfigurationPreview definition={JSON.parse(preview.definitionJson) as ProtocolDefinition} name={`${step.name} v${preview.stepVersion} · ${preview.status}`} onClose={() => setPreview(undefined)} /> : null}
    {transition ? <PreparationFormDialog title={`${transition.action === 'approve' ? 'Approve' : transition.action === 'retire' ? 'Retire' : 'Discard draft of'} ${step.name}`} description={transition.action === 'retire' ? `Prevents new selection. ${step.usedBy.length} retained protocol occurrences and all execution history remain unchanged.` : transition.action === 'approve' ? 'Review the instructions, fields and QC criteria. Approval locks this version; assembled protocols require separate approval.' : 'The draft is retained as discarded and can no longer be edited.'} fields={[
      ...(transition.action === 'retire' ? [{ key: 'reason', label: 'Retirement reason', type: 'textarea' as const, required: true }] : []),
      ...(selfApproval ? [{ key: 'override', label: 'Administrator approval override reason', type: 'textarea' as const, required: true }] : []),
      { key: 'confirm', label: 'I reviewed this version and confirm this action', type: 'checkbox', required: true },
    ]} pending={mutation.isPending} error={mutation.error ? getLabOperationsError(mutation.error, 'The action could not be completed. Review the current version and retry.') : undefined} onClose={() => { setTransition(undefined); mutation.reset() }} onSubmit={v => mutation.mutate(v)} submitLabel={transition.action === 'approve' ? 'Approve version' : transition.action === 'retire' ? 'Retire Lab step' : 'Discard draft'} /> : null}
  </>
}

function LabStepEditor({ step }: { step: LabStep }) {
  const leaveApproved = useRef(false)
  const client = useQueryClient()
  const navigate = useNavigate()
  const draft = step.versions.find(v => v.status === 'Draft')
  const [source] = useState(() => draft ?? step.versions.filter(v => v.status === 'Approved').at(-1))
  const [expectedVersion] = useState(step.version)
  const [preview, setPreview] = useState<ProtocolDefinition>()
  const [discard, setDiscard] = useState(false)
  const initial = source ? deserializeProtocolDefinition(source.definitionJson) : { preparationBatchEnabled: true, steps: [{ ...createEmptyProtocolStep(), name: step.name }] }
  const form = useForm<ProtocolDefinitionFormValues>({ resolver: zodResolver(protocolDefinitionFormSchema), defaultValues: initial ?? undefined })
  const mutation = useMutation({ mutationFn: (values: ProtocolDefinitionFormValues) => saveLabStepVersion(step.id, { definitionJson: serializeProtocolDefinition(values), version: expectedVersion, draftId: draft?.id }), onSuccess: async () => { leaveApproved.current = true; await client.invalidateQueries({ queryKey: ['lab-steps'] }); await leave() } })
  useBlocker({ shouldBlockFn: () => !leaveApproved.current && (mutation.isPending || form.formState.isDirty && !window.confirm('Discard unsaved Lab step changes?')), enableBeforeUnload: false })
  const leave = () => navigate({ to: '/lab-operations/steps/$stepId', params: { stepId: step.id }, search: labStepListSearch })
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (form.formState.isDirty && !mutation.isSuccess) { event.preventDefault(); event.returnValue = '' } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [form.formState.isDirty, mutation.isSuccess])
  if (!initial) return <p role="alert">This definition cannot be opened safely. Return without changing it.</p>
  return <>
    <h1 className="text-2xl font-semibold">{step.name} · {draft ? `Edit draft v${draft.stepVersion}` : `New version ${step.latestVersion + 1}`}</h1>
    <p className="text-sm text-muted-foreground">Instructions and the scope of each entry belong to this step. Required/conditional placement belongs to each protocol occurrence.</p>
    {mutation.error ? <p role="alert" className="text-destructive">{getLabOperationsError(mutation.error, 'The draft could not be saved. Your entries are retained; return and reopen if the version changed.')}</p> : null}
    <form noValidate className="space-y-4" onSubmit={form.handleSubmit(v => mutation.mutate(v))}>
      <RequiredLegend /><ProtocolStepEditor catalog form={form} index={0} total={1} onMoveUp={() => {}} onMoveDown={() => {}} onDuplicate={() => {}} onRemove={() => {}} onPreview={() => setPreview(JSON.parse(serializeProtocolDefinition(form.getValues())) as ProtocolDefinition)} />
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => form.formState.isDirty ? setDiscard(true) : void leave()}>Cancel</Button><Button type="submit" disabled={mutation.isPending || Boolean(draft) && !form.formState.isDirty}>{mutation.isPending ? 'Saving…' : 'Save draft'}</Button></div>
    </form>
    {preview ? <ConfigurationPreview definition={preview} name={`${step.name} · Unsaved draft`} onClose={() => setPreview(undefined)} /> : null}
    {discard ? <PreparationFormDialog title="Discard unsaved changes?" description="The previously saved configuration remains unchanged." fields={[]} pending={false} submitLabel="Discard changes" onClose={() => setDiscard(false)} onSubmit={() => { leaveApproved.current = true; void leave() }} /> : null}
  </>
}

function LabStepSummary({ version }: { version: LabStepVersion }) {
  const definition = deserializeProtocolDefinition(version.definitionJson)?.steps[0]
  if (!definition) return <p role="alert">The stored definition cannot be displayed.</p>
  return <details><summary className="cursor-pointer">Instructions and fields to record</summary><div className="mt-3 space-y-3 text-sm">
    <p className="whitespace-pre-wrap">{definition.instructions}</p>
    <dl className="space-y-2">{definition.captures.map((c, i) => <div key={c.key ?? i}><dt className="font-medium">{c.label}{c.required ? ' · Required' : ' · Optional'}</dt><dd>{c.type} · {c.scope ?? 'Individual'}{c.unit ? ` · ${c.unit}` : ''}{c.material ? ` · ${c.material.name}${c.material.vendor ? ` · ${c.material.vendor}` : ''}${c.material.productNumber ? ` · ${c.material.productNumber}` : ''}` : ''}{c.type === 'material' ? ` · ${c.quantityBasis === 'total' ? 'Total batch quantity' : 'Quantity per sample'} · ${c.includeTracking ? 'Lot number included' : 'Configured material'} ` : ''}{c.type === 'equipment' ? ` · ${c.includeTracking ? 'Equipment barcode included' : 'Equipment name'}` : ''}{c.choices ? ` · ${c.choices}` : ''}</dd></div>)}</dl>
    <p>Inputs: {definition.inputMaterials || 'None'}<br />Equipment: {definition.equipmentTypes || 'None'}<br />Outputs: {definition.preparedOutputs || 'None'}</p>
    {definition.attachmentKind && definition.attachmentKind !== 'none' ? <p>{definition.attachmentRequired ? 'Required' : 'Optional'} PDF: {definition.attachmentKind === 'qc' ? 'QC report' : 'Preparation report or worksheet'}</p> : null}
    {definition.qcEnabled ? <p>QC ({definition.qcScope}): {definition.qcCriteria}</p> : null}
    <p>Role: {definition.requiredRole || 'Authorized laboratory staff'} · {definition.repeatable ? 'Repeat permitted' : 'Not repeatable'} · {definition.operatorConfirmation ? 'Operator confirmation required' : 'No additional operator confirmation'}</p>
  </div></details>
}

function labStepListSearch(previous: { labStepSearch?: string; labStepRetired?: boolean; labStepPage?: number }) {
  return { section: 'protocols' as const, configurationTab: 'steps' as const, labStepSearch: previous.labStepSearch, labStepRetired: previous.labStepRetired, labStepPage: previous.labStepPage }
}
