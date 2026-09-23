import { useQuery } from '@tanstack/react-query'
import { getCustomerLabDashboardSummary, type CustomerLabDashboardView } from '#/api/order-management'
import { Button } from '#/components/ui/button'
import { usePhaenoSession } from '#/features/auth/session-context'
import { cn } from '#/lib/utils'

export function CustomerDashboardMetrics({ view, onSelect }: {
  view: CustomerLabDashboardView
  onSelect: (view: CustomerLabDashboardView) => void
}) {
  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const enabled = authProvider !== 'mock' && session?.capabilities.canViewLabServiceOrders === true
    && Boolean(selectedOrganizationId && selectedDepartmentId)
  const summary = useQuery({
    queryKey: ['lab-service-orders', 'dashboard-summary', selectedOrganizationId, selectedDepartmentId],
    queryFn: getCustomerLabDashboardSummary,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: 30_000,
  })
  const data = enabled && !summary.isError ? summary.data : undefined
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
    {enabled && summary.isPending ? <p role="status" className="text-xs text-muted-foreground">Loading dashboard totals…</p> : null}
    {enabled && summary.isError ? <div role="status" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      Dashboard totals are temporarily unavailable.
      <Button type="button" size="sm" variant="ghost" disabled={summary.isFetching} onClick={() => { void summary.refetch() }}>Refresh totals</Button>
    </div> : null}
  </section>
}
