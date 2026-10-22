import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { workflowTones } from '#/features/lab-operations/lab-status'
import { Field as PortalField } from '#/components/ui/field'
import { RecordLink } from '#/components/ui/record-link'
import { useIllustrationUploadPending } from './ProcedureIllustrations'
import { useWorkflowDiscovery } from './configuration-discovery'
import { procedureDetailRoute } from './procedure-navigation'
import { instructionSchema, newInstruction } from './procedure-types'
import { SimpleProcedureEditor } from './SimpleProcedureEditor'
import { ProcedurePresentation } from './ProcedurePresentation'
import { NativeSelect } from '#/components/ui/native-select'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import { Link, useNavigate } from '@tanstack/react-router'

import {
  approveReagentWorkflow, createReagentWorkflow, listReagentWorkflows,
  reagentWorkflowsKey, retireReagentWorkflow, reviseReagentWorkflow,
  type ReagentWorkflow,
} from '#/api/lab-reagent-manufacturing'
import { getLabOperationsError, type LabMaterialDefinition } from '#/api/lab-operations'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { PreparationField, PreparationPanel, prepSelectClass } from './preparation-ui'
import { WorkflowListFilters } from './WorkflowListFilters'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a workflow name.').max(160),
  materialDefinitionId: z.string(),
  outputUnit: z.string().trim().min(1, 'Enter the reagent inventory unit.').max(50),
  steps: z.array(instructionSchema).min(1, 'Add at least one instruction.').max(100),
}).superRefine((value, context) => {
  if (!value.materialDefinitionId) context.addIssue({ code: 'custom', path: ['materialDefinitionId'], message: 'Choose the Phaeno reagent product this workflow makes.' })
})
type WorkflowForm = z.infer<typeof schema>

export function ReagentWorkflowSettings({ canManage, actorId, isPlatformAdmin }: {
  definitions: LabMaterialDefinition[]; canManage: boolean; actorId?: string; isPlatformAdmin: boolean
}) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: reagentWorkflowsKey, queryFn: listReagentWorkflows })
  const navigate = useNavigate()
  const setEditor = (value: 'new' | ReagentWorkflow) => void navigate({ to: procedureDetailRoute, params: { kind: 'reagent', recordId: typeof value === 'string' ? 'new' : value.id }, search: { ...discovery, edit: true } })
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [decision, setDecision] = useState<{ workflow: ReagentWorkflow; action: 'approve' | 'retire' } | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const { discovery, search, setSearch, showInactive, setShowInactive } = useWorkflowDiscovery('reagent')
  const change = useMutation({
    mutationFn: async () => decision?.action === 'approve'
      ? approveReagentWorkflow(decision.workflow, overrideReason || undefined)
      : retireReagentWorkflow(decision!.workflow),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: reagentWorkflowsKey }); setDecision(null); setOverrideReason('') },
  })
  const workflows = query.data ?? []
  const needle = search.trim().toLocaleLowerCase()
  const visibleWorkflows = workflows.filter(workflow => (showInactive || workflow.status !== 'Retired')
    && (!needle || `${workflow.materialName} ${workflow.name}`.toLocaleLowerCase().includes(needle)))

  return <>
    <PreparationPanel title="Reagent manufacturing workflows" description="Each reagent has one workflow identity, with revisions of its ordered steps. Runs use the reagent name and capture the approved revision without a customer sample or tube. A second administrator approves each revision."
      actions={canManage ? <Button type="button" onClick={() => setEditor('new')}><Plus data-icon="inline-start" /> New reagent workflow</Button> : undefined}
      headerContent={<WorkflowListFilters id="reagent-workflow" search={search} onSearchChange={setSearch} showInactive={showInactive} onShowInactiveChange={setShowInactive} />}>
      {query.isPending ? <p role="status">Loading reagent workflows…</p> : null}
      {query.isError ? <div className="space-y-3"><p role="alert">{getLabOperationsError(query.error, 'Reagent workflows could not be loaded.')}</p><Button variant="outline" onClick={() => void query.refetch()}>Reload reagent workflows</Button></div> : null}
      {visibleWorkflows.length ? <ul className="divide-y" aria-label="Reagent workflows">{visibleWorkflows.map(workflow => {
        const displayed = workflow.revisions.find(v => v.status === 'Approved') ?? workflow.revisions[0]
        const actions = canManage ? [
          ...(workflow.status !== 'Retired' ? [{ label: 'Revise workflow', run: () => setEditor(workflow) }] : []),
          ...(workflow.status === 'Draft' ? [{ label: 'Approve workflow', run: () => setDecision({ workflow, action: 'approve' }) }] : []),
          ...(workflow.status === 'Approved' ? [{ label: 'Retire workflow', run: () => setDecision({ workflow, action: 'retire' }) }] : []),
        ] : []
        return <li key={workflow.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0 flex-1 basis-48"><div className="flex flex-wrap items-center gap-2"><RecordLink asChild><Link to={procedureDetailRoute} params={{ kind: 'reagent', recordId: workflow.id }} search={{ ...discovery, revision: displayed.revision }}>{workflow.materialName}</Link></RecordLink><Badge variant="outline">Rev {displayed.revision}</Badge><DomainStatusBadge status={displayed.status} tones={workflowTones}>{displayed.status}</DomainStatusBadge></div><p className="mt-1 text-sm text-muted-foreground">Procedure: {displayed.name} · Unit: {workflow.outputUnit ?? 'not configured'} · {displayed.steps.length} steps</p>{workflow.status === 'Draft' && workflow.revision !== displayed.revision ? <span className="block"><RecordLink asChild><Link to={procedureDetailRoute} params={{ kind: 'reagent', recordId: workflow.id }} search={{ ...discovery, revision: workflow.revision }}>Pending Draft revision {workflow.revision}</Link></RecordLink></span> : null}<details className="mt-2 text-sm"><summary className="cursor-pointer">Procedure revision history</summary><ol className="mt-2 space-y-2">{workflow.revisions.map(revision => <li key={revision.revision} className="rounded-md border p-2"><p className="font-medium">Revision {revision.revision} · {revision.status}{revision.revision < workflow.revision ? ' (historical)' : ''} · {revision.name}</p><ol className="mt-1 list-decimal pl-5">{revision.steps.map(step => <li key={step.key}>{step.name}: {step.instructions}</li>)}</ol></li>)}</ol></details></div><div className="flex items-center gap-2">{actions.length === 1 ? <Button type="button" variant="outline" onClick={actions[0].run}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={`Actions for ${workflow.materialName}`}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end">{actions.map(action => <DropdownMenuItem key={action.label} onSelect={action.run}>{action.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}</div></li>
      })}</ul> : !query.isPending && !query.isError ? <p className="py-8 text-center text-sm text-muted-foreground">{!workflows.length ? 'No reagent workflows yet. Create and approve one before starting reagent manufacturing.' : !showInactive && workflows.every(workflow => workflow.status === 'Retired') && !needle ? 'All reagent workflows are inactive. Select Show inactive to review them.' : 'No reagent workflows match these filters.'}</p> : null}
    </PreparationPanel>
    {decision ? <Dialog open onOpenChange={open => { if (!open && !change.isPending) { setDecision(null); setOverrideReason('') } }}><DialogContent onOpenAutoFocus={e => { e.preventDefault(); cancelRef.current?.focus() }}>
      <DialogHeader><DialogTitle>{decision.action === 'approve' ? 'Approve' : 'Retire'} {decision.workflow.name}?</DialogTitle></DialogHeader><div><DialogDescription>{decision.action === 'approve' ? 'Approval makes this exact revision available for new reagent runs. Existing runs retain their own step snapshot.' : 'Retirement stops new runs. Existing runs and their procedure snapshots remain available.'}</DialogDescription></div>
      {decision.action === 'approve' ? <ProcedurePresentation document={{ name: decision.workflow.name, revision: decision.workflow.revision, status: 'Draft', instructions: decision.workflow.steps }} /> : null}
      {decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && isPlatformAdmin ? <PortalField ><Label htmlFor="reagent-override-reason"><RequiredFieldName>Administrator override reason</RequiredFieldName></Label><Input id="reagent-override-reason" value={overrideReason} onChange={event => setOverrideReason(event.target.value)} maxLength={2000} /><p className="text-xs text-muted-foreground">You authored this revision. Record why independent approval is unavailable.</p></PortalField> : null}
      {decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && !isPlatformAdmin ? <p className="text-sm text-muted-foreground">A different administrator must approve this revision.</p> : null}
      {change.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(change.error, 'The workflow could not be updated.')}</p> : null}
      <RequiredDialogFooter><Button ref={cancelRef} type="button" variant="outline" disabled={change.isPending} onClick={() => setDecision(null)}>Cancel</Button><Button type="button" disabled={change.isPending || decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && (!isPlatformAdmin || !overrideReason.trim())} onClick={() => change.mutate()}>{change.isPending ? 'Saving…' : decision.action === 'approve' ? 'Approve workflow' : 'Retire workflow'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog> : null}
  </>
}

export function ReagentProcedureEditor({ workflow: loadedWorkflow, definitions, onClose }: { workflow?: ReagentWorkflow; definitions: LabMaterialDefinition[]; onClose: () => void }) {
  const [workflow] = useState(loadedWorkflow)
  const client = useQueryClient()
  const imageUploadPending = useIllustrationUploadPending()
  const form = useForm<WorkflowForm>({ resolver: zodResolver(schema), defaultValues: {
    name: workflow?.name ?? '', materialDefinitionId: workflow?.materialDefinitionId ?? '', outputUnit: workflow?.outputUnit ?? '',
    steps: workflow?.steps.map(step => ({ ...step })) ?? [newInstruction()],
  } })
  const __modalGuard = useModalDraftGuard(form.formState.isDirty, form.formState.isSubmitting || imageUploadPending, true, workflow?.name ?? 'the new reagent procedure')

  const materialChoice = form.watch('materialDefinitionId')
  const chosenDefinition = definitions.find(item => item.id === materialChoice)
  const availableDefinitions = definitions.filter(item => item.kind === 'PreparedReagent' && item.supplierProductId && item.defaultQuantityUnit && (workflow
    ? item.id === workflow.materialDefinitionId
    : !client.getQueryData<ReagentWorkflow[]>(reagentWorkflowsKey)?.some(existing => existing.materialDefinitionId === item.id)))
  const save = useMutation({
    mutationFn: (values: WorkflowForm) => {
      const payload = {
        name: values.name.trim(), materialDefinitionId: values.materialDefinitionId,
        newMaterialName: null,
        outputUnit: values.outputUnit.trim(),
        steps: values.steps.map(step => ({ ...step, name: step.name.trim(), instructions: step.instructions.trim() })),
        version: workflow?.version,
      }
      return workflow ? reviseReagentWorkflow(workflow.id, payload) : createReagentWorkflow(payload)
    },
    onSuccess: async () => {
    __modalGuard.allowNavigation()
 await Promise.all([client.invalidateQueries({ queryKey: reagentWorkflowsKey }), client.invalidateQueries({ queryKey: ['lab-operations'] })]); onClose() },
  })
  return <section className="space-y-5"><form className="space-y-5" noValidate onSubmit={form.handleSubmit(values => { if (!imageUploadPending) save.mutate(values) })}>
    <header><h2 className="text-2xl font-semibold">{workflow ? `Revise ${workflow.materialName}` : 'Configure reagent manufacturing'}</h2><p className="mt-2 text-sm text-muted-foreground">Choose a Phaeno reagent product and define its ordered, sample-independent procedure. Its product supplies the inventory unit. Each reagent keeps one workflow identity with revisions.</p></header>
    <div className="min-w-0 space-y-4">
      <PreparationField id="reagent-workflow-material" label="Reagent product" required error={form.formState.errors.materialDefinitionId?.message}><NativeSelect id="reagent-workflow-material" className={prepSelectClass} {...form.register('materialDefinitionId', { onChange: event => form.setValue('outputUnit', definitions.find(item => item.id === event.target.value)?.defaultQuantityUnit ?? '') })}><option value="">Select reagent…</option>{availableDefinitions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></PreparationField>
      {!availableDefinitions.length ? <p className="text-sm text-muted-foreground">No available Phaeno reagent products. <Link className="text-primary underline" to="/purchasing" search={{ section: 'products' }}>Define one in Purchasing → Products</Link> before creating its workflow.</p> : null}
      <PreparationField id="reagent-workflow-unit" label="Reagent inventory unit" required error={form.formState.errors.outputUnit?.message}><Input id="reagent-workflow-unit" maxLength={50} placeholder="Select a reagent product" readOnly {...form.register('outputUnit')} /></PreparationField>
      <p className="text-xs text-muted-foreground">{chosenDefinition ? `This product is tracked in ${chosenDefinition.defaultQuantityUnit}. Enter the actual amount produced when the run is complete.` : 'The selected Phaeno product sets the unit for every manufactured lot.'}</p>
      <PreparationField id="reagent-workflow-name" label="Procedure name" required error={form.formState.errors.name?.message}><Input id="reagent-workflow-name" maxLength={160} {...form.register('name')} /></PreparationField>
      <SimpleProcedureEditor context="reagent" instructions={form.watch('steps')} onChange={value => form.setValue('steps', value, { shouldDirty: true, shouldValidate: true })} disabled={save.isPending || imageUploadPending} />
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Review overview and bench instructions</summary><div className="mt-4"><ProcedurePresentation document={{ name: form.watch('name') || 'Reagent procedure draft', revision: 'Unsaved draft', status: 'Draft', instructions: form.watch('steps') }} /></div></details>
      {Object.keys(form.formState.errors).length ? <p role="alert" className="text-sm text-destructive">Complete the required product, instruction and illustration fields.</p> : null}
      {save.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(save.error, 'The workflow could not be saved.')}</p> : null}
    </div>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={save.isPending || imageUploadPending} onClick={() => { void __modalGuard.close(() => { __modalGuard.allowNavigation(); onClose() }) }}>Cancel</Button><Button type="submit" disabled={imageUploadPending || save.isPending}>{save.isPending ? 'Saving…' : workflow ? 'Save new revision' : 'Create draft'}</Button></RequiredDialogFooter>
  </form></section>
}
