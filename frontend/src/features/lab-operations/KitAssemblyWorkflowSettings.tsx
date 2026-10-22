import { LoadingState } from '#/components/ui/content-state'
import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { workflowTones } from '#/features/lab-operations/lab-status'
import { RequiredLegend } from '#/components/ui/required-field'
import { Field as PortalField } from '#/components/ui/field'
import { RecordLink } from '#/components/ui/record-link'
import { useIllustrationUploadPending } from './ProcedureIllustrations'
import { useWorkflowDiscovery } from './configuration-discovery'
import { procedureDetailRoute } from './procedure-navigation'
import { Link, useNavigate } from '@tanstack/react-router'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useRef, useState } from 'react'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { instructionSchema, newInstruction } from './procedure-types'
import { SimpleProcedureEditor } from './SimpleProcedureEditor'
import { ProcedurePresentation } from './ProcedurePresentation'
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
const schema = titleSchema.extend({ steps: z.array(instructionSchema).min(1).max(100) })
type Values = z.infer<typeof schema>
function isShownByDefault(workflow: KitAssemblyWorkflow) {
  const latest = workflow.revisions[0]?.status
  return latest !== 'Retired' && (latest !== 'Discarded' || workflow.revisions.some(v => v.status === 'Approved'))
}
export function KitAssemblyWorkflowSettings({ canManage, actorId, isPlatformAdmin }: { canManage: boolean; actorId?: string; isPlatformAdmin: boolean }) {
  const query = useQuery({ queryKey: kitAssemblyWorkflowsKey, queryFn: getKitAssemblyWorkflows })
  const client = useQueryClient()
  const navigate = useNavigate()
  const setEditor = (value: 'new' | KitAssemblyWorkflow) => void navigate({ to: procedureDetailRoute, params: { kind: 'kit', recordId: typeof value === 'string' ? 'new' : value.id }, search: { ...discovery, edit: true } })
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [approval, setApproval] = useState<KitAssemblyWorkflow | null>(null)
  const [titleTarget, setTitleTarget] = useState<KitAssemblyWorkflow | null>(null)
  const [discardTarget, setDiscardTarget] = useState<KitAssemblyWorkflow | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const { discovery, search, setSearch, showInactive, setShowInactive } = useWorkflowDiscovery('transportation-kit')
  const approve = useMutation({ mutationFn: async () => approveKitAssemblyWorkflow(approval!.id, approval!.revisions[0].id, approval!.version, overrideReason || undefined), onSuccess: async () => { setApproval(null); setOverrideReason(''); await client.invalidateQueries({ queryKey: kitAssemblyWorkflowsKey }) } })
  const discard = useMutation({ mutationFn: async () => discardKitAssemblyWorkflowDraft(discardTarget!.id, discardTarget!.revisions[0].id, discardTarget!.version), onSuccess: async () => { setDiscardTarget(null); await client.invalidateQueries({ queryKey: kitAssemblyWorkflowsKey }) } })
  const workflows = query.data ?? []
  const needle = search.trim().toLocaleLowerCase()
  const visibleWorkflows = workflows.filter(workflow =>
    (showInactive || isShownByDefault(workflow))
    && (!needle || workflow.name.toLocaleLowerCase().includes(needle)))
  return <>
    <Card className="gap-0 py-0"><CardHeader ><CardTitle>Transportation kit workflows</CardTitle><CardDescription>Reusable assembly procedures approved as a whole. Each Kit specification selects its method and defines its own required contents.</CardDescription>{canManage ? <CardAction><Button type="button" disabled={query.isPending || query.isError} onClick={() => setEditor('new')}><Plus data-icon="inline-start" /> New workflow</Button></CardAction> : null}<div className="col-span-full"><WorkflowListFilters id="kit-workflow" search={search} onSearchChange={setSearch} showInactive={showInactive} onShowInactiveChange={setShowInactive} /></div></CardHeader><CardContent className="space-y-3 p-4">
      {query.isPending ? <LoadingState  label={<>Loading kit workflows…</>} /> : null}
      {query.error ? <Alert variant="destructive"><AlertTitle>Kit workflows unavailable</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh and try again.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : null}
      {visibleWorkflows.length ? <ul className="divide-y" aria-label="Transportation kit workflows">
        {visibleWorkflows.map(workflow => {
          const latest = workflow.revisions[0]
          const displayed = workflow.revisions.find(revision => revision.status === 'Approved') ?? latest
          return <li key={workflow.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
            <div className="min-w-0 flex-1 basis-48">
              <div className="flex flex-wrap items-center gap-2">
                <RecordLink asChild><Link to={procedureDetailRoute} params={{ kind: 'kit', recordId: workflow.id }} search={{ ...discovery, revision: displayed.revision }}>{workflow.name}</Link></RecordLink>
                <Badge variant="outline">Rev {displayed.revision}</Badge><DomainStatusBadge status={displayed.status} tones={workflowTones}>{displayed.status}</DomainStatusBadge><Badge variant="outline">{displayed.steps.length} instructions</Badge>
              </div>
              {latest.status === 'Draft' && latest.revision !== displayed.revision ? <span className="block"><RecordLink asChild><Link to={procedureDetailRoute} params={{ kind: 'kit', recordId: workflow.id }} search={{ ...discovery, revision: latest.revision }}>Pending Draft revision {latest.revision}</Link></RecordLink></span> : null}
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer">Workflow revision history</summary>
                <ul className="mt-2 space-y-2">{workflow.revisions.map(revision => <li key={revision.id}>Revision {revision.revision} · {revision.status}</li>)}</ul>
              </details>
            </div>
            {canManage ? <ActionMenu>
              <DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={'Actions for ' + workflow.name}>Actions</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {latest.status === 'Draft' ? <>
                  <DropdownMenuItem onSelect={() => setEditor(workflow)}>Edit draft</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { approve.reset(); setOverrideReason(''); setApproval(workflow) }}>Approve draft</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDiscardTarget(workflow)}>Discard draft</DropdownMenuItem>
                </> : <DropdownMenuItem onSelect={() => setEditor(workflow)}>New revision</DropdownMenuItem>}
                <DropdownMenuItem onSelect={() => setTitleTarget(workflow)}>Edit title</DropdownMenuItem>
              </DropdownMenuContent>
            </ActionMenu> : null}
          </li>
        })}</ul> : !query.isPending && !query.error ? <p className="py-8 text-center text-sm text-muted-foreground">{!workflows.length ? 'No kit assembly workflows yet. Create a workflow and write its assembly instructions.' : !showInactive && workflows.every(workflow => !isShownByDefault(workflow)) && !needle ? 'All kit workflows are inactive. Select Show inactive to review them.' : 'No kit workflows match these filters.'}</p> : null}
    </CardContent></Card>

    {titleTarget ? <WorkflowTitleDialog workflow={titleTarget} onClose={() => setTitleTarget(null)} /> : null}
    {discardTarget ? <Dialog open onOpenChange={open => { if (!open && !discard.isPending) { setDiscardTarget(null); discard.reset() } }}><DialogContent onOpenAutoFocus={e => { e.preventDefault(); cancelRef.current?.focus() }} aria-describedby="kit-workflow-discard-consequence"><DialogHeader><DialogTitle>Discard {discardTarget.name} Draft revision {discardTarget.revisions[0].revision}?</DialogTitle></DialogHeader><p id="kit-workflow-discard-consequence" className="text-sm text-muted-foreground">The Draft stays in revision history and its number will not be reused. An earlier approved revision, if present, remains available.</p>{discard.error ? <Alert variant="destructive"><AlertTitle>Draft was not discarded</AlertTitle><AlertDescription>{getLabOperationsError(discard.error, 'Refresh the workflow and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button ref={cancelRef} type="button" variant="outline" disabled={discard.isPending} onClick={() => { setDiscardTarget(null); discard.reset() }}>Cancel</Button><Button type="button" variant="destructive" disabled={discard.isPending} onClick={() => discard.mutate()}>{discard.isPending ? 'Discarding…' : 'Discard draft'}</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
    {approval ? <Dialog open onOpenChange={open => { if (!open && !approve.isPending) { setApproval(null); setOverrideReason(''); approve.reset() } }}><DialogContent onOpenAutoFocus={e => { e.preventDefault(); cancelRef.current?.focus() }} aria-describedby="kit-workflow-approval-consequence"><DialogHeader><DialogTitle>Approve {approval.name} draft revision {approval.revisions[0].revision}?</DialogTitle></DialogHeader><p id="kit-workflow-approval-consequence" className="text-sm text-muted-foreground">Approval fixes this complete assembly procedure for new kit assemblies. Kit specifications define their required contents. Existing kits retain their pinned revision.</p><ProcedurePresentation document={{ name: approval.name, revision: approval.revisions[0].revision, status: 'Draft', instructions: approval.revisions[0].steps.map(s => ({ ...s, key: s.stepKey })) }} />{approval.revisions[0].authoredByUserId === actorId && isPlatformAdmin ? <PortalField><Label htmlFor="kit-approval-reason"><RequiredFieldName>Administrator override reason</RequiredFieldName></Label><Input id="kit-approval-reason"  value={overrideReason} onChange={event => setOverrideReason(event.target.value)} maxLength={2000} /></PortalField> : null}{approval.revisions[0].authoredByUserId === actorId && !isPlatformAdmin ? <p className="text-sm text-muted-foreground">A different administrator must approve this revision.</p> : null}{approve.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(approve.error, 'Approval failed.')}</p> : null}<RequiredDialogFooter><Button ref={cancelRef} type="button" variant="outline" disabled={approve.isPending} onClick={() => { setApproval(null); setOverrideReason(''); approve.reset() }}>Cancel</Button><Button disabled={approve.isPending || approval.revisions[0].authoredByUserId === actorId && (!isPlatformAdmin || !overrideReason.trim())} onClick={() => approve.mutate()}>{approve.isPending ? 'Approving…' : 'Approve draft'}</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
  </>
}

export function KitProcedureEditor({ workflow: loadedWorkflow, onClose }: { workflow?: KitAssemblyWorkflow; onClose: () => void }) {
  const [workflow] = useState(loadedWorkflow)
  const client = useQueryClient()
  const imageUploadPending = useIllustrationUploadPending()
  const latest = workflow?.revisions[0]
  const source = latest?.status === 'Discarded' ? workflow?.revisions.find(revision => revision.status === 'Approved') ?? latest : latest
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: workflow?.name ?? '', steps: source?.steps.map(step => ({ key: step.stepKey, name: step.name, instructions: step.instructions, illustrations: step.illustrations ?? [], copiedFrom: step.copiedFrom, sourceLabStepVersionId: step.sourceLabStepVersionId })) ?? [newInstruction()] } })
  const guard = useModalDraftGuard(form.formState.isDirty, form.formState.isSubmitting || imageUploadPending, true, workflow?.name ?? 'the new transportation-kit procedure')
  const save = useMutation({ mutationFn: (value: Values) => saveKitAssemblyWorkflow({ name: value.name, steps: value.steps.map(step => ({ stepKey: step.key, name: step.name, instructions: step.instructions, illustrations: step.illustrations, copiedFrom: step.copiedFrom, sourceLabStepVersionId: step.sourceLabStepVersionId })), workflowId: workflow?.id, workflowVersion: workflow?.version }), onSuccess: async () => { guard.allowNavigation(); await client.invalidateQueries({ queryKey: kitAssemblyWorkflowsKey }); onClose() } })
  const instructions = form.watch('steps')
  return <section className="min-w-0 space-y-5"><header><h2 className="text-2xl font-semibold">{workflow ? `Revise ${workflow.name}` : 'New transportation-kit procedure'}</h2><p className="mt-2 text-sm text-muted-foreground">Write the complete instruction-only assembly method. Kit specifications continue to define required contents. Approve the complete procedure before physical assembly.</p></header>
    <form className="space-y-5" noValidate onSubmit={form.handleSubmit(value => { if (!imageUploadPending) save.mutate(value) })}>
      <PortalField><Label htmlFor="kit-workflow-name"><RequiredFieldName>Workflow name</RequiredFieldName></Label><Input id="kit-workflow-name" maxLength={160} readOnly={Boolean(workflow)} {...form.register('name')} /></PortalField>
      <SimpleProcedureEditor context="kit" instructions={instructions} onChange={value => form.setValue('steps', value, { shouldDirty: true, shouldValidate: true })} disabled={save.isPending || imageUploadPending} />
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Review overview and bench instructions</summary><div className="mt-4"><ProcedurePresentation document={{ name: form.watch('name') || 'Kit procedure draft', revision: 'Unsaved draft', status: 'Draft', instructions }} /></div></details>
      {save.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(save.error, 'The procedure could not be saved.')}</p> : null}
      {Object.keys(form.formState.errors).length ? <p role="alert" className="text-sm text-destructive">Name the procedure and complete every instruction and illustration description.</p> : null}
      <div className="flex flex-wrap items-center justify-end gap-2"><RequiredLegend className="mr-auto" /><Button type="button" variant="outline" disabled={imageUploadPending || save.isPending} onClick={() => void guard.close(() => { guard.allowNavigation(); onClose() })}>Cancel</Button><Button type="submit" disabled={imageUploadPending || save.isPending}>{save.isPending ? 'Saving…' : 'Save draft'}</Button></div>
    </form></section>
}

function WorkflowTitleDialog({ workflow, onClose }: { workflow: KitAssemblyWorkflow; onClose: () => void }) {
  const client = useQueryClient()
  const form = useForm<TitleValues>({ resolver: zodResolver(titleSchema), defaultValues: { name: workflow.name } })
  const guard = useModalDraftGuard(form.formState.isDirty, form.formState.isSubmitting)
  const rename = useMutation({ mutationFn: (value: TitleValues) => renameKitAssemblyWorkflow(workflow.id, value.name, workflow.version), onSuccess: async () => { guard.allowNavigation(); await client.invalidateQueries({ queryKey: kitAssemblyWorkflowsKey }); onClose() } })
  return <Dialog open onOpenChange={open => { if (!open && !rename.isPending) void guard.close(() => { guard.allowNavigation(); onClose() }) }}><DialogContent><DialogHeader><DialogTitle>Edit workflow title</DialogTitle><DialogDescription>Change the staff-facing name without changing approved instructions or recorded assembly evidence.</DialogDescription></DialogHeader>
    <form id="kit-workflow-title-editor" noValidate onSubmit={form.handleSubmit(value => rename.mutate(value))}>
      <Label htmlFor="kit-workflow-title"><RequiredFieldName>Workflow name</RequiredFieldName></Label><Input id="kit-workflow-title" maxLength={160} {...form.register('name')} />
      {form.formState.errors.name ? <p role="alert">{form.formState.errors.name.message}</p> : null}
      {rename.error ? <p role="alert">{getLabOperationsError(rename.error, 'The title could not be saved.')}</p> : null}
    </form><RequiredDialogFooter><Button type="button" variant="outline" disabled={rename.isPending} onClick={() => void guard.close(() => { guard.allowNavigation(); onClose() })}>Cancel</Button><Button type="submit" form="kit-workflow-title-editor" disabled={rename.isPending}>Save title</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
