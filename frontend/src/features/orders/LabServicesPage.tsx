import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, FlaskConical, Plus, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'

import { exportOrderList, getOrderErrorMessage, listLabOrders } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { usePhaenoSession } from '#/features/auth/session-context'
import { OrderListFilters, orderFilterParams, type OrderListFilterState } from './OrderListFilters'
import { OrderStatusBadge } from './OrderStatusBadge'

export function LabServicesPage() {
  const { authProvider, session } = usePhaenoSession()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<OrderListFilterState>({ status: '', createdFrom: '', createdTo: '', submittedByMe: false })
  const deferredSearch = useDeferredValue(search)
  const canView = Boolean(session?.capabilities.canViewLabServiceOrders)
  const canCreate = Boolean(session?.capabilities.canCreateLabServiceRequests)
  const apiEnabled = canView && authProvider !== 'mock'
  const filters = orderFilterParams(filter, session?.user?.id)
  const orders = useQuery({
    queryKey: ['lab-service-orders', deferredSearch, filter],
    queryFn: () => listLabOrders({ search: deferredSearch || undefined, ...filters }),
    enabled: apiEnabled,
  })
  const exportCsv = useMutation({ mutationFn: () => exportOrderList('lab', { search: deferredSearch || undefined, ...filters }) })

  if (!canView) {
    return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Lab services unavailable</AlertTitle><AlertDescription>Select an active Customer organization with laboratory-service access.</AlertDescription></Alert></main>
  }

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold leading-tight">Lab services</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">Request job-specific laboratory pricing, track each sample, and retrieve eligible results.</p>
        </div>
        <div className="flex flex-wrap gap-2">{apiEnabled ? <Button type="button" variant="outline" disabled={exportCsv.isPending} onClick={() => exportCsv.mutate()}><Download data-icon="inline-start" />Export CSV</Button> : null}{canCreate ? <Button asChild><Link to="/lab-services/new"><Plus data-icon="inline-start" />Request lab service</Link></Button> : null}</div>
      </section>

      {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Connected orders are paused in mock-session mode</AlertTitle><AlertDescription>Use a signed-in Customer session to create and track laboratory work.</AlertDescription></Alert> : null}
      {exportCsv.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Export could not be created</AlertTitle><AlertDescription>{getOrderErrorMessage(exportCsv.error, 'Try the export again.')}</AlertDescription></Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Laboratory requests</CardTitle>
          <CardDescription>Search by portal order number or your Customer reference.</CardDescription>
          <div className="relative mt-3 max-w-md">
            <label htmlFor="labOrderSearch" className="sr-only">Search laboratory requests</label>
            <Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="labOrderSearch" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search orders" />
          </div>
          <OrderListFilters idPrefix="lab-orders" value={filter} onChange={setFilter} statuses={labStatuses} />
        </CardHeader>
        <CardContent>
          {orders.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Orders could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(orders.error, 'Try refreshing this page.')}</AlertDescription></Alert> : null}
          {orders.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading laboratory requests…</p> : null}
          {(orders.data?.items.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-muted-foreground"><tr><th className="px-2 py-3 font-medium">Order</th><th className="px-2 py-3 font-medium">Reference</th><th className="px-2 py-3 font-medium">Status</th><th className="px-2 py-3 font-medium">Updated</th></tr></thead>
                <tbody>{orders.data?.items.map((order) => <tr key={order.id} className="border-b last:border-0"><td className="px-2 py-3"><Link to="/lab-services/$orderId" params={{ orderId: order.id }} className="font-medium text-primary underline-offset-4 hover:underline">{order.number}</Link></td><td className="px-2 py-3">{order.reference ?? '—'}</td><td className="px-2 py-3"><OrderStatusBadge status={order.status} /></td><td className="px-2 py-3 text-muted-foreground">{formatDate(order.updatedAt)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : !orders.isLoading ? (
            <div className="flex flex-col items-center py-12 text-center"><FlaskConical aria-hidden="true" className="mb-3 size-8 text-muted-foreground" /><p className="font-medium">{apiEnabled && search ? 'No matching laboratory requests' : 'No laboratory requests yet'}</p><p className="mt-1 max-w-md text-sm text-muted-foreground">{apiEnabled ? 'Create a request when you are ready to submit samples for Phaeno analysis.' : 'Connect a real Customer session to load orders.'}</p></div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
}

const labStatuses = ['DraftRequest', 'SubmittedForQuote', 'ChangesRequested', 'QuoteInPreparation', 'QuoteIssued', 'PlacedAwaitingSamples', 'InProgress', 'ResultsAvailable', 'OnHold', 'CancellationRequested', 'Completed', 'Cancelled', 'Declined'].map((value) => ({ value, label: value.replace(/([a-z])([A-Z])/g, '$1 $2') }))
