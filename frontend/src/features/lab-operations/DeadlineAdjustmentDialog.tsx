import { useId, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { adjustJobDeadline, getJobDeadline, type JobDeadline } from '#/api/lab-jobs'
import { getLabOperationsError } from '#/api/lab-operations'
import { confirmPortal } from '#/components/PortalConfirmation'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDecisionDismissal } from '#/features/orders/use-order-decision-dismissal'
import { deadlineDate } from './job-deadlines'

const schema = z.object({ phaseId: z.string().optional(), due: z.string().min(1, 'Enter a due date and time.').refine(v => Number.isFinite(Date.parse(v)), 'Enter a valid date and time.'), reason: z.string().trim().min(1, 'Explain the adjustment.').max(2000) })
type Values = z.infer<typeof schema>
function localInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
export function deadlineDefaults(data: JobDeadline, selectedPhaseId?: string): Values {
  const phase = data.phases?.find(p => p.phaseId === selectedPhaseId && !['ResultsDelivered', 'Cancelled'].includes(p.lifecycle ?? ''))
    ?? data.phases?.find(p => !['ResultsDelivered', 'Cancelled'].includes(p.lifecycle ?? ''))
  return { phaseId: phase?.phaseId ?? undefined, due: localInput(phase ? phase.job.dueAtUtc : data.phases?.length ? null : data.summary.job.dueAtUtc), reason: '' }
}

export function AdjustJobDeadlineDialog({ data, onClose }: { data: JobDeadline; onClose: () => void }) {
  const client = useQueryClient()
  const formId = useId()
  const [reviewed, setReviewed] = useState(data)
  const [reviewRequired, setReviewRequired] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: deadlineDefaults(data) })
  const { isDirty: __formDraftDirty } = form.formState

  const phaseId = form.watch('phaseId')
  const phases = reviewed.phases?.filter(p => !['ResultsDelivered', 'Cancelled'].includes(p.lifecycle ?? '')) ?? []
  const phase = phases.find(p => p.phaseId === phaseId)
  const canAdjust = reviewed.phases?.length ? Boolean(phase) : !reviewed.summary.job.isComplete
  async function refresh() {
    setRefreshing(true)
    try {
      const latest = await getJobDeadline(data.summary.job.id)
      setReviewed(latest)
      setReviewRequired(true)
      setRefreshFailed(false)
    } catch { setRefreshFailed(true) }
    finally { setRefreshing(false) }
  }
  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const savedDate = reviewed.phases?.find(item => item.phaseId === values.phaseId)?.job.dueAtUtc ?? (reviewed.phases?.length ? null : reviewed.summary.job.dueAtUtc)
      const dueAtUtc = savedDate && values.due === localInput(savedDate) ? savedDate : new Date(values.due).toISOString()
      return adjustJobDeadline(reviewed.summary.job.id, { version: reviewed.summary.job.version, phaseId: values.phaseId, dueAtUtc, reason: values.reason })
    },
    onSuccess: async () => {
      dismissal.allowNavigation()
      await Promise.all(['lab-phases', 'lab-jobs', 'lab-job-deadline', 'lab-work-order', 'lab-service-order', 'platform-lab-service-order'].map(key => client.invalidateQueries({ queryKey: [key] })))
      onClose()
    },
    onError: async error => { if (isAxiosError(error) && error.response?.status === 409) { setReviewRequired(true); await refresh() } },
  })
  const busy = mutation.isPending || refreshing
  const dismissal = useOrderDecisionDismissal(__formDraftDirty, busy, onClose, {
    scope: 'deadline adjustment', description: 'Your unsaved delivery date and Customer-safe reason will be discarded. Saved phase deadlines and their history remain unchanged.',
  })
  const currentDue = phase ? phase.job.dueAtUtc : reviewed.phases?.length ? null : reviewed.summary.job.dueAtUtc
  async function changePhase(next: string) {
    if (busy) return
    if (__formDraftDirty && !await confirmPortal('Discard the unsaved deadline adjustment before choosing another phase?')) return
    form.reset(deadlineDefaults(reviewed, next))
    mutation.reset()
  }
  return <><Dialog open onOpenChange={open => { if (!open) dismissal.close() }}><DialogContent>
    <DialogHeader><DialogTitle>{currentDue ? 'Adjust delivery due date' : 'Set delivery due date'}</DialogTitle><DialogDescription>Review the exact phase and its saved deadline. The ordering organization receives the new date and the reason.</DialogDescription></DialogHeader>
    <form id={formId} className="space-y-4" onSubmit={form.handleSubmit(values => { if (!busy && canAdjust && !reviewRequired && !refreshFailed) mutation.mutate(values) })}>
      {reviewed.phases?.length ? <Field><Label htmlFor={`${formId}-phase`}><RequiredFieldName>Phase</RequiredFieldName></Label><NativeSelect id={`${formId}-phase`} required value={phaseId ?? ''} disabled={busy} onChange={event => void changePhase(event.target.value)}>
        {!phase ? <option value="">Choose an unfinished phase</option> : null}{phases.map(item => <option key={item.phaseId} value={item.phaseId ?? ''}>{item.phaseName}</option>)}
      </NativeSelect></Field> : null}
      <p className="text-sm">Current saved deadline: {deadlineDate(currentDue)}</p>
      <Field><Label htmlFor={`${formId}-due`}><RequiredFieldName>Delivery due date and time</RequiredFieldName></Label><FieldDescription id={`${formId}-help`}>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. This is the exact deadline cutoff.</FieldDescription><Input id={`${formId}-due`} required type="datetime-local" disabled={busy} {...form.register('due')} aria-invalid={Boolean(form.formState.errors.due)} aria-describedby={`${formId}-help ${formId}-due-error`} /><FieldError id={`${formId}-due-error`}>{form.formState.errors.due?.message}</FieldError></Field>
      <Field><Label htmlFor={`${formId}-reason`}><RequiredFieldName>Reason (safe to share with the Customer)</RequiredFieldName></Label><Textarea id={`${formId}-reason`} required disabled={busy} maxLength={2000} {...form.register('reason')} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={`${formId}-reason-error`} /><FieldError id={`${formId}-reason-error`}>{form.formState.errors.reason?.message}</FieldError></Field>
    </form>
    {!canAdjust ? <Alert><AlertDescription>This phase has closed or is no longer eligible. Choose an unfinished phase before saving.</AlertDescription></Alert> : null}
    {reviewRequired ? <Alert><AlertDescription>The deadline changed. Your entries are preserved and the latest saved date is shown above. Review both before saving again. <Button variant="outline" disabled={refreshing || refreshFailed || !canAdjust} onClick={() => { setReviewRequired(false); mutation.reset() }}>I have reviewed the latest deadline</Button></AlertDescription></Alert> : null}
    {refreshFailed ? <Alert variant="destructive"><AlertDescription>The latest deadline could not be loaded. Your entries are preserved. <Button variant="outline" disabled={busy} onClick={() => void refresh()}>Retry latest deadline</Button></AlertDescription></Alert> : null}
    {mutation.error && !reviewRequired ? <Alert variant="destructive"><AlertDescription>{getLabOperationsError(mutation.error, 'The deadline could not be saved. Your entries are preserved.')}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button variant="outline" disabled={busy} onClick={dismissal.close}>Cancel</Button><Button type="submit" form={formId} disabled={busy || !__formDraftDirty || !canAdjust || reviewRequired || refreshFailed}>{busy ? 'Saving…' : 'Save due date'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>{dismissal.confirmation}</>
}
