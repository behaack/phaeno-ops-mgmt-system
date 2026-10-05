import type { LabServiceOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { humanizeStatus } from './OrderStatusBadge'
import { customerSpecimenHoldsEnabled, useSpecimenHolds } from './use-specimen-holds'
import { hasMultipleLabPhases } from './lab-job-presentation'

export function LabJobHoldNotice({ order, onReview }: { order: LabServiceOrder; onReview: (phaseId?: string) => void }) {
  const { query } = useSpecimenHolds(order.id)
  if (!customerSpecimenHoldsEnabled) return null
  if (query.error) return <Alert className="mb-5" variant="destructive"><AlertTitle>Sample holds could not be checked</AlertTitle><AlertDescription>Your saved records are preserved. <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Retry holds</Button></AlertDescription></Alert>
  const active = query.data?.holds.filter(hold => hold.state !== 'Released') ?? []
  if (!active.length) return null
  const specimen = query.data?.specimens.find(s => s.id === active[0].labSpecimenId)
  const phaseId = order.samples.find(s => s.id === specimen?.sampleId)?.phaseId ?? undefined
  return <Alert className="mb-5"><AlertTitle>{active.length} sample hold{active.length === 1 ? ' requires' : 's require'} review</AlertTitle><AlertDescription><p>New work and release remain blocked for affected samples until Phaeno approves resumption. Review their status and permitted actions in Progress.</p><Button size="sm" variant="outline" className="mt-2" onClick={() => onReview(phaseId)}>Review holds</Button></AlertDescription></Alert>
}

export function LabJobTrackingSummary({ order }: { order: LabServiceOrder }) {
  const timing = order.timing
  const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : 'Not yet recorded'
  const receiptToAcceptance = timing?.firstReceivedAtUtc && timing.acceptedAtUtc
    ? Math.max(0, (Date.parse(timing.acceptedAtUtc) - Date.parse(timing.firstReceivedAtUtc)) / 86_400_000) : null
  return <div className="space-y-3">
    {hasMultipleLabPhases(order) ? <p className="text-sm text-muted-foreground">Laboratory processing follows phase order. Each phase’s TAT starts when all its required samples are received.</p> : null}
    {order.labReadyForRelease ? <p className="text-sm">Scientific review is complete. Results will appear after release.</p> : null}
    {timing ? <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Job milestones</summary>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{[
        ['First receipt', timing.firstReceivedAtUtc], ['Scientific acceptance', timing.acceptedAtUtc],
        ...((order.phaseCount ?? 1) === 1 ? [['Original target', timing.originalTargetAtUtc], ['Expected completion', timing.expectedCompletionAtUtc], ['Delivery due', timing.deliveryDueAtUtc], ['Original delivery target', timing.originalDeliveryDueAtUtc]] : []),
        ['Laboratory completion', timing.completedAtUtc], ['All samples delivered to Portal', timing.portalDeliveredAtUtc],
      ].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd>{date(value)}</dd></div>)}</dl>
      <p className="mt-3 text-sm">Laboratory schedule: {humanizeStatus(timing.scheduleHealth)}. Completion is separate from release of every required result.</p>
      {receiptToAcceptance !== null ? <p className="mt-2 text-sm">Receipt to acceptance: {receiptToAcceptance.toFixed(1)} days.</p> : null}
    </details> : null}
    {order.labPermittedQcProjectionJson ? <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Approved job QC summary</summary><pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs">{prettyJson(order.labPermittedQcProjectionJson)}</pre></details> : null}
  </div>
}
function prettyJson(value: string) { try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value } }
