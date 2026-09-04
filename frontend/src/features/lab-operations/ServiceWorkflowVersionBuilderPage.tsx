import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  createLabServiceWorkflowVersion,
  getLabOperationsDashboard,
  getLabOperationsError,
  updateLabServiceWorkflowVersion,
} from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'

const stageSchema = z.object({
  name: z.string().trim().min(1, 'Enter a stage name.').max(255),
  labProtocolVersionId: z.string().min(1, 'Choose a protocol version.'),
  requirement: z.enum(['Required', 'Optional', 'Conditional']),
  condition: z.string().trim().max(1000),
  handoffCriteria: z.string().trim().max(2000),
}).superRefine((stage, context) => {
  if (stage.requirement === 'Conditional' && !stage.condition) {
    context.addIssue({ code: 'custom', path: ['condition'], message: 'Describe when this stage applies.' })
  }
})
const workflowSchema = z.object({ stages: z.array(stageSchema).min(1, 'Add at least one workflow stage.') })
type WorkflowForm = z.infer<typeof workflowSchema>

const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const textareaClass = 'min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const emptyStage = (): WorkflowForm['stages'][number] => ({ name: '', labProtocolVersionId: '', requirement: 'Required', condition: '', handoffCriteria: '' })

export function ServiceWorkflowVersionBuilderPage({ workflowId, draftVersionId }: { workflowId: string; draftVersionId?: string }) {
  const { authProvider, session } = usePhaenoSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const canManage = Boolean(session?.capabilities.canManageLabProtocols)
  const apiEnabled = canManage && authProvider !== 'mock'
  const dashboard = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled: apiEnabled })
  const workflow = dashboard.data?.serviceWorkflows.find((item) => item.id === workflowId)
  const draft = draftVersionId ? workflow?.versions.find((item) => item.id === draftVersionId) : undefined
  const openCandidate = workflow?.versions.find((item) => item.status === 'Draft' || item.status === 'Approved')
  const controlledSource = workflow?.versions.find((item) => item.status === 'Production')
    ?? workflow?.versions.filter((item) => item.status === 'Retired').slice(-1)[0]
  const formKey = `${workflowId}:${draftVersionId ?? 'new'}`
  const form = useForm<WorkflowForm>({ resolver: zodResolver(workflowSchema), defaultValues: { stages: [emptyStage()] } })
  const stages = useFieldArray({ control: form.control, name: 'stages' })
  const mutation = useMutation({
    mutationFn: (values: WorkflowForm) => {
      const input = {
        workflowVersion: workflow!.version,
        stages: values.stages.map((stage) => ({
          ...stage,
          condition: stage.requirement === 'Conditional' ? stage.condition : null,
          handoffCriteria: stage.handoffCriteria || null,
        })),
      }
      return draft
        ? updateLabServiceWorkflowVersion(draft.id, input)
        : createLabServiceWorkflowVersion(workflowId, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lab-operations'] })
      await navigate({ to: '/lab-operations', search: { section: 'protocols' } })
    },
  })

  useEffect(() => {
    if (!workflow || loadedKey === formKey) return
    if (draftVersionId && (!draft || draft.status !== 'Draft')) return
    if (!draftVersionId && openCandidate) return
    const source = draft ?? controlledSource
    form.reset({ stages: source?.stages.map((stage) => ({
      name: stage.name,
      labProtocolVersionId: stage.labProtocolVersionId,
      requirement: stage.requirement,
      condition: stage.condition ?? '',
      handoffCriteria: stage.handoffCriteria ?? '',
    })) ?? [emptyStage()] })
    setLoadedKey(formKey)
  }, [controlledSource, draft, draftVersionId, form, formKey, loadedKey, openCandidate, workflow])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty || mutation.isSuccess) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [form.formState.isDirty, mutation.isSuccess])

  const leave = () => navigate({ to: '/lab-operations', search: { section: 'protocols' } })
  if (!canManage) return <PageAlert title="Workflow authoring unavailable" message="An active Protocol Administrator role is required." destructive />
  if (authProvider === 'mock') return <PageAlert title="Workflow authoring is paused" message="Connect a real Phaeno session to create a controlled workflow version." />
  if (dashboard.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading service workflow…</p></main>
  if (dashboard.error || !workflow) return <PageAlert title="Service workflow could not be loaded" message={getLabOperationsError(dashboard.error, 'Return to Lab operations and try again.')} destructive />
  if (draftVersionId && (!draft || draft.status !== 'Draft')) return <PageAlert title="This workflow version cannot be edited" message="Only the current Draft version can be changed." destructive />
  if (!draftVersionId && openCandidate) return <PageAlert title="A workflow candidate is already open" message="Continue, promote, withdraw, or discard the existing candidate first." destructive />

  const protocolOptions = dashboard.data!.protocols.flatMap((protocol) => protocol.versions
    .filter((version) => version.status === 'Approved' || version.status === 'Active')
    .map((version) => ({ value: version.id, label: `${protocol.name} v${version.protocolVersion} · Approved` })))

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground"><Link to="/lab-operations" search={{ section: 'protocols' }} className="inline-flex items-center gap-1 hover:underline"><ArrowLeft className="size-4" /> Protocols</Link></p>
          <h1 className="mt-2 text-3xl font-semibold">{workflow.name} · workflow v{draft?.workflowVersion ?? workflow.latestVersion + 1}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Arrange exact approved protocol versions in operating order. Production jobs retain this complete version even after a replacement is promoted.</p>
        </div>
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm"><span className="text-muted-foreground">Marketed service</span><span className="ml-2 font-mono font-medium">{workflow.serviceKey}</span></div>
      </section>

      {mutation.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Workflow draft was not saved</AlertTitle><AlertDescription>{getLabOperationsError(mutation.error, 'Review the stages and try again.')}</AlertDescription></Alert> : null}

      <form className="space-y-5" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <RequiredLegend />
        <Card>
          <CardHeader><CardTitle>Ordered protocol stages</CardTitle><CardDescription>Required stages are standard work; optional stages may be selected; conditional stages document exactly when they apply.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {stages.fields.map((stage, index) => {
              const errors = form.formState.errors.stages?.[index]
              const requirement = form.watch(`stages.${index}.requirement`)
              return (
                <Card key={stage.id} size="sm" className="overflow-visible">
                  <CardHeader className="border-b">
                    <CardTitle>Stage {index + 1}</CardTitle>
                    <CardDescription>One controlled protocol and the handoff needed to continue.</CardDescription>
                    <CardAction><div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move stage ${index + 1} up`} disabled={index === 0} onClick={() => stages.move(index, index - 1)}><ArrowUp /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move stage ${index + 1} down`} disabled={index === stages.fields.length - 1} onClick={() => stages.move(index, index + 1)}><ArrowDown /></Button>
                      <Button type="button" variant="destructive" size="icon-sm" aria-label={`Remove stage ${index + 1}`} disabled={stages.fields.length === 1} onClick={() => stages.remove(index)}><Trash2 /></Button>
                    </div></CardAction>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-2">
                    <Field label="Stage name" id={`workflow-stage-${index}-name`} required error={errors?.name?.message}><Input id={`workflow-stage-${index}-name`} {...form.register(`stages.${index}.name`)} /></Field>
                    <Field label="Protocol version" id={`workflow-stage-${index}-protocol`} required error={errors?.labProtocolVersionId?.message}><select id={`workflow-stage-${index}-protocol`} className={selectClass} {...form.register(`stages.${index}.labProtocolVersionId`)}><option value="">Select…</option>{protocolOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
                    <Field label="Requirement" id={`workflow-stage-${index}-requirement`} required error={errors?.requirement?.message}><select id={`workflow-stage-${index}-requirement`} className={selectClass} {...form.register(`stages.${index}.requirement`)}><option value="Required">Required</option><option value="Optional">Optional</option><option value="Conditional">Conditional</option></select></Field>
                    {requirement === 'Conditional' ? <Field label="When this stage applies" id={`workflow-stage-${index}-condition`} required error={errors?.condition?.message}><Input id={`workflow-stage-${index}-condition`} {...form.register(`stages.${index}.condition`)} /></Field> : <div />}
                    <div className="lg:col-span-2"><Field label="Handoff criteria" id={`workflow-stage-${index}-handoff`} error={errors?.handoffCriteria?.message}><textarea id={`workflow-stage-${index}-handoff`} className={textareaClass} {...form.register(`stages.${index}.handoffCriteria`)} placeholder="Evidence or state required before the next stage may begin" /></Field></div>
                  </CardContent>
                </Card>
              )
            })}
            {form.formState.errors.stages?.root?.message ? <p className="text-sm text-destructive" role="alert">{form.formState.errors.stages.root.message}</p> : null}
            <Button type="button" variant="outline" onClick={() => stages.append(emptyStage())}><Plus data-icon="inline-start" /> Add stage</Button>
          </CardContent>
        </Card>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => form.formState.isDirty ? setDiscardOpen(true) : void leave()}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving draft…' : draft ? 'Save draft' : 'Create workflow draft'}</Button>
        </div>
      </form>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent><DialogHeader><DialogTitle>Discard workflow changes?</DialogTitle><DialogDescription>Unsaved stage order and selections will be lost. The previously saved workflow remains unchanged.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Keep editing</Button></DialogClose><Button type="button" variant="destructive" onClick={() => void leave()}>Discard changes</Button></DialogFooter></DialogContent>
      </Dialog>
    </main>
  )
}

function Field({ label, id, required, error, children }: { label: string; id: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <div><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label><div className="mt-2">{children}</div>{error ? <p className="mt-1 text-sm text-destructive" role="alert">{error}</p> : null}</div>
}

function PageAlert({ title, message, destructive = false }: { title: string; message: string; destructive?: boolean }) {
  return <main className="page-wrap px-4 py-8"><Alert variant={destructive ? 'destructive' : 'default'}><AlertTitle>{title}</AlertTitle><AlertDescription>{message}</AlertDescription></Alert></main>
}
