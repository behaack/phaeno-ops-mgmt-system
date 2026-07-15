import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, Package, Plus, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'

import { exportOrderList, getOrderErrorMessage, listReagentOrders } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { usePhaenoSession } from '#/features/auth/session-context'
import { OrderListFilters, orderFilterParams, type OrderListFilterState } from './OrderListFilters'
import { OrderStatusBadge } from './OrderStatusBadge'

export function ReagentOrdersPage() {
  const { authProvider, session } = usePhaenoSession()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<OrderListFilterState>({ status: '', createdFrom: '', createdTo: '', submittedByMe: false })
  const deferredSearch = useDeferredValue(search)
  const canView = Boolean(session?.capabilities.canViewReagentOrders)
  const apiEnabled = canView && authProvider !== 'mock'
  const filters = orderFilterParams(filter, session?.user?.id)
  const orders = useQuery({ queryKey: ['reagent-orders', deferredSearch, filter], queryFn: () => listReagentOrders({ search: deferredSearch || undefined, ...filters }), enabled: apiEnabled })
  const exportCsv = useMutation({ mutationFn: () => exportOrderList('reagent', { search: deferredSearch || undefined, ...filters }) })

  if (!canView) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Reagent orders unavailable</AlertTitle><AlertDescription>Select an active Partner organization with reagent-order access.</AlertDescription></Alert></main>
  return <main className="page-wrap px-4 py-8">
    <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold">Reagent orders</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Order Partner-eligible reagents at negotiated prices and track fulfillment by shipment, lot, and remaining quantity.</p></div><div className="flex flex-wrap gap-2">{apiEnabled ? <Button type="button" variant="outline" disabled={exportCsv.isPending} onClick={() => exportCsv.mutate()}><Download data-icon="inline-start" />Export CSV</Button> : null}{session?.capabilities.canCreateReagentOrders ? <Button asChild><Link to="/reagent-orders/new"><Plus data-icon="inline-start" />Place reagent order</Link></Button> : null}</div></section>
    {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Connected orders are paused in mock-session mode</AlertTitle><AlertDescription>Use a signed-in Partner session to place and track reagent orders.</AlertDescription></Alert> : null}
    {exportCsv.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Export could not be created</AlertTitle><AlertDescription>{getOrderErrorMessage(exportCsv.error, 'Try the export again.')}</AlertDescription></Alert> : null}
    <Card><CardHeader><CardTitle>Partner reagent orders</CardTitle><CardDescription>Search by order number, PO, item, or shipment tracking number.</CardDescription><div className="relative mt-3 max-w-md"><label htmlFor="reagentOrderSearch" className="sr-only">Search reagent orders</label><Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="reagentOrderSearch" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders" /></div><OrderListFilters idPrefix="reagent-orders" value={filter} onChange={setFilter} statuses={reagentStatuses} /></CardHeader><CardContent>
      {orders.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Orders could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(orders.error, 'Try refreshing this page.')}</AlertDescription></Alert> : null}
      {orders.isLoading ? <p role="status">Loading reagent orders…</p> : null}
      {(orders.data?.items.length ?? 0) ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="px-2 py-3 font-medium">Order</th><th className="px-2 py-3 font-medium">PO</th><th className="px-2 py-3 font-medium">Status</th><th className="px-2 py-3 font-medium">Updated</th></tr></thead><tbody>{orders.data?.items.map((order) => <tr key={order.id} className="border-b last:border-0"><td className="px-2 py-3"><Link to="/reagent-orders/$orderId" params={{ orderId: order.id }} className="font-medium text-primary hover:underline">{order.number}</Link></td><td className="px-2 py-3">{order.reference ?? '—'}</td><td className="px-2 py-3"><OrderStatusBadge status={order.status} /></td><td className="px-2 py-3 text-muted-foreground">{formatDate(order.updatedAt)}</td></tr>)}</tbody></table></div> : !orders.isLoading ? <div className="flex flex-col items-center py-12 text-center"><Package aria-hidden="true" className="mb-3 size-8 text-muted-foreground" /><p className="font-medium">{apiEnabled && search ? 'No matching reagent orders' : 'No reagent orders yet'}</p><p className="mt-1 text-sm text-muted-foreground">{apiEnabled ? 'Place an order from your organization’s negotiated reagent catalog.' : 'Connect a real Partner session to load orders.'}</p></div> : null}
    </CardContent></Card>
  </main>
}

function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value)) }
const reagentStatuses = ['Draft', 'Placed', 'UnderReview', 'Accepted', 'Processing', 'PartiallyShipped', 'Shipped', 'OnHold', 'CancellationRequested', 'Fulfilled', 'Cancelled', 'Rejected'].map((value) => ({ value, label: value.replace(/([a-z])([A-Z])/g, '$1 $2') }))
