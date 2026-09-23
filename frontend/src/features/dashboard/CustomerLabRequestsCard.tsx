import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { listLabDashboardRequests, type CustomerLabDashboardView, type OrderListItem } from '#/api/order-management'
import type { SessionCapabilities } from '#/api/session'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '#/components/ui/card'
import { usePhaenoSession } from '#/features/auth/session-context'
import { OrderStatusBadge } from '#/features/orders/OrderStatusBadge'

export function CustomerLabRequestsCard({ view = 'active' }: { view?: CustomerLabDashboardView }) {
  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const [page, setPage] = useState(1)
  const mock = authProvider === 'mock'
  const canView = session?.capabilities.canViewLabServiceOrders === true
  const hasScope = Boolean(selectedOrganizationId && selectedDepartmentId)
  const requests = useQuery({
    queryKey: ['lab-service-orders', 'dashboard', selectedOrganizationId, selectedDepartmentId, view, page],
    queryFn: () => listLabDashboardRequests(page, view),
    enabled: !mock && canView && hasScope,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: 30_000,
  })
  if (!canView) return null

  const data = !mock && hasScope && !requests.isError ? requests.data : undefined
  return <Card id="customer-lab-requests" aria-labelledby="customer-lab-requests-heading" className="min-w-0">
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle id="customer-lab-requests-heading">{view === 'attention' ? 'Requests requiring attention' : view === 'results' ? 'Jobs with new results' : 'Lab service requests'}</CardTitle>
        {data ? <Badge variant="outline">{data.totalCount} {view === 'active' ? 'active ' : ''}{view === 'results' ? data.totalCount === 1 ? 'Job' : 'Jobs' : data.totalCount === 1 ? 'request' : 'requests'}</Badge> : null}
      </div>
      <CardDescription>{view === 'results' ? 'Open a Job to download its released results. A Job can contain more than one new result package.' : 'Open each Job to review pricing, complete requested work, or follow progress. Pricing reviews appear first.'}</CardDescription>
    </CardHeader>
    <CardContent aria-busy={requests.isFetching}>
      {mock ? <p className="text-sm text-muted-foreground">Live requests are unavailable in mock-session mode.</p>
        : !hasScope ? <p className="text-sm text-muted-foreground">Select a Department to see its requests.</p>
          : requests.isError ? <Alert variant="destructive"><AlertTitle>Requests could not be loaded</AlertTitle>
            <AlertDescription>Refresh to see the current work for this Department.
              <Button type="button" variant="outline" disabled={requests.isFetching} onClick={() => { void requests.refetch() }}>Retry requests</Button>
            </AlertDescription></Alert>
            : requests.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading your requests…</p>
              : data?.items.length ? <ul className="divide-y" aria-label={view === 'results' ? 'Jobs with new results' : 'Active laboratory requests'}>
                {data.items.map(order => {
                  const next = view === 'results' ? { label: 'View results', owner: 'New results', detail: 'Open Files and results to download the released packages for this Job.' } : requestNextStep(order, session?.capabilities)
                  const name = order.reference || order.number
                  return <li key={order.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1 basis-64 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to="/lab-services/$orderId" params={{ orderId: order.id }} className="cursor-pointer rounded-sm font-bold wrap-anywhere text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{name}</Link>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">Order reference: {order.number}</p>
                      <p className="text-sm"><strong>{next.owner}:</strong> {next.detail}</p>
                    </div>
                    <Button asChild variant="outline" className="max-w-full whitespace-normal text-left">
                      <Link to="/lab-services/$orderId" params={{ orderId: order.id }} aria-label={`${next.label} for ${name}`}>{next.label}</Link>
                    </Button>
                  </li>
                })}
              </ul> : <p role="status" className="text-sm text-muted-foreground">{data?.totalCount ? 'No requests on this page. Return to the previous page.' : view === 'results' ? 'No new results awaiting download.' : view === 'attention' ? 'No requests require attention.' : 'No active laboratory requests. Completed requests remain in Lab services.'}</p>}
    </CardContent>
    <CardFooter className="flex flex-wrap justify-between gap-3">
      <Button asChild variant="ghost"><Link to="/lab-services">View all lab services</Link></Button>
      {data && (page > 1 || data.totalCount > data.pageSize) ? <nav aria-label="Lab request pages" className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Page {page} of {Math.max(page, Math.ceil(data.totalCount / data.pageSize))}</span>
        <Button type="button" variant="outline" disabled={page === 1 || requests.isFetching} onClick={() => setPage(value => value - 1)}>Previous</Button>
        <Button type="button" variant="outline" disabled={page * data.pageSize >= data.totalCount || requests.isFetching} onClick={() => setPage(value => value + 1)}>Next</Button>
      </nav> : null}
    </CardFooter>
  </Card>
}

function requestNextStep(order: OrderListItem, capabilities?: SessionCapabilities) {
  const canSubmit = capabilities?.canSubmitLabServiceRequests === true
  const canAccept = capabilities?.canAcceptLabServiceQuotes === true
  const canShip = capabilities?.canManageSampleShipping === true
  switch (order.status) {
    case 'QuoteIssued':
      return { label: canAccept ? 'Review pricing' : 'View pricing', owner: canAccept ? 'Next step' : 'Administrator action',
        detail: canAccept ? 'Review the current quote and any requirements, then accept or decline the pricing.' : 'Your administrator must review the current quote and accept or decline the pricing.' }
    case 'ChangesRequested':
      return { label: 'Review requested changes', owner: canSubmit ? 'Next step' : 'Administrator action',
        detail: canSubmit ? 'Review Phaeno’s feedback, update the request, and resubmit it for pricing.' : 'Your administrator must review Phaeno’s feedback, update the request, and resubmit it.' }
    case 'DraftRequest':
      return { label: canSubmit ? 'Complete request' : 'View request', owner: canSubmit ? 'Next step' : 'Administrator action',
        detail: canSubmit ? 'Complete the Job details and submit the request or confirm configured pricing.' : 'Your administrator must complete and submit this request.' }
    case 'PlacedAwaitingSamples':
      return { label: canShip ? 'Continue samples and shipping' : 'View samples and shipping', owner: canShip ? 'Next step' : 'Administrator action',
        detail: canShip ? 'Open the Job checklist to continue sample preparation and shipping, or check any pending kit delivery.' : 'Your administrator can follow the Job checklist to prepare samples and shipping.' }
    case 'ResultsAvailable':
      return { label: 'View results', owner: 'Results available', detail: 'Open the Job to review released results and available downloads.' }
    case 'SubmittedForQuote':
    case 'QuoteInPreparation':
      return { label: 'View request', owner: 'Waiting for Phaeno', detail: 'Phaeno is reviewing the request and preparing pricing for your review.' }
    case 'CancellationRequested':
      return { label: 'View request', owner: 'Waiting for Phaeno', detail: 'Phaeno is reviewing the cancellation request.' }
    case 'OnHold':
      return { label: 'Review hold', owner: 'On hold', detail: order.tenantSafeReason || 'Open the Job to review the hold and any requested follow-up.' }
    default:
      return { label: 'View progress', owner: 'With Phaeno', detail: 'Follow laboratory progress and any updates in the Job.' }
  }
}
