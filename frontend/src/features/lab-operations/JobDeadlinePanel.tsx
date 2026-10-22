import { CompletionForecastDetails } from './CompletionForecast'
import { useQuery } from '@tanstack/react-query'
import { getJobDeadline, type JobDeadline } from '#/api/lab-jobs'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { DeadlineBadge } from './JobsList'
import { deadlineDate } from './job-deadlines'

export function useJobDeadline(id: string, enabled: boolean) {
  return useQuery({ queryKey: ['lab-job-deadline', id], queryFn: () => getJobDeadline(id), enabled, refetchInterval: 60_000 })
}

export function JobDeadlinePanel({ data }: { data: JobDeadline }) {
  const { job, deadlineStatus, reason } = data.summary
  return <Card className="mb-5 gap-0 py-0"><CardHeader ><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Delivery deadline</CardTitle><DeadlineBadge status={deadlineStatus} /></div></CardHeader><CardContent className="space-y-3 p-4">
    {data.phases?.length ? <div className="space-y-3">{data.phases.map(p => <article key={p.phaseId} className="rounded-md border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{p.phaseName} · {p.lifecycle}</h3><DeadlineBadge status={p.deadlineStatus} /></div><p className="mt-2">{Object.entries(p.stageCounts).map(([stage, count]) => `${count} ${stage.replace(/([a-z])([A-Z])/g, '$1 $2')}`).join(' · ')}</p><p className="mt-2">Delivery due: {deadlineDate(p.job.dueAtUtc)} · Original: {deadlineDate(p.job.originalDueAtUtc)} · TAT: {p.job.turnaroundDays} business days after complete phase tube receipt.</p><p className="mt-2">{p.job.freezerBoxBarcodes.length ? `Freezer boxes: ${p.job.freezerBoxBarcodes.join(', ')}` : 'Freezer boxes not recorded'} · {p.job.deliveredSampleCount} / {p.job.sampleCount} samples delivered.</p><p className="mt-2">{p.reason}</p></article>)}</div> : null}
    <dl className="grid gap-4 text-sm sm:grid-cols-3">
      {[[job.dueDateAdjusted ? 'Adjusted due date' : 'Delivery due date', deadlineDate(job.dueAtUtc)], ['Original delivery target', deadlineDate(job.originalDueAtUtc)], [job.forecastAdjusted ? 'Staff expected completion' : 'Turnaround baseline', deadlineDate(job.expectedCompletionAtUtc)], ['Portal delivery', `${job.deliveredSampleCount} of ${job.sampleCount} samples`], [job.firstDeliveredAtUtc ? 'First full delivery' : 'Full delivery confirmed by', deadlineDate(job.firstDeliveredAtUtc ?? job.completedAtUtc)], ['Delivery target', job.turnaroundDays ? job.turnaroundPolicyKey === 'business-days-after-full-receipt' ? `${job.turnaroundDays} business days after all required tubes are received` : `${job.turnaroundDays} calendar days from acceptance` : 'No standard turnaround recorded']].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}
    </dl>
    <p className="text-sm">{reason}</p>
    {!job.dueAtUtc && !job.turnaroundDays && !job.isComplete && job.operationalStatus !== 'Cancelled' ? <Alert><AlertDescription>This historical Job has no agreed turnaround. An operator or supervisor can record its due date from Actions → Set due date; physical tube receipt and acceptance can continue.</AlertDescription></Alert> : null}
    {deadlineStatus === 'CompleteUnverified' ? <p className="text-sm">Published results cover every sample, but the first full-delivery time was not retained. On-time performance is unverified.</p> : null}
    {job.firstDeliveredAtUtc && !job.isComplete ? <p className="text-sm text-destructive">Some results are no longer published. The original delivery time remains in the record.</p> : null}
    {job.firstDeliveredAtUtc && job.originalDueAtUtc ? <p className="text-sm">Against the original target: {Date.parse(job.firstDeliveredAtUtc) > Date.parse(job.originalDueAtUtc) ? 'delivered late' : 'delivered on time'}.</p> : null}
    <p className="text-xs text-muted-foreground">Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}. Standard turnaround is an operating target; any contractual guarantee is governed by the agreement. Changing expected completion does not change the due date.</p>
    {data.summary.forecast ? <CompletionForecastDetails forecast={data.summary.forecast} /> : null}
    {data.changes.length ? <details><summary className="cursor-pointer text-sm font-medium">Due-date history ({data.changes.length})</summary><ol className="mt-3 divide-y">{data.changes.map(c => <li className="space-y-1 py-3 text-sm" key={c.id}><p>{deadlineDate(c.previousDueAtUtc)} → {deadlineDate(c.dueAtUtc)}</p><p>{c.reason}</p><p className="text-xs text-muted-foreground">{c.actorName} · {deadlineDate(c.occurredAtUtc)}</p></li>)}</ol></details> : null}
  </CardContent></Card>
}

export { AdjustJobDeadlineDialog } from './DeadlineAdjustmentDialog'
