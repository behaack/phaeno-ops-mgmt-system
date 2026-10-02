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
    <Card><CardHeader><CardTitle>Order history</CardTitle><CardDescription>Recorded decisions, milestones and timing changes, newest first.</CardDescription></CardHeader><CardContent>
      {events.length ? <ol className="divide-y">{events.map(event => <li key={event.id} className="space-y-1 py-3"><p className="font-medium">{event.title}</p><p className="text-xs text-muted-foreground">{date(event.date)}</p>{event.reason ? <p className="whitespace-pre-wrap text-sm wrap-anywhere">{event.reason}</p> : null}</li>)}</ol> : <p className="text-sm text-muted-foreground">No history recorded.</p>}
    </CardContent></Card>
    {(order.requestRevisions?.length ?? 0) > 0 ? <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Submitted request revisions</summary><p className="mt-2 text-sm text-muted-foreground">Each snapshot preserves the request Phaeno reviewed.</p><div className="mt-2 divide-y">{order.requestRevisions?.map(revision => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">Revision {revision.revision}</p><p className="text-xs text-muted-foreground">Submitted {date(revision.submittedAt)}</p>{revision.correctionReason ? <p className="mt-1 text-sm">Correction: {revision.correctionReason}</p> : null}</div><Button variant="outline" onClick={() => downloadSnapshot(`${order.orderNumber}-request-r${revision.revision}.json`, revision.snapshotJson)}><Download data-icon="inline-start" />Download snapshot</Button></div>)}</div></details> : null}
  </>
}
function date(value: string) { return new Date(value).toLocaleString() }
function downloadSnapshot(name: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url)
}
