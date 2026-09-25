import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'
import {
  approveMasterMixWorkflow, createMasterMixWorkflow, listMasterMixWorkflows, masterMixWorkflowsKey,
  retireMasterMixWorkflow, reviseMasterMixWorkflow, type MasterMixWorkflow, type MasterMixWorkflowRevision,
} from '#/api/lab-master-mix'
import { getLabOperationsDashboard, getLabOperationsError } from '#/api/lab-operations'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { PreparationField, PreparationPanel, prepRowClass, prepSelectClass } from './preparation-ui'
import { isMasterMixDecimalQuantity } from './decimal-quantity'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter the master-mix name.').max(160),
  quantityUnit: z.string().trim().min(1, 'Enter the mix amount unit.').max(50),
  ingredients: z.array(z.object({
    materialDefinitionId: z.string().uuid('Choose a source material.'),
    quantityText: z.string().refine(value => isMasterMixDecimalQuantity(value), 'Enter a positive exact decimal with up to 12 fractional places.'),
    quantityUnit: z.string().trim().min(1, 'Enter the ingredient unit.').max(50),
  })).min(1, 'Add at least one ingredient.').superRefine((items, context) => {
    const seen = new Set<string>()
    items.forEach((item, index) => {
      if (seen.has(item.materialDefinitionId)) context.addIssue({ code: 'custom', path: [index, 'materialDefinitionId'], message: 'Use each source material once; multiple lots can fulfill it.' })
      seen.add(item.materialDefinitionId)
    })
  }),
  steps: z.array(z.object({ key: z.string(), name: z.string().trim().min(1, 'Enter a step name.').max(160), instructions: z.string().trim().min(1, 'Enter instructions.').max(4000) })).min(1, 'Add at least one step.'),
})
type Values = z.infer<typeof schema>

function ProcedureReview({ revision }: { revision: MasterMixWorkflowRevision }) {
  return <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3 text-sm">
    <p className="font-medium">Revision {revision.revision} · {revision.name} · mix unit {revision.quantityUnit}</p>
    <div><p className="font-medium">Required ingredients</p><ul className="list-disc pl-5">{revision.ingredients.map(item => <li key={item.materialDefinitionId}>{item.name}: {item.quantityText ?? item.quantity} {item.quantityUnit}</li>)}</ul></div>
    <div><p className="font-medium">Procedure steps</p><ol className="list-decimal pl-5">{revision.steps.map(item => <li key={item.key}>{item.name}: {item.instructions}</li>)}</ol></div>
  </div>
}

export function MasterMixWorkflowSettings({ canManage, actorId, isPlatformAdmin }: { canManage: boolean; actorId?: string; isPlatformAdmin: boolean }) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: masterMixWorkflowsKey, queryFn: listMasterMixWorkflows })
  const [editor, setEditor] = useState<'new' | MasterMixWorkflow | null>(null)
  const [decision, setDecision] = useState<{ workflow: MasterMixWorkflow; action: 'approve' | 'retire' } | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
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
  if (query.isPending) return <p role="status">Loading master-mix workflows…</p>
  if (query.isError) return <p role="alert">{getLabOperationsError(query.error, 'Master-mix workflows could not be loaded.')}</p>
  return <>
    <PreparationPanel title="Master-mix workflows" description="Approve a recipe and ordered procedure before staff prepare a single-use mix." actions={canManage ? <Button type="button" onClick={() => setEditor('new')}><Plus data-icon="inline-start" /> New master-mix workflow</Button> : undefined}>
      {query.data.length ? <ul className="space-y-3">{query.data.map(workflow => {
        const actions = canManage ? [
          ...(workflow.status !== 'Retired' ? [{ label: 'Revise workflow', run: () => setEditor(workflow) }] : []),
          ...(workflow.status === 'Draft' ? [{ label: 'Approve workflow', run: () => setDecision({ workflow, action: 'approve' as const }) }] : []),
          ...(workflow.status !== 'Retired' && workflow.revisions.some(revision => revision.status === 'Approved') ? [{ label: 'Retire workflow', run: () => setDecision({ workflow, action: 'retire' as const }) }] : []),
        ] : []
        return <li key={workflow.id} className={`${prepRowClass} flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0 flex-1 basis-48"><p className="font-medium">{workflow.name}</p><p className="mt-1 text-sm text-muted-foreground">Revision {workflow.revision} · {workflow.quantityUnit} · {workflow.ingredients.length} ingredients · {workflow.steps.length} steps</p>
            <details className="mt-2 text-sm"><summary className="cursor-pointer">Procedure revision history</summary><div className="mt-2 space-y-2">{workflow.revisions.map(revision => <ProcedureReview key={revision.revision} revision={revision} />)}</div></details>
          </div>
          <div className="flex items-center gap-2"><Badge variant="secondary">{workflow.status}</Badge>{actions.length === 1 ? <Button type="button" variant="outline" onClick={actions[0].run}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={`Actions for ${workflow.name}`}>Actions <ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{actions.map(action => <DropdownMenuItem key={action.label} onSelect={action.run}>{action.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}</div>
        </li>
      })}</ul> : <p className="text-sm text-muted-foreground">No master-mix workflows yet.</p>}
    </PreparationPanel>
    {editor ? <WorkflowEditor key={editor === 'new' ? 'new' : editor.id} workflow={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} /> : null}
    {decision ? <Dialog open onOpenChange={open => { if (!open && !change.isPending) setDecision(null) }}><DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{decision.action === 'approve' ? 'Approve' : 'Retire'} {decision.workflow.name}?</DialogTitle><DialogDescription>{decision.action === 'approve' ? 'Review the exact recipe and procedure before approving this revision.' : 'Retirement stops new mix preparations and new library trays using this recipe. Open trays may use already Ready mixes until each mix’s local-day cutoff. Review their remaining amounts and complete those uses before the cutoff. POMS blocks retirement while an active approved Lab step still selects this workflow.'}</DialogDescription></DialogHeader>
      {decision.action === 'approve' ? <ProcedureReview revision={decision.workflow.revisions.find(item => item.revision === decision.workflow.revision)!} /> : null}
      {decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && isPlatformAdmin ? <PreparationField id="mix-workflow-override" label="Administrator override reason" required><Input id="mix-workflow-override" maxLength={2000} value={overrideReason} onChange={event => setOverrideReason(event.target.value)} /></PreparationField> : null}
      {decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && !isPlatformAdmin ? <p>A different administrator must approve this revision.</p> : null}
      {change.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(change.error, 'The workflow could not be updated.')}</p> : null}
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={change.isPending} onClick={() => setDecision(null)}>Cancel</Button><Button type="button" disabled={change.isPending || decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && (!isPlatformAdmin || !overrideReason.trim())} onClick={() => change.mutate()}>{change.isPending ? 'Saving…' : decision.action === 'approve' ? 'Approve workflow' : 'Retire workflow'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog> : null}
  </>
}

function WorkflowEditor({ workflow, onClose }: { workflow?: MasterMixWorkflow; onClose: () => void }) {
  const client = useQueryClient()
  const catalog = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    name: workflow?.name ?? '', quantityUnit: workflow?.quantityUnit ?? 'µL',
    ingredients: workflow?.ingredients.map(item => ({ materialDefinitionId: item.materialDefinitionId, quantityText: item.quantityText ?? String(item.quantity), quantityUnit: item.quantityUnit })) ?? [{ materialDefinitionId: '', quantityText: '', quantityUnit: 'µL' }],
    steps: workflow?.steps ?? [{ key: '', name: '', instructions: '' }],
  } })
  const ingredients = useFieldArray({ control: form.control, name: 'ingredients' })
  const steps = useFieldArray({ control: form.control, name: 'steps' })
  const close = () => { if (!form.formState.isDirty || window.confirm('Discard unsaved workflow changes?')) onClose() }
  const save = useMutation({ mutationFn: (values: Values) => {
    const definitions = catalog.data?.materialDefinitions ?? []
    const payload = {
      name: values.name.trim(), quantityUnit: values.quantityUnit.trim(),
      ingredients: values.ingredients.map(item => ({ ...item, quantity: 0, name: definitions.find(definition => definition.id === item.materialDefinitionId)?.name ?? '' })),
      steps: values.steps.map((step, index) => ({ key: step.key || `${step.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'step'}-${index + 1}`, name: step.name.trim(), instructions: step.instructions.trim() })),
    }
    return workflow ? reviseMasterMixWorkflow(workflow, payload) : createMasterMixWorkflow(payload)
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: masterMixWorkflowsKey }); onClose() } })
  const definitions = catalog.data?.materialDefinitions.filter(item => item.isActive) ?? []
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) close() }}><DialogContent className="max-w-2xl"><form className="contents" noValidate onSubmit={form.handleSubmit(values => save.mutate(values))}>
    <DialogHeader><DialogTitle>{workflow ? `Revise ${workflow.name}` : 'Configure master-mix workflow'}</DialogTitle><DialogDescription>Define exact source materials and amounts, then the ordered preparation steps. Multiple source lots may fulfill one required material.</DialogDescription></DialogHeader>
    <div className="max-h-[62vh] space-y-4 overflow-y-auto p-1">
      <PreparationField id="mix-workflow-name" label="Master-mix name" required error={form.formState.errors.name?.message}><Input id="mix-workflow-name" maxLength={160} {...form.register('name')} /></PreparationField>
      <PreparationField id="mix-workflow-unit" label="Mix amount unit" required error={form.formState.errors.quantityUnit?.message}><Input id="mix-workflow-unit" maxLength={50} {...form.register('quantityUnit')} /></PreparationField>
      <fieldset className="space-y-3"><legend className="text-sm font-medium">Required ingredients *</legend>{ingredients.fields.map((item, index) => <div key={item.id} className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between"><p className="text-sm font-medium">Ingredient {index + 1}</p><Button type="button" variant="ghost" size="icon" disabled={ingredients.fields.length === 1} aria-label={`Remove ingredient ${index + 1}`} onClick={() => ingredients.remove(index)}><Trash2 aria-hidden="true" /></Button></div>
        <PreparationField id={`mix-ingredient-${index}-material`} label="Source material" required error={form.formState.errors.ingredients?.[index]?.materialDefinitionId?.message}><select id={`mix-ingredient-${index}-material`} className={prepSelectClass} {...form.register(`ingredients.${index}.materialDefinitionId`)}><option value="">Choose material…</option>{definitions.map(definition => <option key={definition.id} value={definition.id}>{definition.name} · {definition.kind}</option>)}</select></PreparationField>
        <div className="grid gap-3 sm:grid-cols-2"><PreparationField id={`mix-ingredient-${index}-quantity`} label="Recipe amount" required error={form.formState.errors.ingredients?.[index]?.quantityText?.message}><Input id={`mix-ingredient-${index}-quantity`} type="text" inputMode="decimal" {...form.register(`ingredients.${index}.quantityText`)} /></PreparationField><PreparationField id={`mix-ingredient-${index}-unit`} label="Ingredient unit" required error={form.formState.errors.ingredients?.[index]?.quantityUnit?.message}><Input id={`mix-ingredient-${index}-unit`} maxLength={50} {...form.register(`ingredients.${index}.quantityUnit`)} /></PreparationField></div>
      </div>)}<Button type="button" variant="outline" onClick={() => ingredients.append({ materialDefinitionId: '', quantityText: '', quantityUnit: 'µL' })}><Plus data-icon="inline-start" /> Add ingredient</Button></fieldset>
      <fieldset className="space-y-3"><legend className="text-sm font-medium">Procedure steps *</legend>{steps.fields.map((step, index) => <div key={step.id} className="space-y-3 rounded-lg border p-3"><div className="flex items-center justify-between"><p className="text-sm font-medium">Step {index + 1}</p><Button type="button" variant="ghost" size="icon" disabled={steps.fields.length === 1} aria-label={`Remove step ${index + 1}`} onClick={() => steps.remove(index)}><Trash2 aria-hidden="true" /></Button></div><PreparationField id={`mix-step-${index}-name`} label="Step name" required error={form.formState.errors.steps?.[index]?.name?.message}><Input id={`mix-step-${index}-name`} maxLength={160} {...form.register(`steps.${index}.name`)} /></PreparationField><PreparationField id={`mix-step-${index}-instructions`} label="Instructions" required error={form.formState.errors.steps?.[index]?.instructions?.message}><textarea id={`mix-step-${index}-instructions`} className={`${prepSelectClass} min-h-24 py-2`} maxLength={4000} {...form.register(`steps.${index}.instructions`)} /></PreparationField></div>)}<Button type="button" variant="outline" onClick={() => steps.append({ key: '', name: '', instructions: '' })}><Plus data-icon="inline-start" /> Add step</Button></fieldset>
      {catalog.isError ? <p role="alert" className="text-sm text-destructive">Source materials could not be loaded.</p> : null}
      {save.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(save.error, 'The workflow could not be saved.')}</p> : null}
    </div>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={close}>Cancel</Button><Button type="submit" disabled={save.isPending || !catalog.data}>{save.isPending ? 'Saving…' : workflow ? 'Save new revision' : 'Create draft'}</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
