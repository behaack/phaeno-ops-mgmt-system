import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage, changeCrmTaskStatus, type CrmTask } from '#/api/crm'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '#/features/orders/use-order-draft-guard'
import { CrmTaskEditDialog } from './CrmTaskEditDialog'
import { refreshCrmTaskViews } from './crm-task-queries'

export function useCrmTaskDialogs() {
  const [editing, setEditing] = useState<CrmTask | null>(null)
  const [changingStatus, setChangingStatus] = useState<CrmTask | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  function restoreFocus() {
    if (trigger.current?.isConnected) trigger.current.focus()
    else (document.getElementById('crm-list-search') ?? document.querySelector<HTMLElement>('[data-crm-new-task]'))?.focus()
  }
  return {
    edit: (task: CrmTask, button: HTMLButtonElement | null) => { trigger.current = button; setEditing(task) },
    status: (task: CrmTask, button: HTMLButtonElement | null) => { trigger.current = button; setChangingStatus(task) },
    open: Boolean(editing || changingStatus),
    dialogs: <>
      {editing ? <CrmTaskEditDialog task={editing} onClose={() => setEditing(null)} onRestoreFocus={restoreFocus} /> : null}
      {changingStatus ? <TaskStatusDialog task={changingStatus} onClose={() => setChangingStatus(null)} onRestoreFocus={restoreFocus} /> : null}
    </>,
  }
}

export function CrmTaskActions({ task, actions }: { task: CrmTask; actions: ReturnType<typeof useCrmTaskDialogs> }) {
  const trigger = useRef<HTMLButtonElement>(null)
  if (!task.isActive || task.status === 'Completed' || task.status === 'Cancelled') return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button ref={trigger} size="sm" variant="outline" aria-label={`Actions for ${task.title}`}>Actions<ChevronDown className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={event => { if (actions.open) event.preventDefault() }}>
        <DropdownMenuItem onSelect={() => actions.edit(task, trigger.current)}>Edit task</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.status(task, trigger.current)}>Update status</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const statusSchema = z.object({ status: z.enum(['Open', 'InProgress', 'Blocked', 'Completed', 'Cancelled']), reason: z.string().trim().max(1000, 'Use 1,000 characters or fewer.') }).superRefine((values, context) => {
  if (values.status === 'Blocked' && !values.reason) context.addIssue({ code: 'custom', path: ['reason'], message: 'Explain why the task is blocked.' })
})
function TaskStatusDialog({ task, onClose, onRestoreFocus }: { task: CrmTask; onClose: () => void; onRestoreFocus: () => void }) {
  const client = useQueryClient()
  const form = useForm<z.infer<typeof statusSchema>>({ resolver: zodResolver(statusSchema), defaultValues: { status: task.status, reason: task.blockedReason ?? '' }, mode: 'onBlur', reValidateMode: 'onChange' })
  const next = form.watch('status')
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof statusSchema>) => changeCrmTaskStatus(task.id, values.status, values.reason || null, task.version),
    onSuccess: async () => { await refreshCrmTaskViews(client); onClose() },
    onError: async () => { await refreshCrmTaskViews(client) },
  })
  useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  function close() { if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard unsaved task status changes?'))) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus() }}>
    <DialogHeader><DialogTitle>Update task status</DialogTitle><DialogDescription>{task.title}</DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(mutation.error)} If the task changed, close this dialog and reopen it to review its current status.</AlertDescription></Alert> : null}
    <form id="crm-task-status" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}>
      <fieldset disabled={mutation.isPending} className="space-y-4">
        <div className="grid gap-1.5"><Label htmlFor="task-next-status">New status</Label><select id="task-next-status" className="h-9 cursor-pointer rounded-md border bg-background px-3 text-sm" {...form.register('status')}><option value="Open">Open</option><option value="InProgress">In progress</option><option value="Blocked">Blocked</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option></select></div>
        <div className="grid gap-1.5"><Label htmlFor="task-status-reason">{next === 'Blocked' ? <RequiredFieldName>Reason</RequiredFieldName> : 'Reason'}</Label><Textarea id="task-status-reason" required={next === 'Blocked'} maxLength={1000} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? 'task-status-reason-error' : undefined} {...form.register('reason')} /><FieldError id="task-status-reason-error">{form.formState.errors.reason?.message}</FieldError></div>
      </fieldset>
    </form>
    <RequiredDialogFooter showLegend={next === 'Blocked'}><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="crm-task-status" disabled={mutation.isPending || !form.formState.isDirty}>{mutation.isPending ? 'Saving…' : 'Save status'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
