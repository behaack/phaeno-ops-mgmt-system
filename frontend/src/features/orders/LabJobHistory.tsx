import { formatDisplayTimestamp } from '#/lib/display-format'
import { CustomerText } from '#/features/customer-i18n/customer-text'
import { Download } from 'lucide-react'
import type { LabServiceOrder } from '#/api/order-management'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { quoteDecisionHistoryLabel } from './quote-decision-history'

export function LabJobHistory({ order }: { order: LabServiceOrder }) {
  const events = [
    ...order.timeline.map(item => ({ id: `order-${item.id}`, date: item.occurredAt, title: quoteDecisionHistoryLabel(item, order.quotes), reason: item.reason })),
    ...(order.timing?.changes ?? []).map(change => ({ id: `timing-${change.id}`, date: change.occurredAtUtc, title: `Expected completion changed: ${date(change.previousExpectedAtUtc)} → ${date(change.expectedAtUtc)}`, reason: [change.reason, change.customerSafeNote].filter(Boolean).join(': ') })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  return <>
    <Card><CardHeader><CardTitle><CustomerText message="m_928f4fe52982" /></CardTitle><CardDescription><CustomerText message="m_dd5d52b47ccd" /></CardDescription></CardHeader><CardContent>
      {events.length ? <ol className="divide-y">{events.map(event => <li key={event.id} className="space-y-1 py-3"><p className="font-medium">{event.title}</p><p className="text-xs text-muted-foreground">{date(event.date)}</p>{event.reason ? <p className="whitespace-pre-wrap text-sm wrap-anywhere">{event.reason}</p> : null}</li>)}</ol> : <p className="text-sm text-muted-foreground"><CustomerText message="m_19447e1565d1" /></p>}
    </CardContent></Card>
    {(order.requestRevisions?.length ?? 0) > 0 ? <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CustomerText message="m_aeb230e887d2" /></summary><p className="mt-2 text-sm text-muted-foreground"><CustomerText message="m_7cabcf922046" /></p><div className="mt-2 divide-y">{order.requestRevisions?.map(revision => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium"><CustomerText message="m_e330d85ff901" />{revision.revision}</p><p className="text-xs text-muted-foreground"><CustomerText message="m_f0833d281377" />{date(revision.submittedAt)}</p>{revision.correctionReason ? <p className="mt-1 text-sm"><CustomerText message="m_1bf271ca3b10" />{revision.correctionReason}</p> : null}</div><Button variant="outline" onClick={() => downloadSnapshot(`${order.orderNumber}-request-r${revision.revision}.json`, revision.snapshotJson)}><Download data-icon="inline-start" /><CustomerText message="m_65f995a5838d" /></Button></div>)}</div></details> : null}
  </>
}
function date(value: string) { return formatDisplayTimestamp(value, { seconds: true }) }
function downloadSnapshot(name: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url)
}
