import { CompletionForecastDetails } from './CompletionForecast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adjustJobDeadline, getJobDeadline, type JobDeadline } from '#/api/lab-jobs'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { DeadlineBadge } from './JobsList'
import { deadlineDate } from './job-deadlines'

export function useJobDeadline(id: string, enabled: boolean) {
  return useQuery({ queryKey: ['lab-job-deadline', id], queryFn: () => getJobDeadline(id), enabled, refetchInterval: 60_000 })
}

export function JobDeadlinePanel({ data }: { data: JobDeadline }) {
  const { job, deadlineStatus, reason } = data.summary
  return <Card className="mb-5 gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Delivery deadline</CardTitle><DeadlineBadge status={deadlineStatus} /></div></CardHeader><CardContent className="space-y-3 p-4">
    <dl className="grid gap-4 text-sm sm:grid-cols-3">
      {[[job.dueDateAdjusted ? 'Adjusted due date' : 'Delivery due date', deadlineDate(job.dueAtUtc)], ['Original delivery target', deadlineDate(job.originalDueAtUtc)], [job.forecastAdjusted ? 'Staff expected completion' : 'Turnaround baseline', deadlineDate(job.expectedCompletionAtUtc)], ['Portal delivery', `${job.deliveredSampleCount} of ${job.sampleCount} samples`], [job.firstDeliveredAtUtc ? 'First full delivery' : 'Full delivery confirmed by', deadlineDate(job.firstDeliveredAtUtc ?? job.completedAtUtc)], ['Standard turnaround', job.turnaroundDays ? `${job.turnaroundDays} calendar days from acceptance` : 'No standard turnaround recorded']].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}
    </dl>
    <p className="text-sm">{reason}</p>
    {!job.dueAtUtc && !job.turnaroundDays && !job.isComplete && job.operationalStatus !== 'Cancelled' ? <Alert><AlertDescription>Before accepting samples, an operator or supervisor must use the job’s Actions → Set due date. This job has no recorded standard turnaround to calculate a deadline automatically.</AlertDescription></Alert> : null}
    {deadlineStatus === 'CompleteUnverified' ? <p className="text-sm">Published results cover every sample, but the first full-delivery time was not retained. On-time performance is unverified.</p> : null}
    {job.firstDeliveredAtUtc && !job.isComplete ? <p className="text-sm text-destructive">Some results are no longer published. The original delivery time remains in the record.</p> : null}
    {job.firstDeliveredAtUtc && job.originalDueAtUtc ? <p className="text-sm">Against the original target: {Date.parse(job.firstDeliveredAtUtc) > Date.parse(job.originalDueAtUtc) ? 'delivered late' : 'delivered on time'}.</p> : null}
    <p className="text-xs text-muted-foreground">Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}. Standard turnaround is an operating target; any contractual guarantee is governed by the agreement. Changing expected completion does not change the due date.</p>
    {data.summary.forecast ? <CompletionForecastDetails forecast={data.summary.forecast} /> : null}
    {data.changes.length ? <details><summary className="cursor-pointer text-sm font-medium">Due-date history ({data.changes.length})</summary><ol className="mt-3 divide-y">{data.changes.map(c => <li className="space-y-1 py-3 text-sm" key={c.id}><p>{deadlineDate(c.previousDueAtUtc)} → {deadlineDate(c.dueAtUtc)}</p><p>{c.reason}</p><p className="text-xs text-muted-foreground">{c.actorName} · {deadlineDate(c.occurredAtUtc)}</p></li>)}</ol></details> : null}
  </CardContent></Card>
}

const schema = z.object({ due: z.string().min(1, 'Enter a due date and time.').refine(v => Number.isFinite(Date.parse(v)), 'Enter a valid date and time.'), reason: z.string().trim().min(1, 'Explain the adjustment.').max(2000) })
function localInput(value: string | null) { if (!value) return ''; const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) }
export function AdjustJobDeadlineDialog({ data, onClose }: { data: JobDeadline; onClose: () => void }) {
  const client = useQueryClient()
  const job = data.summary.job
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { due: localInput(job.dueAtUtc), reason: '' } })
  const mutation = useMutation({ mutationFn: (values: z.infer<typeof schema>) => adjustJobDeadline(job.id, { version: job.version, dueAtUtc: new Date(values.due).toISOString(), reason: values.reason }), onSuccess: async () => {
    await Promise.all(['lab-jobs', 'lab-job-deadline', 'lab-work-order', 'lab-service-order', 'platform-lab-service-order'].map(key => client.invalidateQueries({ queryKey: [key] })))
    onClose()
  } })
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}><DialogContent><DialogHeader><DialogTitle>{job.dueAtUtc ? 'Adjust delivery due date' : 'Set delivery due date'}</DialogTitle><DialogDescription>{job.dueAtUtc ? 'Retain the original target and explain the new date.' : 'Set the required delivery deadline before accepting samples.'} For commercial jobs, the ordering organization receives this date and reason.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit(v => mutation.mutate(v))}>
    <div className="space-y-1"><Label htmlFor="job-due"><RequiredFieldName>Delivery due date and time</RequiredFieldName></Label><Input id="job-due" type="datetime-local" {...form.register('due')} aria-invalid={Boolean(form.formState.errors.due)} aria-describedby="job-due-help job-due-error" /><p id="job-due-help" className="text-xs text-muted-foreground">Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. This is the exact deadline cutoff.</p><p id="job-due-error" className="text-sm text-destructive">{form.formState.errors.due?.message}</p></div>
    <div className="space-y-1"><Label htmlFor="job-due-reason"><RequiredFieldName>Reason (safe to share with the customer)</RequiredFieldName></Label><Textarea id="job-due-reason" maxLength={2000} {...form.register('reason')} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby="job-due-reason-error" /><p id="job-due-reason-error" className="text-sm text-destructive">{form.formState.errors.reason?.message}</p></div>
    {mutation.error ? <Alert variant="destructive"><AlertDescription>{getLabOperationsError(mutation.error, 'The deadline could not be saved. Refresh the job and try again.')}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save due date'}</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
