import { useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { z } from 'zod'
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
import { PreparationField, PreparationPanel, PreparationActions } from './preparation-ui'
import { combinedDecimalQuantity, isMasterMixDecimalQuantity } from './decimal-quantity'
import { getLabSteps } from '#/api/lab-steps'
import type { MasterMixStep, MasterMixRecipeIngredient } from '#/api/lab-master-mix'
import { NativeSelect } from '#/components/ui/native-select'
import { ScientificTextField } from './ScientificTextField'
import { WorkflowListFilters } from './WorkflowListFilters'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter the master-mix name.').max(160),
  quantityUnit: z.string().trim().min(1, 'Enter the mix amount unit.').max(50),
  steps: z.array(z.object({ versionId: z.string().uuid('Choose an approved master-mix Lab step.') })).min(1, 'Add at least one Lab step.').max(100),
})
type Values = z.infer<typeof schema>
const mixQuantityUnits = ['µL', 'mL', 'L', 'ng', 'µg', 'mg', 'g', 'kg'] as const

function ProcedureReview({ revision }: { revision: MasterMixWorkflowRevision }) {
  return <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3 text-sm">
    <p className="font-medium">Revision {revision.revision} · {revision.name} · mix unit {revision.quantityUnit}</p>
    <div><p className="font-medium">Required ingredients</p><ul className="list-disc pl-5">{revision.ingredients.map(item => <li key={`${item.productId ?? item.materialDefinitionId}:${item.quantityUnit}`}>{item.name}: {item.quantityText} {item.quantityUnit}</li>)}</ul></div>
    <div><p className="font-medium">Procedure steps</p><ol className="list-decimal pl-5">{revision.steps.map(item => <li key={item.key}>{item.name}: {item.instructions}</li>)}</ol></div>
  </div>
}

export function MasterMixWorkflowSettings({ canManage, actorId, isPlatformAdmin }: { canManage: boolean; actorId?: string; isPlatformAdmin: boolean }) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: masterMixWorkflowsKey, queryFn: listMasterMixWorkflows })
  const [editor, setEditor] = useState<'new' | MasterMixWorkflow | null>(null)
  const [decision, setDecision] = useState<{ workflow: MasterMixWorkflow; action: 'approve' | 'retire' } | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const decisionCancel = useRef<HTMLButtonElement>(null)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
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
    <PreparationPanel title="Master-mix workflows" description="Assemble approved Lab steps. Their planned reagent amounts define the recipe." actions={canManage ? <Button type="button" onClick={() => setEditor('new')}><Plus data-icon="inline-start" /> New master-mix workflow</Button> : undefined} headerContent={<WorkflowListFilters id="master-mix-workflow" search={search} onSearchChange={setSearch} showInactive={showInactive} onShowInactiveChange={setShowInactive} />}>
      {query.isPending ? <p role="status">Loading master-mix workflows…</p> : null}
      {query.isError ? <div className="space-y-3"><p role="alert">{getLabOperationsError(query.error, 'Master-mix workflows could not be loaded.')}</p><Button type="button" variant="outline" onClick={() => void query.refetch()}>Retry</Button></div> : null}
      {visibleWorkflows.length ? <ul className="divide-y" aria-label="Master-mix workflows">{visibleWorkflows.map(workflow => {
        const actions = canManage ? [
          ...(workflow.status !== 'Retired' ? [{ label: 'Revise workflow', run: () => setEditor(workflow) }] : []),
          ...(workflow.status === 'Draft' ? [{ label: 'Approve workflow', run: () => setDecision({ workflow, action: 'approve' as const }) }] : []),
          ...(workflow.status !== 'Retired' && workflow.revisions.some(revision => revision.status === 'Approved') ? [{ label: 'Retire workflow', run: () => setDecision({ workflow, action: 'retire' as const }) }] : []),
        ] : []
        return <li key={workflow.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="min-w-0 flex-1 basis-48"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{workflow.name}</p><Badge variant="outline">Rev {workflow.revision}</Badge><Badge variant={workflow.status === 'Approved' ? 'secondary' : 'outline'}>{workflow.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{workflow.quantityUnit} · {workflow.ingredients.length} ingredients · {workflow.steps.length} steps</p>
            <details className="mt-2 text-sm"><summary className="cursor-pointer">Procedure revision history</summary><div className="mt-2 space-y-2">{workflow.revisions.map(revision => <ProcedureReview key={revision.revision} revision={revision} />)}</div></details>
          </div>
          <div className="flex items-center gap-2">{actions.length === 1 ? <Button type="button" variant="outline" onClick={actions[0].run}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={`Actions for ${workflow.name}`}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end">{actions.map(action => <DropdownMenuItem key={action.label} onSelect={action.run}>{action.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}</div>
        </li>
      })}</ul> : !query.isPending && !query.isError ? <p className="py-8 text-center text-sm text-muted-foreground">{!workflows.length ? 'No master-mix workflows yet.' : !showInactive && workflows.every(workflow => workflow.status === 'Retired') && !needle ? 'All master-mix workflows are inactive. Select Show inactive to review them.' : 'No master-mix workflows match these filters.'}</p> : null}
    </PreparationPanel>
    {editor ? <WorkflowEditor key={editor === 'new' ? 'new' : editor.id} workflow={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} /> : null}
    {decision ? <Dialog open onOpenChange={open => { if (!open && !change.isPending) setDecision(null) }}><DialogContent className="max-w-2xl" onOpenAutoFocus={event => { event.preventDefault(); decisionCancel.current?.focus() }}>
      <DialogHeader><DialogTitle>{decision.action === 'approve' ? 'Approve' : 'Retire'} {decision.workflow.name}?</DialogTitle></DialogHeader><div><DialogDescription>{decision.action === 'approve' ? 'Review the exact recipe and procedure before approving this revision.' : 'Retirement stops new mix preparations and new library trays using this recipe. Open trays may use already Ready mixes until each mix’s local-day cutoff. Review their remaining amounts and complete those uses before the cutoff. POMS blocks retirement while an active approved Lab step still selects this workflow.'}</DialogDescription></div>
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

function WorkflowEditor({ workflow, onClose }: { workflow?: MasterMixWorkflow; onClose: () => void }) {
  const client = useQueryClient()
  const catalog = useQuery({ queryKey: ['lab-steps'], queryFn: getLabSteps })
  const [discardOpen, setDiscardOpen] = useState(false)
  const keepEditing = useRef<HTMLButtonElement>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    name: workflow?.name ?? '', quantityUnit: workflow?.quantityUnit ?? 'µL',
    steps: workflow?.steps.map(step => ({ versionId: step.labStepVersionId ?? '' })) ?? [{ versionId: '' }],
  } })
  const steps = useFieldArray({ control: form.control, name: 'steps' })
  const close = () => { if (form.formState.isDirty) setDiscardOpen(true); else onClose() }
  const save = useMutation({ mutationFn: (values: Values) => {
    const payload = { name: values.name, quantityUnit: values.quantityUnit, stepVersionIds: values.steps.map(step => step.versionId) }
    return workflow ? reviseMasterMixWorkflow(workflow, payload) : createMasterMixWorkflow(payload)
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: masterMixWorkflowsKey }); onClose() } })
  const retained = new Set(workflow?.steps.map(step => step.labStepVersionId) ?? [])
  const options = (catalog.data ?? []).flatMap(step => step.versions.flatMap(version => {
    const definition = JSON.parse(version.definitionJson) as { steps?: MasterMixStep[] }
    const source = definition.steps?.[0]
    if (!source || source.processType !== 'masterMix' || version.status !== 'Approved' || !version.approvedAtUtc) return []
    const selectable = !step.retiredAtUtc
    if (!selectable && !retained.has(version.id)) return []
    return [{ id: version.id, label: `${step.name} · version ${version.stepVersion}${selectable ? '' : ' (retained)'}`, selectable, source: { ...source, name: step.name, labStepVersionId: version.id } }]
  }))
  const selected = form.watch('steps').map(item => options.find(option => option.id === item.versionId)?.source).filter(step => step !== undefined)
  const recipe = deriveRecipe(selected)
  return <>
    <Dialog open onOpenChange={open => { if (!open && !save.isPending) close() }}><DialogContent className="max-w-2xl"><form className="contents" noValidate onSubmit={form.handleSubmit(values => save.mutate(values))}>
      <DialogHeader><DialogTitle>{workflow ? `Revise ${workflow.name}` : 'Configure master-mix workflow'}</DialogTitle><DialogDescription>Assemble approved master-mix Lab steps in order. Required reagents and planned amounts come from those steps.</DialogDescription></DialogHeader>
      <div className="max-h-[62vh] space-y-4 overflow-y-auto p-1">
        <PreparationField id="mix-workflow-name" label="Master-mix name" required error={form.formState.errors.name?.message}><Input id="mix-workflow-name" maxLength={160} {...form.register('name')} /></PreparationField>
        <PreparationField id="mix-workflow-unit" label="Mix amount unit" required error={form.formState.errors.quantityUnit?.message}><ScientificTextField id="mix-workflow-unit" control={form.control} name="quantityUnit" label="Mix amount unit" unit unitOptions={mixQuantityUnits} showSymbols={false} required maxLength={50} /></PreparationField>
        <fieldset className="space-y-3"><legend className="text-sm font-semibold">Ordered Lab steps *</legend>
          {steps.fields.map((item, index) => {
            const selectedId = form.watch(`steps.${index}.versionId`)
            const selectedStep = options.find(option => option.id === selectedId)
            return <div key={item.id} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Step {index + 1}</p><PreparationActions items={[
                { label: 'Move up', onClick: () => steps.move(index, index - 1), disabled: index === 0 },
                { label: 'Move down', onClick: () => steps.move(index, index + 1), disabled: index === steps.fields.length - 1 },
                { label: 'Duplicate step', onClick: () => steps.insert(index + 1, { versionId: selectedId }), disabled: steps.fields.length >= 100 },
                { label: 'Remove step', onClick: () => steps.remove(index), disabled: steps.fields.length === 1 },
              ]} /></div>
              <PreparationField id={`mix-step-${index}`} label="Approved Lab step" required error={form.formState.errors.steps?.[index]?.versionId?.message}><NativeSelect id={`mix-step-${index}`} {...form.register(`steps.${index}.versionId`)}><option value="">Choose approved step…</option>{options.filter(option => option.selectable || option.id === selectedId).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</NativeSelect></PreparationField>
              {selectedStep ? <div className="space-y-2 text-sm"><p className="whitespace-pre-wrap">{selectedStep.source.instructions}</p><ul className="space-y-1 text-muted-foreground">{selectedStep.source.captures.filter(field => field.type === 'material').map(field => <li key={field.key}>{field.material?.name}: {field.plannedQuantityText} {field.unit} · lot required</li>)}</ul></div> : null}
            </div>
          })}
          <Button type="button" variant="outline" disabled={steps.fields.length >= 100} onClick={() => steps.append({ versionId: '' })}><Plus data-icon="inline-start" /> Add Lab step</Button>
          {form.formState.errors.steps?.root?.message ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.steps.root.message}</p> : null}
        </fieldset>
        <section className="space-y-2 rounded-lg bg-muted/40 p-3" aria-labelledby="mix-derived-recipe"><h3 id="mix-derived-recipe" className="text-sm font-semibold">Recipe from selected steps</h3>{recipe?.length ? <ul className="space-y-1 text-sm">{recipe.map(item => <li key={`${item.productId ?? item.materialDefinitionId}:${item.quantityUnit}`}>{item.name}: {item.quantityText} {item.quantityUnit}</li>)}</ul> : <p className="text-sm text-muted-foreground">{recipe === null ? 'The selected steps exceed the supported exact recipe amount. Revise their planned amounts before assembling this workflow.' : 'Choose steps with required reagent amounts to see the recipe.'}</p>}</section>
        {catalog.isPending ? <p role="status">Loading Lab steps…</p> : catalog.isError ? <p role="alert" className="text-sm text-destructive">Lab steps could not be loaded.</p> : !options.length ? <p className="text-sm">Create and approve steps with Process set to Master-mix preparation in Lab Settings → Lab steps.</p> : null}
        {save.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(save.error, 'The workflow could not be saved.')}</p> : null}
      </div>
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={close}>Cancel</Button><Button type="submit" disabled={save.isPending || !catalog.data || selected.length !== steps.fields.length || !recipe?.length}>{save.isPending ? 'Saving…' : workflow ? 'Save new revision' : 'Create draft'}</Button></RequiredDialogFooter>
    </form></DialogContent></Dialog>
    <Dialog open={discardOpen} onOpenChange={setDiscardOpen}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); keepEditing.current?.focus() }}><DialogHeader><DialogTitle>Discard workflow changes?</DialogTitle></DialogHeader><div><DialogDescription>Your unsaved master-mix workflow changes will be lost.</DialogDescription></div><RequiredDialogFooter><Button type="button" variant="outline" ref={keepEditing} onClick={() => setDiscardOpen(false)}>Keep editing</Button><Button type="button" variant="destructive" onClick={onClose}>Discard changes</Button></RequiredDialogFooter></DialogContent></Dialog>
  </>
}
