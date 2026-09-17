import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { LabServiceWorkflow, LabServiceWorkflowVersion } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

const schema = z.object({ reason: z.string().trim().min(1, 'Enter a reason for bypassing independent review.').max(2000), confirmed: z.boolean().refine(Boolean, 'Confirm that you reviewed this workflow and accept responsibility for the override.') })

export function WorkflowApprovalOverrideDialog({ workflow, version, pending, error, onClose, onApprove }: {
  workflow: LabServiceWorkflow; version: LabServiceWorkflowVersion; pending: boolean; error?: string; onClose: () => void; onApprove: (reason: string) => void
}) {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { reason: '', confirmed: false } })
  const confirmLeave = () => !form.formState.isDirty || window.confirm('Discard the unsaved approval override?')
  const close = () => { if (!pending && confirmLeave()) onClose() }
  useBlocker({ shouldBlockFn: () => pending || !confirmLeave(), enableBeforeUnload: () => pending || form.formState.isDirty })
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="sm:max-w-2xl">
    <DialogHeader><DialogTitle>Administrator approval override</DialogTitle><DialogDescription>{workflow.name} · version {version.workflowVersion}. You are approving your own work without independent review. Your identity, time and reason will be retained. Production promotion is a separate action.</DialogDescription></DialogHeader>
    <ol className="space-y-3">{version.stages.map(stage => <li key={stage.id} className="rounded-md border p-3 text-sm"><p className="font-medium">{stage.sequence}. {stage.name} · {stage.requirement}</p><p>{stage.protocolName} · version {stage.protocolVersion}</p>{stage.condition ? <p>Condition: {stage.condition}</p> : null}{stage.handoffCriteria ? <p>Handoff: {stage.handoffCriteria}</p> : null}</li>)}</ol>
    <form id="workflow-approval-override" className="space-y-3" onSubmit={form.handleSubmit(values => { if (!pending) onApprove(values.reason) })}>
      <Label htmlFor="workflow-override-reason"><RequiredFieldName>Override reason</RequiredFieldName></Label>
      <textarea id="workflow-override-reason" className="min-h-24 w-full rounded-md border bg-background p-3 text-sm" maxLength={2000} disabled={pending} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? 'workflow-override-error' : undefined} {...form.register('reason')} />
      {form.formState.errors.reason ? <p id="workflow-override-error" role="alert" className="text-sm text-destructive">{form.formState.errors.reason.message}</p> : null}
      <Label className="flex cursor-pointer items-start gap-2 leading-5"><input type="checkbox" className="mt-1 cursor-pointer" disabled={pending} {...form.register('confirmed')} /><RequiredFieldName>I reviewed these exact stages and accept responsibility for bypassing independent review.</RequiredFieldName></Label>
      {form.formState.errors.confirmed ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.confirmed.message}</p> : null}
    </form>
    {error ? <Alert variant="destructive"><AlertTitle>Workflow was not approved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button variant="outline" disabled={pending} onClick={close}>Cancel</Button><Button type="submit" form="workflow-approval-override" disabled={pending || !version.stages.length}>{pending ? 'Approving…' : 'Approve with override'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
