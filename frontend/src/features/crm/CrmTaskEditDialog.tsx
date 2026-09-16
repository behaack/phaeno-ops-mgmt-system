import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { apiErrorMessage, getCrmTask, listCrmOwners, updateCrmTask, type CrmTask } from '#/api/crm'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '#/features/orders/use-order-draft-guard'
import { refreshCrmTaskViews } from './crm-task-queries'

const dateField = z.string().refine(value => !value || Number.isFinite(new Date(value).getTime()), 'Enter a valid date and time.')
const schema = z.object({
  title: z.string().trim().min(1, 'Enter a task title.').max(255, 'Use 255 characters or fewer.'),
  description: z.string().trim().max(2000, 'Use 2,000 characters or fewer.'),
  ownerUserId: z.string().min(1, 'Select an owner.'),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']),
  dueAt: dateField,
  reminderAt: dateField,
}).superRefine((values, context) => {
  if (values.dueAt && values.reminderAt && new Date(values.reminderAt) > new Date(values.dueAt)) {
    context.addIssue({ code: 'custom', path: ['reminderAt'], message: 'The reminder cannot occur after the due date.' })
  }
})
type Values = z.infer<typeof schema>

function localDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
function valuesFor(task: CrmTask): Values {
  return { title: task.title, description: task.description ?? '', ownerUserId: task.ownerUserId, priority: task.priority, dueAt: localDate(task.dueAt), reminderAt: localDate(task.reminderAt) }
}
function savedDate(value: string, original: string | null) {
  return value === localDate(original) ? original : value ? new Date(value).toISOString() : null
}

export function CrmTaskEditDialog({ task, onClose, onRestoreFocus }: { task: CrmTask; onClose: () => void; onRestoreFocus?: () => void }) {
  const client = useQueryClient()
  const [baseline, setBaseline] = useState(task)
  const [review, setReview] = useState<CrmTask | null>(null)
  const [reloadError, setReloadError] = useState<string | null>(null)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const saving = useRef(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesFor(task), mode: 'onBlur', reValidateMode: 'onChange' })
  // Subscribe so React Hook Form retains edited fields during a conflict refresh.
  const { isDirty, dirtyFields, errors } = form.formState
  const owners = useQuery({ queryKey: ['crm-owner-choices'], queryFn: listCrmOwners })
  const terminal = baseline.status === 'Completed' || baseline.status === 'Cancelled' || !baseline.isActive
  async function reload() {
    setRefreshing(true)
    setReloadError(null)
    try {
      const latest = await getCrmTask(task.id)
      setBaseline(latest)
      form.reset(valuesFor(latest), { keepDirtyValues: Object.keys(dirtyFields).length > 0 })
      setReview(latest)
      setNeedsRefresh(false)
      await refreshCrmTaskViews(client)
    } catch (error) {
      setReloadError(apiErrorMessage(error))
    } finally { setRefreshing(false) }
  }
  const edit = useMutation({
    mutationFn: async (values: Values) => {
      try {
        return await updateCrmTask(task.id, {
          ...values,
          description: values.description || null,
          dueAt: savedDate(values.dueAt, baseline.dueAt),
          reminderAt: savedDate(values.reminderAt, baseline.reminderAt),
          recurrenceRule: baseline.recurrenceRule,
          companyId: baseline.companyId, contactId: baseline.contactId, leadId: baseline.leadId, opportunityId: baseline.opportunityId,
          version: baseline.version,
        })
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          setNeedsRefresh(true)
          await reload()
        }
        throw error
      }
    },
    onSuccess: async () => {
      form.reset(form.getValues())
      await refreshCrmTaskViews(client)
      onClose()
    },
    onSettled: () => { saving.current = false },
  })
  const busy = edit.isPending || refreshing
  useOrderDraftGuard(isDirty, busy)
  function close() {
    if (!busy && (!isDirty || window.confirm('Discard unsaved task changes?'))) onClose()
  }
  const recurrence = baseline.recurrenceRule?.toLowerCase()
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return <Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent className="max-w-xl" onCloseAutoFocus={event => { if (onRestoreFocus) { event.preventDefault(); onRestoreFocus() } }}>
      <DialogHeader><DialogTitle>Edit task</DialogTitle><DialogDescription>Update {task.title}. Dates and times use {timeZone}. Saving keeps the task's status and related record.</DialogDescription></DialogHeader>
      {terminal ? <Alert><AlertDescription>This task is now {baseline.status.toLowerCase()} and cannot be edited. Your draft is retained here; create a new follow-up task if needed.</AlertDescription></Alert> : null}
      {review && !terminal ? <Alert><AlertDescription><div className="space-y-2">
        <p>This task changed while you were editing. Your edited fields are retained. Review the latest saved values before saving again.</p>
        <dl className="grid gap-1 text-sm">
          <div><dt className="inline font-medium">Title: </dt><dd className="inline">{review.title}</dd></div>
          <div><dt className="inline font-medium">Description: </dt><dd className="inline whitespace-pre-wrap">{review.description || 'None'}</dd></div>
          <div><dt className="inline font-medium">Owner / priority: </dt><dd className="inline">{review.ownerName} / {review.priority}</dd></div>
          <div><dt className="inline font-medium">Due: </dt><dd className="inline">{review.dueAt ? new Date(review.dueAt).toLocaleString() : 'None'}</dd></div>
          <div><dt className="inline font-medium">Reminder: </dt><dd className="inline">{review.reminderAt ? new Date(review.reminderAt).toLocaleString() : 'None'}</dd></div>
          <div><dt className="inline font-medium">Status / recurrence: </dt><dd className="inline">{review.status} / {review.recurrenceRule || 'Does not repeat'}</dd></div>
        </dl>
        <Button type="button" variant="outline" disabled={busy} onClick={() => { setReview(null); edit.reset() }}>I have reviewed the changes</Button>
      </div></AlertDescription></Alert> : null}
      {needsRefresh && !refreshing ? <Alert variant="destructive"><AlertDescription><p>{reloadError || 'The task changed. Refresh its saved values before trying again.'}</p><Button type="button" variant="outline" onClick={() => void reload()}>Refresh task</Button></AlertDescription></Alert> : null}
      {edit.error && !review && !needsRefresh && !terminal ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(edit.error)}</AlertDescription></Alert> : null}
      <form id="crm-task-edit" noValidate onSubmit={form.handleSubmit(values => {
        if (saving.current || busy || terminal || review || needsRefresh) return
        if (recurrence && !values.dueAt) { form.setError('dueAt', { message: 'Keep a due date for this recurring task.' }, { shouldFocus: true }); return }
        saving.current = true
        edit.mutate(values)
      })}>
        <fieldset disabled={busy || terminal} className="space-y-4">
          <div className="grid gap-1.5"><Label htmlFor="edit-task-title"><RequiredFieldName>Title</RequiredFieldName></Label><Input id="edit-task-title" required maxLength={255} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'edit-task-title-error' : undefined} {...form.register('title')} /><FieldError id="edit-task-title-error">{errors.title?.message}</FieldError></div>
          <div className="grid gap-1.5"><Label htmlFor="edit-task-description">Description</Label><Textarea id="edit-task-description" rows={3} maxLength={2000} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'edit-task-description-error' : undefined} {...form.register('description')} /><FieldError id="edit-task-description-error">{errors.description?.message}</FieldError></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label htmlFor="edit-task-owner"><RequiredFieldName>Owner</RequiredFieldName></Label><select id="edit-task-owner" required className="h-9 w-full min-w-0 cursor-pointer rounded-md border bg-background px-3 text-sm" aria-invalid={Boolean(errors.ownerUserId)} aria-describedby={errors.ownerUserId ? 'edit-task-owner-error' : undefined} {...form.register('ownerUserId')}>
              {!(owners.data ?? []).some(owner => owner.id === baseline.ownerUserId) ? <option value={baseline.ownerUserId}>{baseline.ownerName} · current owner</option> : null}
              {(owners.data ?? []).map(owner => <option key={owner.id} value={owner.id}>{owner.firstName} {owner.lastName} · {owner.email}</option>)}
            </select><FieldError id="edit-task-owner-error">{errors.ownerUserId?.message}</FieldError></div>
            <div className="grid gap-1.5"><Label htmlFor="edit-task-priority"><RequiredFieldName>Priority</RequiredFieldName></Label><select id="edit-task-priority" required className="h-9 cursor-pointer rounded-md border bg-background px-3 text-sm" {...form.register('priority')}>{['Low', 'Normal', 'High', 'Urgent'].map(value => <option key={value}>{value}</option>)}</select></div>
          </div>
          {owners.error ? <p role="status" className="text-sm">Owner choices could not be loaded. The current owner is retained. <Button type="button" variant="link" onClick={() => void owners.refetch()}>Retry owners</Button></p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label htmlFor="edit-task-due">{recurrence ? <RequiredFieldName>Due</RequiredFieldName> : 'Due'}</Label><Input id="edit-task-due" type="datetime-local" className="dark:[color-scheme:dark]" required={Boolean(recurrence)} aria-invalid={Boolean(errors.dueAt)} aria-describedby={errors.dueAt ? 'edit-task-due-error' : 'edit-task-schedule-help'} {...form.register('dueAt')} /><FieldError id="edit-task-due-error">{errors.dueAt?.message}</FieldError></div>
            <div className="grid gap-1.5"><Label htmlFor="edit-task-reminder">Reminder</Label><Input id="edit-task-reminder" type="datetime-local" className="dark:[color-scheme:dark]" aria-invalid={Boolean(errors.reminderAt)} aria-describedby={errors.reminderAt ? 'edit-task-reminder-error' : 'edit-task-schedule-help'} {...form.register('reminderAt')} /><FieldError id="edit-task-reminder-error">{errors.reminderAt?.message}</FieldError></div>
          </div>
          <p id="edit-task-schedule-help" className="text-sm text-muted-foreground">Review the reminder when changing the due date; it stays at its current time unless you edit it.{recurrence ? ` This task repeats ${recurrence}. When completed, the next task is scheduled from this due date using the same reminder offset, details and owner. Rescheduling shifts that next occurrence too.` : ' This task does not repeat.'}</p>
        </fieldset>
      </form>
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button type="submit" form="crm-task-edit" disabled={busy || !isDirty || terminal || Boolean(review) || needsRefresh}>{busy ? 'Saving…' : 'Save changes'}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}
