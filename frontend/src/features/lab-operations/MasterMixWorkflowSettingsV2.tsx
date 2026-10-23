import { SectionPanel } from '#/components/ui/section-panel'
import { LoadingState } from '#/components/ui/content-state'
import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { workflowTones } from '#/features/lab-operations/lab-status'
import { RequiredLegend } from '#/components/ui/required-field'
import { RecordLink } from '#/components/ui/record-link'
import { BackLink } from '#/components/ui/back-link'
import { useIllustrationUploadPending } from './ProcedureIllustrations'
import { useWorkflowDiscovery } from './configuration-discovery'
import { procedureDetailRoute } from './procedure-navigation'
import { Link, useNavigate } from '@tanstack/react-router'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import {
  approveMasterMixWorkflow, createMasterMixWorkflow, listMasterMixWorkflows, masterMixWorkflowsKey,
  retireMasterMixWorkflow, reviseMasterMixWorkflow, type MasterMixWorkflow, type MasterMixWorkflowRevision,
} from '#/api/lab-master-mix'
import { getLabOperationsError } from '#/api/lab-operations'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { PreparationField, PreparationPanel } from './preparation-ui'
import { combinedDecimalQuantity, isMasterMixDecimalQuantity } from './decimal-quantity'
import { ProtocolStepEditor } from './ProtocolStepEditor'
import { ProcedureSequence } from './ProcedureSequence'
import { ProcedureLibraryPicker } from './ProcedureLibraryPicker'
import { ProcedurePresentation } from './ProcedurePresentation'
import { createEmptyProtocolStep, deserializeSavedProcedure, deserializeProtocolDefinition, serializeProtocolDefinition, protocolDefinitionFormSchema, type ProtocolDefinitionFormValues, type ProtocolDefinition } from './protocol-definition'
import type { MasterMixStep, MasterMixRecipeIngredient } from '#/api/lab-master-mix'
import { WorkflowListFilters } from './WorkflowListFilters'


function ProcedureReview({ revision }: { revision: MasterMixWorkflowRevision }) {
  return <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3 text-sm">
    <p className="font-medium">Revision {revision.revision} · {revision.name} · mix unit {revision.quantityUnit}</p>
    <div><p className="font-medium">Required ingredients</p><ul className="list-disc pl-5">{revision.ingredients.map(item => <li key={`${item.productId ?? item.materialDefinitionId}:${item.quantityUnit}`}>{item.name}: {item.quantityText} {item.quantityUnit}</li>)}</ul></div>
    <ProcedurePresentation document={{ name: revision.name, revision: revision.revision, status: revision.status, approvedAtUtc: revision.approvedAtUtc, instructions: revision.steps }} />
  </div>
}

export function MasterMixWorkflowSettings({ canManage, actorId, isPlatformAdmin }: { canManage: boolean; actorId?: string; isPlatformAdmin: boolean }) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: masterMixWorkflowsKey, queryFn: listMasterMixWorkflows })
  const navigate = useNavigate()
  const setEditor = (value: 'new' | MasterMixWorkflow) => void navigate({ to: procedureDetailRoute, params: { kind: 'masterMix', recordId: typeof value === 'string' ? 'new' : value.id }, search: { ...discovery, edit: true } })
  const [decision, setDecision] = useState<{ workflow: MasterMixWorkflow; action: 'approve' | 'retire' } | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const decisionCancel = useRef<HTMLButtonElement>(null)
  const { discovery, search, setSearch, showInactive, setShowInactive } = useWorkflowDiscovery('master-mix')
  const change = useMutation({
    mutationFn: () => decision!.action === 'approve'
      ? approveMasterMixWorkflow(decision!.workflow, overrideReason || undefined)
      : retireMasterMixWorkflow(decision!.workflow),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: masterMixWorkflowsKey }),
        client.invalidateQueries({ queryKey: ['lab-preparation'] }),
      ])
      setDecision(null); setOverrideReason('')
    },
  })
  const workflows = query.data ?? []
  const needle = search.trim().toLocaleLowerCase()
  const visibleWorkflows = workflows.filter(workflow => (showInactive || workflow.status !== 'Retired')
    && (!needle || workflow.name.toLocaleLowerCase().includes(needle)))
  return <>
    <PreparationPanel title="Master-mix workflows" description="Write and approve the complete procedure. Planned reagent amounts define its recipe." actions={canManage ? <Button type="button" onClick={() => setEditor('new')}><Plus data-icon="inline-start" /> New master-mix workflow</Button> : undefined} headerContent={<WorkflowListFilters id="master-mix-workflow" search={search} onSearchChange={setSearch} showInactive={showInactive} onShowInactiveChange={setShowInactive} />}>
      {query.isPending ? <LoadingState  label={<>Loading master-mix workflows…</>} /> : null}
      {query.isError ? <div className="space-y-3"><p role="alert">{getLabOperationsError(query.error, 'Master-mix workflows could not be loaded.')}</p><Button type="button" variant="outline" onClick={() => void query.refetch()}>Retry</Button></div> : null}
      {visibleWorkflows.length ? <ul className="divide-y" aria-label="Master-mix workflows">{visibleWorkflows.map(workflow => {
        const displayed = workflow.revisions.find(v => v.status === 'Approved') ?? workflow.revisions[0]
        const actions = canManage ? [
          ...(workflow.status !== 'Retired' ? [{ label: 'Revise workflow', run: () => setEditor(workflow) }] : []),
          ...(workflow.status === 'Draft' ? [{ label: 'Approve workflow', run: () => setDecision({ workflow, action: 'approve' as const }) }] : []),
          ...(workflow.status !== 'Retired' && workflow.revisions.some(v => v.status === 'Approved') ? [{ label: 'Retire workflow', run: () => setDecision({ workflow, action: 'retire' as const }) }] : []),
        ] : []
        return <li key={workflow.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="min-w-0 flex-1 basis-48"><div className="flex flex-wrap items-center gap-2"><RecordLink asChild><Link to={procedureDetailRoute} params={{ kind: 'masterMix', recordId: workflow.id }} search={{ ...discovery, revision: displayed.revision }}>{displayed.name}</Link></RecordLink><Badge variant="outline">Rev {displayed.revision}</Badge><DomainStatusBadge status={displayed.status} tones={workflowTones}>{displayed.status}</DomainStatusBadge></div><p className="mt-1 text-sm text-muted-foreground">{displayed.quantityUnit} · {displayed.ingredients.length} ingredients · {displayed.steps.length} steps</p>
            {workflow.status === 'Draft' && workflow.revision !== displayed.revision ? <span className="block"><RecordLink asChild><Link to={procedureDetailRoute} params={{ kind: 'masterMix', recordId: workflow.id }} search={{ ...discovery, revision: workflow.revision }}>Pending Draft revision {workflow.revision}</Link></RecordLink></span> : null}
            <details className="mt-2 text-sm"><summary className="cursor-pointer">Procedure revision history</summary><div className="mt-2 space-y-2">{workflow.revisions.map(revision => <ProcedureReview key={revision.revision} revision={revision} />)}</div></details>
          </div>
          <div className="flex items-center gap-2">{actions.length === 1 ? <Button type="button" variant="outline" onClick={actions[0].run}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={`Actions for ${workflow.name}`}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end">{actions.map(action => <DropdownMenuItem key={action.label} onSelect={action.run}>{action.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}</div>
        </li>
      })}</ul> : !query.isPending && !query.isError ? <p className="py-8 text-center text-sm text-muted-foreground">{!workflows.length ? 'No master-mix workflows yet.' : !showInactive && workflows.every(workflow => workflow.status === 'Retired') && !needle ? 'All master-mix workflows are inactive. Select Show inactive to review them.' : 'No master-mix workflows match these filters.'}</p> : null}
    </PreparationPanel>
    {decision ? <Dialog open onOpenChange={open => { if (!open && !change.isPending) setDecision(null) }}><DialogContent className="max-w-2xl" onOpenAutoFocus={event => { event.preventDefault(); decisionCancel.current?.focus() }}>
      <DialogHeader><DialogTitle>{decision.action === 'approve' ? 'Approve' : 'Retire'} {decision.workflow.name}?</DialogTitle></DialogHeader><div><DialogDescription>{decision.action === 'approve' ? 'Review the exact recipe and procedure before approving this revision.' : 'Retirement stops new mix preparations and new library trays using this recipe. Open trays may use already Ready mixes until each mix’s local-day cutoff. Review their remaining amounts and complete those uses before the cutoff. Retirement is blocked while an active approved protocol selects this workflow.'}</DialogDescription></div>
      {decision.action === 'approve' ? <ProcedureReview revision={decision.workflow.revisions.find(item => item.revision === decision.workflow.revision)!} /> : null}
      {decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && isPlatformAdmin ? <PreparationField id="mix-workflow-override" label="Administrator override reason" required><Input id="mix-workflow-override" maxLength={2000} value={overrideReason} onChange={event => setOverrideReason(event.target.value)} /></PreparationField> : null}
      {decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && !isPlatformAdmin ? <p>A different administrator must approve this revision.</p> : null}
      {change.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(change.error, 'The workflow could not be updated.')}</p> : null}
      <RequiredDialogFooter><Button ref={decisionCancel} type="button" variant="outline" disabled={change.isPending} onClick={() => setDecision(null)}>Cancel</Button><Button type="button" disabled={change.isPending || decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && (!isPlatformAdmin || !overrideReason.trim())} onClick={() => change.mutate()}>{change.isPending ? 'Saving…' : decision.action === 'approve' ? 'Approve workflow' : 'Retire workflow'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog> : null}
  </>
}

function deriveRecipe(steps: MasterMixStep[]): MasterMixRecipeIngredient[] | null {
  const ingredients = new Map<string, MasterMixRecipeIngredient>()
  for (const step of steps) for (const field of step.captures.filter(field => field.type === 'material')) {
    const key = `${field.material?.productId ?? field.material?.materialDefinitionId}:${field.unit}`
    const previous = ingredients.get(key)
    const amount = previous ? combinedDecimalQuantity(previous.quantityText, field.plannedQuantityText ?? '') : field.plannedQuantityText
    if (!amount || !isMasterMixDecimalQuantity(amount)) return null
    ingredients.set(key, { materialDefinitionId: field.material?.materialDefinitionId ?? null, productId: field.material?.productId ?? null, name: field.material?.name ?? field.label, quantity: 0, quantityText: amount, quantityUnit: field.unit ?? '' })
  }
  return [...ingredients.values()]
}

export function MasterMixProcedureEditor({ workflow: loadedWorkflow, onClose }: { workflow?: MasterMixWorkflow; onClose: () => void }) {
  const [workflow] = useState(loadedWorkflow)
  const client = useQueryClient()
  const imageUploadPending = useIllustrationUploadPending()
  const [name, setName] = useState(workflow?.name ?? '')
  const [quantityUnit, setQuantityUnit] = useState(workflow?.quantityUnit ?? 'µL')
  const [metaError, setMetaError] = useState('')
  const initial = workflow ? deserializeSavedProcedure(JSON.stringify({ schemaVersion: 1, preparationBatchEnabled: true, steps: workflow.steps })) : null
  const empty = () => ({ ...createEmptyProtocolStep(), processType: 'masterMix' as const, attachmentKind: 'none' as const, qcScope: 'batch' as const })
  const form = useForm<ProtocolDefinitionFormValues>({ resolver: zodResolver(protocolDefinitionFormSchema), defaultValues: initial ?? { preparationBatchEnabled: true, steps: [empty()] } })
  const steps = useFieldArray({ control: form.control, name: 'steps' })
  const values = form.watch()
  const guard = useModalDraftGuard(form.formState.isDirty || name !== (workflow?.name ?? '') || quantityUnit !== (workflow?.quantityUnit ?? 'µL'), form.formState.isSubmitting || imageUploadPending, true, workflow?.name ?? 'the new master-mix procedure')
  const definition = JSON.parse(serializeProtocolDefinition(values)) as ProtocolDefinition
  const recipe = deriveRecipe(definition.steps)
  const save = useMutation({ mutationFn: (value: ProtocolDefinitionFormValues) => {
    if (!name.trim() || name.trim().length > 160 || !quantityUnit.trim() || quantityUnit.length > 50) throw new Error('Enter a master-mix name and amount unit.')
    const payload = { name: name.trim(), quantityUnit: quantityUnit.trim(), steps: (JSON.parse(serializeProtocolDefinition(value)) as ProtocolDefinition).steps }
    return workflow ? reviseMasterMixWorkflow(workflow, payload) : createMasterMixWorkflow(payload)
  }, onSuccess: async () => { guard.allowNavigation(); await client.invalidateQueries({ queryKey: masterMixWorkflowsKey }); onClose() } })
  if (workflow && !initial) return <section role="alert" className="space-y-3"><p>This saved procedure could not be read. Its instructions have not been replaced. Return to workflows and refresh before editing.</p><BackLink onClick={onClose}>Back to workflows</BackLink></section>
  return <section className="min-w-0 space-y-5"><header><h2 className="text-2xl font-semibold">{workflow ? `Revise ${workflow.name}` : 'New master-mix procedure'}</h2><p className="mt-2 text-sm text-muted-foreground">Write the complete procedure here. Required reagent fields and exact planned amounts define the recipe; approval reviews the whole revision.</p></header>
    <form className="space-y-5" noValidate onSubmit={form.handleSubmit(value => { if (imageUploadPending) return; setMetaError(''); if (!name.trim() || !quantityUnit.trim()) { setMetaError('Enter the master-mix name and amount unit.'); return } save.mutate(value) })}>
      <PreparationField id="mix-workflow-name" label="Master-mix name" required><Input id="mix-workflow-name" value={name} maxLength={160} onChange={e => setName(e.target.value)} /></PreparationField>
      <PreparationField id="mix-workflow-unit" label="Mix amount unit" required><Input id="mix-workflow-unit" value={quantityUnit} maxLength={50} onChange={e => setQuantityUnit(e.target.value)} /></PreparationField>
      <ProcedureLibraryPicker context="masterMix" remaining={100 - steps.fields.length} onInsert={(source, selected) => { const copied = source.steps.filter((_, i) => selected === null || i === selected).map(step => ({ ...step, key: `step-${crypto.randomUUID()}`, labStepVersionId: undefined, copiedFrom: { kind: source.kind, recordId: source.recordId, revision: source.revision, stepKey: step.key } })); const imported = deserializeProtocolDefinition(JSON.stringify({ schemaVersion: 1, preparationBatchEnabled: true, steps: copied })); if (imported) steps.append(imported.steps) }} />
      <ProcedureSequence items={steps.fields.map((step, i) => ({ id: step.id, title: values.steps[i]?.name ?? '', summary: values.steps[i]?.instructions, invalid: Boolean(form.formState.errors.steps?.[i]) }))} onMove={steps.move}>{(index, moveInstruction) => <ProtocolStepEditor key={steps.fields[index].id} form={form} index={index} total={steps.fields.length} onMoveUp={() => moveInstruction(index, index - 1)} onMoveDown={() => moveInstruction(index, index + 1)} onDuplicate={() => steps.insert(index + 1, { ...structuredClone(form.getValues(`steps.${index}`)), key: `step-${crypto.randomUUID()}` })} onRemove={() => steps.remove(index)} />}</ProcedureSequence>
      <Button type="button" variant="outline" disabled={imageUploadPending || steps.fields.length >= 100} onClick={() => steps.append(empty())}>Add instruction</Button>
      <SectionPanel heading={<h3 >Derived recipe</h3>}>{recipe?.length ? <ul className="list-disc pl-5 text-sm">{recipe.map(item => <li key={`${item.productId ?? item.materialDefinitionId}:${item.quantityUnit}`}>{item.name}: {item.quantityText} {item.quantityUnit}</li>)}</ul> : <p className="text-sm">Add reagent fields with planned amounts. The server validates exact catalog, lot and unit requirements.</p>}</SectionPanel>
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Review overview and bench instructions</summary><div className="mt-4"><ProcedurePresentation document={{ name: name || 'Master-mix draft', revision: 'Unsaved draft', status: 'Draft', instructions: definition.steps }} /></div></details>
      {metaError || save.error ? <p role="alert" className="text-sm text-destructive">{metaError || getLabOperationsError(save.error, save.error instanceof Error ? save.error.message : 'The procedure could not be saved.')}</p> : null}
      {Object.keys(form.formState.errors).length ? <p role="alert" className="text-sm text-destructive">Review the instructions marked Needs attention, including reagent fields and illustration descriptions.</p> : null}
      <div className="flex flex-wrap items-center justify-end gap-2"><RequiredLegend className="mr-auto" /><Button type="button" variant="outline" disabled={imageUploadPending || save.isPending} onClick={() => void guard.close(() => { guard.allowNavigation(); onClose() })}>Cancel</Button><Button type="submit" disabled={imageUploadPending || save.isPending || !recipe?.length}>{save.isPending ? 'Saving…' : 'Save draft'}</Button></div>
    </form></section>
}
