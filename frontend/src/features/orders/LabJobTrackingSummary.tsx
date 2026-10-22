import { formatDisplayTimestamp } from '#/lib/display-format'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import type { LabServiceOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { humanizeStatus } from './OrderStatusBadge'
import { customerSpecimenHoldsEnabled, useSpecimenHolds } from './use-specimen-holds'
import { hasMultipleLabPhases } from './lab-job-presentation'

export function LabJobHoldNotice({ order, onReview }: { order: LabServiceOrder; onReview: (phaseId?: string) => void }) {
  const __customerText = useCustomerText()

  const { query } = useSpecimenHolds(order.id)
  if (!customerSpecimenHoldsEnabled) return null
  if (query.error) return <Alert className="mb-5" variant="destructive"><AlertTitle><CustomerText message="m_08125f1e3a74" /></AlertTitle><AlertDescription><CustomerText message="m_e717cd62e9b9" /><Button variant="outline" size="sm" onClick={() => void query.refetch()}><CustomerText message="m_9f486333889f" /></Button></AlertDescription></Alert>
  const active = query.data?.holds.filter(hold => hold.state !== 'Released') ?? []
  if (!active.length) return null
  const specimen = query.data?.specimens.find(s => s.id === active[0].labSpecimenId)
  const phaseId = order.samples.find(s => s.id === specimen?.sampleId)?.phaseId ?? undefined
  return <Alert className="mb-5"><AlertTitle>{active.length} <CustomerText message="m_ac8b351aae31" />{active.length === 1 ? <CustomerSourceText source={" requires"} /> : __customerText('m_78b9e0bccaec')} <CustomerText message="m_68338686d5cd" /></AlertTitle><AlertDescription><p><CustomerText message="m_b8452850740d" /></p><Button size="sm" variant="outline" className="mt-2" onClick={() => onReview(phaseId)}><CustomerText message="m_fd4a844742d8" /></Button></AlertDescription></Alert>
}

export function LabJobTrackingSummary({ order }: { order: LabServiceOrder }) {
  const timing = order.timing
  const date = (value: string | null | undefined) => value ? formatDisplayTimestamp(value, { seconds: true }) : 'Not yet recorded'
  const receiptToAcceptance = timing?.firstReceivedAtUtc && timing.acceptedAtUtc
    ? Math.max(0, (Date.parse(timing.acceptedAtUtc) - Date.parse(timing.firstReceivedAtUtc)) / 86_400_000) : null
  return <div className="space-y-3">
    {hasMultipleLabPhases(order) ? <p className="text-sm text-muted-foreground"><CustomerText message="m_aac727633a70" /></p> : null}
    {order.labReadyForRelease ? <p className="text-sm"><CustomerText message="m_cf2a2a2774e4" /></p> : null}
    {timing ? <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CustomerText message="m_e031d0e84d16" /></summary>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{[
        ['First receipt', timing.firstReceivedAtUtc], ['Scientific acceptance', timing.acceptedAtUtc],
        ...((order.phaseCount ?? 1) === 1 ? [['Original target', timing.originalTargetAtUtc], ['Expected completion', timing.expectedCompletionAtUtc], ['Delivery due', timing.deliveryDueAtUtc], ['Original delivery target', timing.originalDeliveryDueAtUtc]] : []),
        ['Laboratory completion', timing.completedAtUtc], ['All samples delivered to Portal', timing.portalDeliveredAtUtc],
      ].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd>{date(value)}</dd></div>)}</dl>
      <p className="mt-3 text-sm"><CustomerText message="m_550d3b2b6ff2" />{humanizeStatus(timing.scheduleHealth)}<CustomerText message="m_2703d75fc60b" /></p>
      {receiptToAcceptance !== null ? <p className="mt-2 text-sm"><CustomerText message="m_28c1f4a2e76d" />{receiptToAcceptance.toFixed(1)} <CustomerText message="m_914beb1c738b" /></p> : null}
    </details> : null}
    {order.labPermittedQcProjectionJson ? <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CustomerText message="m_163f1cbf1fc5" /></summary><pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs">{prettyJson(order.labPermittedQcProjectionJson)}</pre></details> : null}
  </div>
}
function prettyJson(value: string) { try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value } }
