import { type CustomerLabDashboardView } from '#/api/order-management'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import type { CustomerDashboardQuery } from './customer-dashboard-query'

export function CustomerDashboardMetrics({ view, onSelect, query, enabled }: {
  view: CustomerLabDashboardView
  onSelect: (view: CustomerLabDashboardView) => void
  query: CustomerDashboardQuery
  enabled: boolean
}) {
  const data = enabled && !query.isError ? query.data?.summary : undefined
  const metrics = [
    { view: 'attention' as const, count: data?.attentionCount, label: data?.attentionCount === 1 ? 'Item requiring attention' : 'Items requiring attention',
      description: 'Requests to review, complete or prepare for shipping.' },
    { view: 'results' as const, count: data?.newResultCount, label: data?.newResultCount === 1 ? 'New result' : 'New results',
      description: 'Released packages not fully downloaded by your Department.' },
  ]
  return <section aria-label="Customer dashboard summary" className="space-y-2">
    <div className="grid overflow-hidden rounded-lg border bg-card text-card-foreground sm:grid-cols-2">
      {metrics.map((metric, index) => <button key={metric.view} type="button" disabled={!data}
        aria-controls="customer-lab-requests" aria-pressed={view === metric.view}
        aria-label={`${metric.count ?? 'Unavailable'} ${metric.label.toLowerCase()}`}
        onClick={() => onSelect(metric.view)}
        className={cn('flex min-w-0 cursor-pointer items-center gap-4 p-5 text-left transition-colors hover:bg-accent/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default disabled:hover:bg-transparent',
          index > 0 && 'border-t sm:border-t-0 sm:border-l', view === metric.view && 'bg-accent/50')}>
        <span aria-hidden="true" className="shrink-0 text-4xl font-bold tracking-tight text-primary tabular-nums">{metric.count ?? '—'}</span>
        <span className="min-w-0"><span className="block font-semibold">{metric.label}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{metric.description}</span></span>
      </button>)}
    </div>
    {enabled && query.isPending ? <p role="status" className="text-xs text-muted-foreground">Loading dashboard totals…</p> : null}
    {enabled && query.isError ? <div role="status" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      Dashboard totals are temporarily unavailable.
      <Button type="button" size="sm" variant="ghost" disabled={query.isFetching} onClick={() => { void query.refetch() }}>Refresh totals</Button>
    </div> : null}
  </section>
}
