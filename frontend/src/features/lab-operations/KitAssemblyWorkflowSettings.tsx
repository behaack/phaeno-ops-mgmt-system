import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { z } from 'zod'
import { ChevronDown, Plus } from 'lucide-react'
import { getLabSteps } from '#/api/lab-steps'
import { getKitAssemblyWorkflows, saveKitAssemblyWorkflow, approveKitAssemblyWorkflow, renameKitAssemblyWorkflow, discardKitAssemblyWorkflowDraft, kitAssemblyWorkflowsKey, type KitAssemblyWorkflow } from '#/api/lab-kit-assembly'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { WorkflowListFilters } from './WorkflowListFilters'

const titleSchema = z.object({
  name: z.string().trim().min(1, 'Enter a workflow name.').max(160, 'Use 160 characters or fewer.'),
})
type TitleValues = z.infer<typeof titleSchema>
const schema = titleSchema.extend({
  stepVersionIds: z.array(z.string().uuid('Choose an approved Lab step.')).min(1, 'Add at least one Lab step.'),
}).superRefine((value, context) => {
  if (new Set(value.stepVersionIds).size !== value.stepVersionIds.length) context.addIssue({ code: 'custom', path: ['stepVersionIds'], message: 'List each Lab step version once.' })
})
type Values = z.infer<typeof schema>

function isShownByDefault(workflow: KitAssemblyWorkflow) {
  const latestStatus = workflow.revisions[0]?.status
  return latestStatus !== 'Retired'
    && (latestStatus !== 'Discarded' || workflow.revisions.some(revision => revision.status === 'Approved'))
}

export function KitAssemblyWorkflowSettings({ canManage, actorId, isPlatformAdmin }: { canManage: boolean; actorId?: string; isPlatformAdmin: boolean }) {
  const query = useQuery({ queryKey: kitAssemblyWorkflowsKey, queryFn: getKitAssemblyWorkflows })
  const client = useQueryClient()
  const [editor, setEditor] = useState<'new' | KitAssemblyWorkflow | null>(null)
  const [approval, setApproval] = useState<KitAssemblyWorkflow | null>(null)
  const [titleTarget, setTitleTarget] = useState<KitAssemblyWorkflow | null>(null)
  const [discardTarget, setDiscardTarget] = useState<KitAssemblyWorkflow | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const approve = useMutation({ mutationFn: async () => approveKitAssemblyWorkflow(approval!.id, approval!.revisions[0].id, approval!.version, overrideReason || undefined), onSuccess: async () => { setApproval(null); setOverrideReason(''); await client.invalidateQueries({ queryKey: kitAssemblyWorkflowsKey }) } })
  const discard = useMutation({ mutationFn: async () => discardKitAssemblyWorkflowDraft(discardTarget!.id, discardTarget!.revisions[0].id, discardTarget!.version), onSuccess: async () => { setDiscardTarget(null); await client.invalidateQueries({ queryKey: kitAssemblyWorkflowsKey }) } })
  const workflows = query.data ?? []
  const needle = search.trim().toLocaleLowerCase()
  const visibleWorkflows = workflows.filter(workflow =>
    (showInactive || isShownByDefault(workflow))
    && (!needle || workflow.name.toLocaleLowerCase().includes(needle)))
  return <>
    <Card className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Transportation kit workflows</CardTitle><CardDescription>Reusable assembly methods with approved ordered Lab steps. Each Kit specification selects its method and defines its own required contents.</CardDescription>{canManage ? <CardAction><Button type="button" disabled={query.isPending || query.isError} onClick={() => setEditor('new')}><Plus data-icon="inline-start" /> New workflow</Button></CardAction> : null}<div className="col-span-full"><WorkflowListFilters id="kit-workflow" search={search} onSearchChange={setSearch} showInactive={showInactive} onShowInactiveChange={setShowInactive} /></div></CardHeader><CardContent className="space-y-3 p-4">
      {query.isPending ? <p role="status">Loading kit workflows…</p> : null}
      {query.error ? <Alert variant="destructive"><AlertTitle>Kit workflows unavailable</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh and try again.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : null}
      {visibleWorkflows.length ? <ul className="divide-y" aria-label="Transportation kit workflows">
        {visibleWorkflows.map(workflow => {
          const latest = workflow.revisions[0]
          const displayed = latest.status === 'Discarded'
            ? workflow.revisions.find(revision => revision.status === 'Approved') ?? latest
            : latest
          return <li key={workflow.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
            <div className="min-w-0 flex-1 basis-48">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{workflow.name}</p>
                <Badge variant="outline">Rev {displayed.revision}</Badge>
                <Badge variant={displayed.status === 'Approved' ? 'secondary' : 'outline'}>{displayed.status}</Badge>
                <Badge variant="outline">{displayed.steps.length} {displayed.steps.length === 1 ? 'step' : 'steps'}</Badge>
              </div>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer">Workflow revision history</summary>
                <ul className="mt-2 space-y-2">{workflow.revisions.map(revision => <li key={revision.id}>Revision {revision.revision} · {revision.status}</li>)}</ul>
              </details>
            </div>
            {canManage ? <ActionMenu>
              <DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={'Actions for ' + workflow.name}>Actions <ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {latest.status === 'Draft' ? <>
                  <DropdownMenuItem onSelect={() => setEditor(workflow)}>Edit draft</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTitleTarget(workflow)}>Edit title</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { approve.reset(); setOverrideReason(''); setApproval(workflow) }}>Approve draft</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDiscardTarget(workflow)}>Discard draft</DropdownMenuItem>
                </> : <>
                  <DropdownMenuItem onSelect={() => setEditor(workflow)}>New version</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTitleTarget(workflow)}>Edit title</DropdownMenuItem>
                </>}
              </DropdownMenuContent>
            </ActionMenu> : null}
          </li>
        })}</ul> : !query.isPending && !query.error ? <p className="py-8 text-center text-sm text-muted-foreground">{!workflows.length ? 'No kit assembly workflows yet. Add a finished product under Phaeno, then define its approved steps here.' : !showInactive && workflows.every(workflow => !isShownByDefault(workflow)) && !needle ? 'All kit workflows are inactive. Select Show inactive to review them.' : 'No kit workflows match these filters.'}</p> : null}
    </CardContent></Card>
    {editor ? <WorkflowEditor workflow={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} /> : null}
    {titleTarget ? <WorkflowTitleDialog key={titleTarget.id} workflow={titleTarget} onClose={() => setTitleTarget(null)} /> : null}
    {discardTarget ? <Dialog open onOpenChange={open => { if (!open && !discard.isPending) { setDiscardTarget(null); discard.reset() } }}><DialogContent aria-describedby="kit-workflow-discard-consequence"><DialogHeader><DialogTitle>Discard {discardTarget.name} Draft revision {discardTarget.revisions[0].revision}?</DialogTitle></DialogHeader><p id="kit-workflow-discard-consequence" className="text-sm text-muted-foreground">The Draft stays in revision history and its number will not be reused. An earlier approved revision, if present, remains available.</p>{discard.error ? <Alert variant="destructive"><AlertTitle>Draft was not discarded</AlertTitle><AlertDescription>{getLabOperationsError(discard.error, 'Refresh the workflow and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={discard.isPending} onClick={() => { setDiscardTarget(null); discard.reset() }}>Cancel</Button><Button type="button" variant="destructive" disabled={discard.isPending} onClick={() => discard.mutate()}>{discard.isPending ? 'Discarding…' : 'Discard draft'}</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
    {approval ? <Dialog open onOpenChange={open => { if (!open && !approve.isPending) { setApproval(null); setOverrideReason(''); approve.reset() } }}><DialogContent aria-describedby="kit-workflow-approval-consequence"><DialogHeader><DialogTitle>Approve {approval.name} draft revision {approval.revisions[0].revision}?</DialogTitle></DialogHeader><p id="kit-workflow-approval-consequence" className="text-sm text-muted-foreground">Approval fixes these Lab steps for new kit assemblies. Kit specifications define their required contents. Existing kits retain their pinned revision.</p>{approval.revisions[0].authoredByUserId === actorId && isPlatformAdmin ? <div><Label htmlFor="kit-approval-reason"><RequiredFieldName>Administrator override reason</RequiredFieldName></Label><Input id="kit-approval-reason" className="mt-2" value={overrideReason} onChange={event => setOverrideReason(event.target.value)} maxLength={2000} /></div> : null}{approval.revisions[0].authoredByUserId === actorId && !isPlatformAdmin ? <p className="text-sm text-muted-foreground">A different administrator must approve this revision.</p> : null}{approve.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(approve.error, 'Approval failed.')}</p> : null}<RequiredDialogFooter><Button type="button" variant="outline" disabled={approve.isPending} onClick={() => { setApproval(null); setOverrideReason(''); approve.reset() }}>Cancel</Button><Button disabled={approve.isPending || approval.revisions[0].authoredByUserId === actorId && (!isPlatformAdmin || !overrideReason.trim())} onClick={() => approve.mutate()}>{approve.isPending ? 'Approving…' : 'Approve draft'}</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
  </>
}

function WorkflowEditor({ workflow, onClose }: { workflow?: KitAssemblyWorkflow; onClose: () => void }) {
  const client = useQueryClient()
  const labSteps = useQuery({ queryKey: ['lab-steps'], queryFn: getLabSteps })
  const eligibleSteps = (labSteps.data ?? []).filter(step => !step.retiredAtUtc).flatMap(step => step.versions.filter(version => ['Approved', 'Active'].includes(version.status) && plainKitStep(version.definitionJson)).map(version => ({ id: version.id, label: `${step.name} · version ${version.stepVersion}` })))
  const latest = workflow?.revisions[0]
  const source = latest?.status === 'Discarded' ? workflow?.revisions.find(revision => revision.status === 'Approved') ?? latest : latest
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: workflow?.name ?? '', stepVersionIds: source?.steps.map(step => step.labStepVersionId) ?? [''] } })
  const save = useMutation({ mutationFn: (value: Values) => saveKitAssemblyWorkflow({ ...value, workflowId: workflow?.id, workflowVersion: workflow?.version }), onSuccess: async () => { await client.invalidateQueries({ queryKey: kitAssemblyWorkflowsKey }); onClose() } })
  const values = form.watch()
  const errors = form.formState.errors
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose() }}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{workflow ? latest?.status === 'Draft' ? 'Edit kit workflow draft' : 'New kit workflow version' : 'New Transportation kit workflow'}</DialogTitle><DialogDescription>Choose approved Lab steps for a reusable assembly method. A different administrator approves this revision.</DialogDescription></DialogHeader>
    {save.error ? <Alert variant="destructive"><AlertTitle>Workflow was not saved</AlertTitle><AlertDescription>{getLabOperationsError(save.error, 'Review the entries and try again.')}</AlertDescription></Alert> : null}
    <form id="kit-workflow-editor" className="space-y-5" noValidate onSubmit={form.handleSubmit(value => save.mutate(value))}>
      {!workflow ? <div><Label htmlFor="kit-workflow-name"><RequiredFieldName>Workflow name</RequiredFieldName></Label><Input id="kit-workflow-name" className="mt-2" maxLength={160} disabled={save.isPending} {...form.register('name')} />{errors.name ? <p role="alert" className="text-sm text-destructive">{errors.name.message}</p> : null}</div> : <input type="hidden" {...form.register('name')} />}
      <fieldset className="space-y-2"><legend className="sr-only">Ordered Lab steps (required)</legend><div className="flex items-center justify-between gap-3"><span className="font-medium" aria-hidden="true"><RequiredFieldName>Ordered Lab steps</RequiredFieldName></span><Button type="button" variant="outline" size="sm" onClick={() => form.setValue('stepVersionIds', [...values.stepVersionIds, ''], { shouldDirty: true })}>Add step</Button></div><p className="text-xs text-muted-foreground">Only approved instruction-only steps can be used here; sample and preparation-batch captures are excluded.</p>{labSteps.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading Lab steps…</p> : labSteps.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(labSteps.error, 'Lab steps could not be loaded. Refresh and try again.')}</p> : !eligibleSteps.length ? <p role="status" className="text-sm text-muted-foreground">No approved instruction-only Lab steps are available. Save and approve a Lab step before adding it to this workflow; Draft steps cannot be selected.</p> : null}{values.stepVersionIds.map((id, index) => <div key={`${index}-${id}`} className="flex gap-2"><select aria-label={`Assembly step ${index + 1}`} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" value={id} onChange={event => form.setValue(`stepVersionIds.${index}`, event.target.value, { shouldDirty: true, shouldValidate: true })}><option value="">Select approved step</option>{eligibleSteps.map(step => <option key={step.id} value={step.id}>{step.label}</option>)}</select><Button type="button" variant="outline" disabled={index === 0} onClick={() => { const next = [...values.stepVersionIds]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; form.setValue('stepVersionIds', next, { shouldDirty: true }) }}>↑</Button><Button type="button" variant="outline" disabled={values.stepVersionIds.length <= 1} onClick={() => form.setValue('stepVersionIds', values.stepVersionIds.filter((_, i) => i !== index), { shouldDirty: true })}>Remove</Button></div>)}{errors.stepVersionIds ? <p role="alert" className="text-sm text-destructive">{errors.stepVersionIds.message}</p> : null}</fieldset>
    </form><RequiredDialogFooter><Button variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button type="submit" form="kit-workflow-editor" disabled={save.isPending || labSteps.isPending || labSteps.isError}>{save.isPending ? 'Saving…' : 'Save draft'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

function WorkflowTitleDialog({ workflow, onClose }: { workflow: KitAssemblyWorkflow; onClose: () => void }) {
  const client = useQueryClient()
  const form = useForm<TitleValues>({ resolver: zodResolver(titleSchema), defaultValues: { name: workflow.name } })
  const rename = useMutation({
    mutationFn: (value: TitleValues) => renameKitAssemblyWorkflow(workflow.id, value.name, workflow.version),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: kitAssemblyWorkflowsKey }); onClose() },
  })
  return <Dialog open onOpenChange={open => { if (!open && !rename.isPending) onClose() }}><DialogContent><DialogHeader><DialogTitle>Edit workflow title</DialogTitle><DialogDescription>Change the staff-facing workflow name without adding a revision or changing its assembly steps.</DialogDescription></DialogHeader>
    {rename.error ? <Alert variant="destructive"><AlertTitle>Title was not saved</AlertTitle><AlertDescription>{getLabOperationsError(rename.error, 'Refresh the workflow and try again.')}</AlertDescription></Alert> : null}
    <form id="kit-workflow-title-editor" noValidate onSubmit={form.handleSubmit(value => rename.mutate(value))}>
      <Label htmlFor="kit-workflow-title"><RequiredFieldName>Workflow name</RequiredFieldName></Label>
      <Input id="kit-workflow-title" className="mt-2" maxLength={160} disabled={rename.isPending} {...form.register('name')} />
      {form.formState.errors.name ? <p role="alert" className="mt-2 text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
    </form>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={rename.isPending} onClick={onClose}>Cancel</Button><Button type="submit" form="kit-workflow-title-editor" disabled={rename.isPending}>{rename.isPending ? 'Saving…' : 'Save title'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

function plainKitStep(json: string) {
  try { const definition = JSON.parse(json); const step = definition.steps?.[0]; return step && !step.captures?.length && !step.inputMaterials?.length && !step.preparedOutputs?.length && !step.equipmentTypes?.length && !step.qcGate && !step.attachmentRequired } catch { return false }
}
