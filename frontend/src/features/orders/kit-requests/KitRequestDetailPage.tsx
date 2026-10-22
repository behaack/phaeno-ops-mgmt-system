import { BackLink } from '#/components/ui/back-link'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { CustomerSourceText, useCustomerSourceText } from '#/features/customer-i18n/customer-text'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'

import { useState } from 'react'
import { getPlatformTransportationKitRequest, type TransportationKitRequest, type TransportationKitRequestDetail } from '#/api/transportation-kit-requests'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

import { usePhaenoSession } from '#/features/auth/session-context'
import { DeliveryLocationAddress } from '#/features/organizations/delivery-locations/DeliveryLocationAddress'
import { PrepareRequestedKitsDialog } from './PrepareRequestedKitsDialog'
import type { ShippingStockKit } from '#/api/shipping-containers'
import { KitRequestDispatchDialog } from './KitRequestDispatchDialog'
import { kitRequestReference, kitRequestStatus } from './kit-request-navigation'
import { CancelKitRequestDialog } from './CancelKitRequestDialog'
import { kitRequestSupply } from './kit-request-supply'
import { refreshStockKitSupply } from '../stock-kits/stock-kit-request-sync'

export function KitRequestDetailPage({ requestId }: { requestId: string }) {
  const __customerSource = useCustomerSourceText()

  const navigate = useNavigate()
  const [preparing, setPreparing] = useState(false)
  const { session } = usePhaenoSession(), client = useQueryClient(), search = useSearch({ strict: false })
  const enabled = Boolean(session?.capabilities.canManageOrderConfiguration)
  const query = useQuery({ queryKey: ['platform-transportation-kit-request', requestId], queryFn: () => getPlatformTransportationKitRequest(requestId), enabled })
  const [dispatch, setDispatch] = useState<TransportationKitRequestDetail | null>(null)
  const [cancelling, setCancelling] = useState<TransportationKitRequest | null>(null)
  const detail = query.data, request = detail?.request
  async function refresh() { await refreshStockKitSupply(client) }
  async function dispatched(value: TransportationKitRequestDetail) { setDispatch(null); client.setQueryData(['platform-transportation-kit-request', requestId], value); await refresh() }
  const { shortage, readyCount } = detail ? kitRequestSupply(detail) : { shortage: [], readyCount: 0 }
  const active = request && ['Pending', 'PartiallyDispatched'].includes(request.status)
  const canRecord = Boolean(active && readyCount > 0)
  const canPrepare = Boolean(active && shortage.length > 0)
  const actionCount = Number(canRecord) + Number(canPrepare) + Number(request?.canCancel ?? false)
  async function prepared(kit: ShippingStockKit) {
    setPreparing(false)
    await refresh()
    await navigate({ to: '/lab-operations/stock-kits/$kitId', params: { kitId: kit.id }, search: { ...search, section: 'transportation-kits', receiptTab: 'standard-kits', returnKitRequestId: requestId } })
  }

  return <main className="page-wrap space-y-5 px-4 py-8"><BackLink asChild><Link to="/lab-operations" search={{ ...search, section: 'kit-requests', receiptTab: undefined }} hash="transportation-kit-requests"><CustomerSourceText source={"Back to kit requests"} /></Link></BackLink>
    {!enabled ? <Alert><AlertTitle><CustomerSourceText source={"Kit request unavailable"} /></AlertTitle><AlertDescription><CustomerSourceText source={"A Phaeno configuration administrator is required."} /></AlertDescription></Alert> : query.error && !request ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Kit request unavailable"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(query.error, 'Refresh and try again.')} />} <Button size="sm" variant="outline" onClick={() => void query.refetch()}><CustomerSourceText source={"Retry"} /></Button></AlertDescription></Alert> : !request || !detail ? <p role="status"><CustomerSourceText source={"Loading kit request…"} /></p> : <>
      {query.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Request refresh failed"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(query.error, 'Saved request details are still shown. Refresh before making changes.')} />} <Button size="sm" variant="outline" onClick={() => void query.refetch()}><CustomerSourceText source={"Retry"} /></Button></AlertDescription></Alert> : null}
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">{kitRequestReference(request)}</h1><Badge variant="outline">{kitRequestStatus(request.status)}</Badge></div><p className="mt-1 text-sm wrap-anywhere">{request.organizationName} · {request.departmentName} · {request.deliveryAddress.label}</p><p className="mt-1 text-xs text-muted-foreground"><CustomerSourceText source={"Originating Job"} /> {request.jobNumber}{request.phaseName ? ` · ${request.phaseName}` : ''} <CustomerSourceText source={"· Requested"} /> {new Date(request.requestedAt).toLocaleString()}</p></div><div>{actionCount > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button variant="outline"><CustomerSourceText source={"Actions"} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">{canRecord ? <DropdownMenuItem disabled={!detail.canDispatch || Boolean(query.error)} onSelect={() => setDispatch(detail)}><CustomerSourceText source={"Record kit shipment"} /></DropdownMenuItem> : null}{canPrepare ? <DropdownMenuItem disabled={Boolean(query.error)} onSelect={() => setPreparing(true)}><CustomerSourceText source={"Prepare kits"} /></DropdownMenuItem> : null}{request.canCancel ? <DropdownMenuItem disabled={Boolean(query.error)} onSelect={() => setCancelling(request)}><CustomerSourceText source={"Cancel request"} /></DropdownMenuItem> : null}</DropdownMenuContent></ActionMenu> : canRecord ? <Button disabled={!detail.canDispatch || Boolean(query.error)} onClick={() => setDispatch(detail)}><CustomerSourceText source={"Record kit shipment"} /></Button> : canPrepare ? <Button disabled={Boolean(query.error)} onClick={() => setPreparing(true)}><CustomerSourceText source={"Prepare kits"} /></Button> : request.canCancel ? <Button variant="outline" disabled={Boolean(query.error)} onClick={() => setCancelling(request)}><CustomerSourceText source={"Cancel request"} /></Button> : null}</div></div>
      {detail.dispatchBlockedReason && ['Pending', 'PartiallyDispatched'].includes(request.status) ? <Alert><AlertTitle><CustomerSourceText source={"Not ready for dispatch"} /></AlertTitle><AlertDescription>{detail.dispatchBlockedReason}</AlertDescription></Alert> : null}
      {active ? <section aria-label={__customerSource("Next step")} className="space-y-2 rounded-lg border bg-muted/30 p-4">
        <h2 className="font-medium">{readyCount ? <CustomerSourceText source={"Ready kits can be shipped"} /> : <CustomerSourceText source={"Prepare kits before shipping"} />}</h2>
        <p className="text-sm">{readyCount ? `${readyCount} ${readyCount === 1 ? 'kit is' : 'kits are'} ready. Scan each physical kit barcode and record the carrier, tracking number and shipment time after handoff.` : <CustomerSourceText source={"Prepare the sizes below, then register their tube barcodes. Return to this request to record the shipment."} />}</p>
        {shortage.length > 0 ? <div className="text-sm"><p className="font-medium">{readyCount ? <CustomerSourceText source={"Still to prepare"} /> : <CustomerSourceText source={"Kits to prepare"} />}</p><ul className="mt-1 list-inside list-disc">{shortage.map(line => <li key={line.id}>{line.missing} × {line.commonName} · {line.ready} <CustomerSourceText source={"ready"} /></li>)}</ul>{readyCount > 0 ? <p className="mt-2 text-muted-foreground"><CustomerSourceText source={"You can send the ready kits now and prepare the remaining kits separately."} /></p> : null}</div> : null}
      </section> : null}
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"><Card><CardHeader><CardTitle><CustomerSourceText source={"Requested kits"} /></CardTitle><CardDescription><CustomerSourceText source={"Kits and outbound shipping are included. No additional charge."} /></CardDescription></CardHeader><CardContent className="space-y-4"><div className="divide-y">{request.lines.map(line => <div key={line.id} className="py-3"><p className="font-medium wrap-anywhere">{line.commonName}</p><p className="mt-1 text-xs text-muted-foreground"><CustomerSourceText source={"SKU"} /> {line.sku} · {line.tubeCapacity} <CustomerSourceText source={"tubes per kit"} /></p><p className="mt-2 text-sm">{line.requestedQuantity} <CustomerSourceText source={"requested ·"} /> {line.dispatchedQuantity} <CustomerSourceText source={"sent ·"} /> {line.receivedQuantity} <CustomerSourceText source={"received"} /></p></div>)}</div>

      </CardContent></Card><Card><CardHeader><CardTitle><CustomerSourceText source={"Deliver to"} /> {request.deliveryAddress.label}</CardTitle><CardDescription><CustomerSourceText source={"Address confirmed by the Customer for this request."} /></CardDescription></CardHeader><CardContent><DeliveryLocationAddress location={request.deliveryAddress} /></CardContent></Card></div>
      <Card><CardHeader><CardTitle><CustomerSourceText source={"Dispatch and receipt"} /></CardTitle><CardDescription><CustomerSourceText source={"Dispatched kits are on the way until the Customer confirms receipt."} /></CardDescription></CardHeader><CardContent><div className="divide-y">{request.kits.map(kit => <div key={kit.stockKitId} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0"><Link className="font-medium text-primary underline underline-offset-2" to="/lab-operations/stock-kits/$kitId" params={{ kitId: kit.stockKitId }} search={{ ...search, section: 'transportation-kits', receiptTab: 'standard-kits' }}>{kit.kitNumber}</Link><p className="mt-1 text-sm wrap-anywhere">{kit.outboundCarrier} · {kit.outboundTrackingNumber}</p><p className="mt-1 text-xs text-muted-foreground"><CustomerSourceText source={"Sent"} /> {new Date(kit.dispatchedAt).toLocaleString()}{kit.receivedAt ? ` · Received ${new Date(kit.receivedAt).toLocaleString()}` : ''}</p></div><Badge variant="outline">{kit.receivedAt ? <CustomerSourceText source={"Received by Customer"} /> : <CustomerSourceText source={"On the way"} />}</Badge></div>)}</div>{!request.kits.length ? <p className="text-sm text-muted-foreground"><CustomerSourceText source={"No kits have been dispatched."} /></p> : null}{request.status === 'Cancelled' ? <p className="mt-3 text-sm"><CustomerSourceText source={"Cancelled"} />{request.cancellationReason ? `: ${request.cancellationReason}` : '.'}</p> : null}</CardContent></Card>
      {preparing ? <PrepareRequestedKitsDialog neededSizeIds={shortage.map(line => line.containerDefinitionId)} onClose={() => setPreparing(false)} onSaved={prepared} /> : null}
      {dispatch ? <KitRequestDispatchDialog detail={dispatch} refreshError={query.error} onRetryRefresh={() => { void query.refetch() }} onClose={() => setDispatch(null)} onSaved={dispatched} /> : null}
      {cancelling ? <CancelKitRequestDialog request={cancelling} onClose={() => setCancelling(null)} onSaved={async () => { setCancelling(null); await refresh() }} /> : null}
    </>}
  </main>
}
