import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { SessionCapabilities } from '#/api/session'
import { listOperationalAttention } from '#/api/pseq-order-to-cash'
import { listSaleSummaryFailures } from '#/api/commercial-sale-summaries'
import { getOrderErrorMessage, isOrderFeatureDisabled } from '#/api/order-management'
import { canAccessOperationalAttention } from '#/features/orders/order-sections'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

export function NeedsAttentionSummary({ capabilities, enabled }: { capabilities?: SessionCapabilities; enabled: boolean }) {
  const operational = canAccessOperationalAttention(capabilities)
  const crm = Boolean(capabilities?.canManageOrderConfiguration)
  const attention = useQuery({ queryKey: ['operational-attention', 'dashboard'], queryFn: () => listOperationalAttention(), enabled: enabled && operational })
  const summaries = useQuery({ queryKey: ['commercial-sale-summary-attention', 1], queryFn: () => listSaleSummaryFailures(1), enabled: enabled && crm })
  if (!operational && !crm) return null
  const items = attention.data ?? []
  const error = attention.error ?? summaries.error
  const disabled = isOrderFeatureDisabled(attention.error, 'attention_operations_disabled')
  return <Card className="mb-6 gap-0 py-0">
    <CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Needs attention</CardTitle><CardDescription>Unresolved work across your assigned service workflows.</CardDescription><CardAction><Button asChild size="sm" variant="outline"><Link to="/dashboard/attention">View all<span className="sr-only"> work needing attention</span></Link></Button></CardAction></CardHeader>
    <CardContent className="space-y-3 p-4">
      {!enabled ? <p className="text-sm text-muted-foreground">Use a connected session to load current work.</p> : <>
        {attention.isLoading || summaries.isLoading ? <p role="status">Loading attention…</p> : null}
        {disabled ? <p>Operational attention queues are not enabled.</p> : attention.error ? <p role="alert">{getOrderErrorMessage(attention.error, 'Operational attention could not be loaded. Open the queue to retry.')}</p> : null}
        {summaries.error ? <p role="alert">{getOrderErrorMessage(summaries.error, 'CRM recovery could not be loaded. Open the queue to retry.')}</p> : null}
        {operational && attention.data ? <><p className="text-sm">{items.length} unresolved operational items</p><ul className="divide-y" aria-label="Priority attention items">{items.slice().sort((a, b) => b.ageDays - a.ageDays).slice(0, 5).map(item => <li key={item.id} className="py-2"><p className="font-medium">{item.summary}</p><p className="text-xs text-muted-foreground">{item.nextAction} · {item.ownerUserId ? 'Assigned' : 'Unassigned'} · {item.ageDays} days</p></li>)}</ul></> : null}
        {crm && summaries.data ? <p className="text-sm">{summaries.data.totalCount} CRM sale summaries awaiting recovery</p> : null}
        {(!operational || attention.data) && (!crm || summaries.data) && !items.length && !summaries.data?.totalCount && !error ? <p className="text-sm text-muted-foreground">No work needs attention.</p> : null}
      </>}
    </CardContent>
  </Card>
}
