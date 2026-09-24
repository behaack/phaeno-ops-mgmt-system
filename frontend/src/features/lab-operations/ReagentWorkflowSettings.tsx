import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'

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
import { PreparationField, PreparationPanel, prepRowClass, prepSelectClass } from './preparation-ui'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a workflow name.').max(160),
  materialDefinitionId: z.string(),
  newMaterialName: z.string(),
  outputUnit: z.string().trim().min(1, 'Enter the reagent inventory unit.').max(50),
  steps: z.array(z.object({ stepKey: z.string(), name: z.string().trim().min(1, 'Enter a step name.').max(160), instructions: z.string().trim().min(1, 'Enter instructions.').max(4000) })).min(1, 'Add at least one step.'),
}).superRefine((value, context) => {
  if (!value.materialDefinitionId) context.addIssue({ code: 'custom', path: ['materialDefinitionId'], message: 'Choose the reagent this workflow makes.' })
  if (value.materialDefinitionId === '__new__' && !value.newMaterialName.trim()) context.addIssue({ code: 'custom', path: ['newMaterialName'], message: 'Enter the new reagent name.' })
})
type WorkflowForm = z.infer<typeof schema>

export function ReagentWorkflowSettings({ definitions, canManage, actorId, isPlatformAdmin }: {
  definitions: LabMaterialDefinition[]; canManage: boolean; actorId?: string; isPlatformAdmin: boolean
}) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: reagentWorkflowsKey, queryFn: listReagentWorkflows })
  const [editor, setEditor] = useState<'new' | ReagentWorkflow | null>(null)
  const [decision, setDecision] = useState<{ workflow: ReagentWorkflow; action: 'approve' | 'retire' } | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const change = useMutation({
    mutationFn: async () => decision?.action === 'approve'
      ? approveReagentWorkflow(decision.workflow, overrideReason || undefined)
      : retireReagentWorkflow(decision!.workflow),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: reagentWorkflowsKey }); setDecision(null); setOverrideReason('') },
  })
  if (query.isPending) return <p role="status">Loading reagent workflows…</p>
  if (query.isError) return <div className="space-y-3"><p role="alert">{getLabOperationsError(query.error, 'Reagent workflows could not be loaded.')}</p><Button variant="outline" onClick={() => void query.refetch()}>Reload reagent workflows</Button></div>

  return <>
    <PreparationPanel title="Reagent manufacturing workflows" description="Each reagent has one workflow identity, with revisions of its ordered steps. Runs use the reagent name and capture the approved revision without a customer sample or tube. A second administrator approves each revision."
      actions={canManage ? <Button type="button" onClick={() => setEditor('new')}><Plus data-icon="inline-start" /> New reagent workflow</Button> : undefined}>
      {query.data.length ? <ul className="space-y-3" aria-label="Reagent workflows">{query.data.map(workflow => {
        const actions = canManage ? [
          ...(workflow.status !== 'Retired' ? [{ label: 'Revise workflow', run: () => setEditor(workflow) }] : []),
          ...(workflow.status === 'Draft' ? [{ label: 'Approve workflow', run: () => setDecision({ workflow, action: 'approve' }) }] : []),
          ...(workflow.status === 'Approved' ? [{ label: 'Retire workflow', run: () => setDecision({ workflow, action: 'retire' }) }] : []),
        ] : []
        return <li key={workflow.id} className={`${prepRowClass} flex flex-wrap items-center justify-between gap-3`}><div className="min-w-0 flex-1 basis-48"><p className="font-medium">{workflow.materialName}</p><p className="mt-1 text-sm text-muted-foreground">Procedure: {workflow.name} · Unit: {workflow.outputUnit ?? 'not configured'} · Revision {workflow.revision} · {workflow.steps.length} steps</p></div><div className="flex items-center gap-2"><Badge variant="secondary">{workflow.status}</Badge>{actions.length === 1 ? <Button type="button" variant="outline" onClick={actions[0].run}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={`Actions for ${workflow.materialName}`}>Actions <ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{actions.map(action => <DropdownMenuItem key={action.label} onSelect={action.run}>{action.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}</div></li>
      })}</ul> : <p className="text-sm text-muted-foreground">No reagent workflows yet. Create and approve one before starting reagent manufacturing.</p>}
    </PreparationPanel>
    {editor ? <WorkflowEditor key={editor === 'new' ? 'new' : editor.id} workflow={editor === 'new' ? undefined : editor} definitions={definitions} onClose={() => setEditor(null)} /> : null}
    {decision ? <Dialog open onOpenChange={open => { if (!open && !change.isPending) { setDecision(null); setOverrideReason('') } }}><DialogContent>
      <DialogHeader><DialogTitle>{decision.action === 'approve' ? 'Approve' : 'Retire'} {decision.workflow.name}?</DialogTitle><DialogDescription>{decision.action === 'approve' ? 'Approval makes this exact revision available for new reagent runs. Existing runs retain their own step snapshot.' : 'Retirement stops new runs. Existing runs and their procedure snapshots remain available.'}</DialogDescription></DialogHeader>
      {decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && isPlatformAdmin ? <div className="space-y-1.5"><Label htmlFor="reagent-override-reason"><RequiredFieldName>Administrator override reason</RequiredFieldName></Label><Input id="reagent-override-reason" value={overrideReason} onChange={event => setOverrideReason(event.target.value)} maxLength={2000} /><p className="text-xs text-muted-foreground">You authored this revision. Record why independent approval is unavailable.</p></div> : null}
      {decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && !isPlatformAdmin ? <p className="text-sm text-muted-foreground">A different administrator must approve this revision.</p> : null}
      {change.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(change.error, 'The workflow could not be updated.')}</p> : null}
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={change.isPending} onClick={() => setDecision(null)}>Cancel</Button><Button type="button" disabled={change.isPending || decision.action === 'approve' && decision.workflow.authoredByUserId === actorId && (!isPlatformAdmin || !overrideReason.trim())} onClick={() => change.mutate()}>{change.isPending ? 'Saving…' : decision.action === 'approve' ? 'Approve workflow' : 'Retire workflow'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog> : null}
  </>
}

function WorkflowEditor({ workflow, definitions, onClose }: { workflow?: ReagentWorkflow; definitions: LabMaterialDefinition[]; onClose: () => void }) {
  const client = useQueryClient()
  const form = useForm<WorkflowForm>({ resolver: zodResolver(schema), defaultValues: {
    name: workflow?.name ?? '', materialDefinitionId: workflow?.materialDefinitionId ?? '', newMaterialName: '', outputUnit: workflow?.outputUnit ?? '',
    steps: workflow?.steps.map(step => ({ stepKey: step.key, name: step.name, instructions: step.instructions })) ?? [{ stepKey: '', name: '', instructions: '' }],
  } })
  const steps = useFieldArray({ control: form.control, name: 'steps' })
  const materialChoice = form.watch('materialDefinitionId')
  const chosenDefinition = definitions.find(item => item.id === materialChoice)
  const availableDefinitions = definitions.filter(item => item.kind === 'PreparedReagent' && (workflow
    ? item.id === workflow.materialDefinitionId
    : !client.getQueryData<ReagentWorkflow[]>(reagentWorkflowsKey)?.some(existing => existing.materialDefinitionId === item.id)))
  const save = useMutation({
    mutationFn: (values: WorkflowForm) => {
      const payload = {
        name: values.name.trim(), materialDefinitionId: values.materialDefinitionId === '__new__' ? null : values.materialDefinitionId,
        newMaterialName: values.materialDefinitionId === '__new__' ? values.newMaterialName.trim() : null,
        outputUnit: values.outputUnit.trim(),
        steps: values.steps.map((step, index) => ({ key: step.stepKey || `${step.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'step'}-${index + 1}`, name: step.name.trim(), instructions: step.instructions.trim() })),
        version: workflow?.version,
      }
      return workflow ? reviseReagentWorkflow(workflow.id, payload) : createReagentWorkflow(payload)
    },
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: reagentWorkflowsKey }), client.invalidateQueries({ queryKey: ['lab-operations'] })]); onClose() },
  })
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose() }}><DialogContent className="max-w-2xl"><form className="contents" noValidate onSubmit={form.handleSubmit(values => save.mutate(values))}>
    <DialogHeader><DialogTitle>{workflow ? `Revise ${workflow.materialName}` : 'Configure reagent manufacturing'}</DialogTitle><DialogDescription>Choose the reagent, set its inventory unit, and define its ordered, sample-independent procedure. Each reagent keeps one workflow identity with revisions. A new or revised workflow starts as a draft.</DialogDescription></DialogHeader>
    <div className="max-h-[62vh] space-y-4 overflow-y-auto p-1">
      <PreparationField id="reagent-workflow-material" label="Reagent name" required error={form.formState.errors.materialDefinitionId?.message}><select id="reagent-workflow-material" className={prepSelectClass} {...form.register('materialDefinitionId', { onChange: event => form.setValue('outputUnit', definitions.find(item => item.id === event.target.value)?.defaultQuantityUnit ?? '') })}><option value="">Select reagent…</option>{availableDefinitions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}{workflow ? null : <option value="__new__">Create a new reagent identity…</option>}</select></PreparationField>
      {materialChoice === '__new__' ? <PreparationField id="reagent-workflow-new-material" label="New reagent name" required error={form.formState.errors.newMaterialName?.message}><Input id="reagent-workflow-new-material" maxLength={255} {...form.register('newMaterialName')} /></PreparationField> : null}
      <PreparationField id="reagent-workflow-unit" label="Reagent inventory unit" required error={form.formState.errors.outputUnit?.message}><Input id="reagent-workflow-unit" maxLength={50} placeholder="mL" readOnly={Boolean(workflow?.outputUnit || chosenDefinition?.defaultQuantityUnit)} {...form.register('outputUnit')} /></PreparationField>
      <p className="text-xs text-muted-foreground">This unit belongs to the reagent. Staff enter the actual amount produced after the run is complete.</p>
      <PreparationField id="reagent-workflow-name" label="Procedure name" required error={form.formState.errors.name?.message}><Input id="reagent-workflow-name" maxLength={160} {...form.register('name')} /></PreparationField>
      <fieldset className="space-y-3"><legend className="text-sm font-medium">Manufacturing steps *</legend>{steps.fields.map((step, index) => <div key={step.id} className="space-y-3 rounded-lg border p-3"><div className="flex items-center justify-between"><p className="text-sm font-medium">Step {index + 1}</p><Button type="button" variant="ghost" size="icon" disabled={steps.fields.length === 1} aria-label={`Remove step ${index + 1}`} onClick={() => steps.remove(index)}><Trash2 aria-hidden="true" /></Button></div><PreparationField id={`reagent-step-${index}-name`} label="Step name" required error={form.formState.errors.steps?.[index]?.name?.message}><Input id={`reagent-step-${index}-name`} maxLength={160} {...form.register(`steps.${index}.name`)} /></PreparationField><PreparationField id={`reagent-step-${index}-instructions`} label="Instructions" required error={form.formState.errors.steps?.[index]?.instructions?.message}><textarea id={`reagent-step-${index}-instructions`} className={`${prepSelectClass} min-h-24 py-2`} maxLength={4000} {...form.register(`steps.${index}.instructions`)} /></PreparationField></div>)}<Button type="button" variant="outline" onClick={() => steps.append({ stepKey: '', name: '', instructions: '' })}><Plus data-icon="inline-start" /> Add step</Button>{form.formState.errors.steps?.root?.message ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.steps.root.message}</p> : null}</fieldset>
      {save.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(save.error, 'The workflow could not be saved.')}</p> : null}
    </div>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : workflow ? 'Save new revision' : 'Create draft'}</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
