import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useRef, useState } from 'react'
import { cancelPlatformTransportationKitRequest, getPlatformTransportationKitRequest, type TransportationKitRequest, type TransportationKitRequestDetail } from '#/api/transportation-kit-requests'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { usePhaenoSession } from '#/features/auth/session-context'
import { DeliveryLocationAddress } from '#/features/organizations/delivery-locations/DeliveryLocationAddress'
import { KitRequestDispatchDialog } from './KitRequestDispatchDialog'
import { kitRequestReference, kitRequestStatus } from './kit-request-navigation'
import { useOrderDraftGuard } from '../use-order-draft-guard'
import { refreshStockKitSupply } from '../stock-kits/stock-kit-request-sync'

export function KitRequestDetailPage({ requestId }: { requestId: string }) {
  const { session } = usePhaenoSession(), client = useQueryClient(), search = useSearch({ strict: false })
  const enabled = Boolean(session?.capabilities.canManageOrderConfiguration)
  const query = useQuery({ queryKey: ['platform-transportation-kit-request', requestId], queryFn: () => getPlatformTransportationKitRequest(requestId), enabled })
  const [dispatch, setDispatch] = useState<TransportationKitRequestDetail | null>(null)
  const [cancelling, setCancelling] = useState<TransportationKitRequest | null>(null)
  const detail = query.data, request = detail?.request
  async function refresh() { await refreshStockKitSupply(client) }
  async function dispatched(value: TransportationKitRequestDetail) { setDispatch(null); client.setQueryData(['platform-transportation-kit-request', requestId], value); await refresh() }
  const shortage = detail?.request.lines.filter(line => line.requestedQuantity - line.dispatchedQuantity > detail.availableStockKits.filter(kit => kit.containerDefinitionId === line.containerDefinitionId).length) ?? []
  return <main className="page-wrap space-y-5 px-4 py-8"><Button asChild variant="ghost" size="sm"><Link to="/lab-operations" search={{ ...search, section: 'receipt' }} hash="transportation-kit-requests"><ArrowLeft aria-hidden="true" />Back to kit requests</Link></Button>
    {!enabled ? <Alert><AlertTitle>Kit request unavailable</AlertTitle><AlertDescription>A Phaeno configuration administrator is required.</AlertDescription></Alert> : query.error ? <Alert variant="destructive"><AlertTitle>Kit request unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Refresh and try again.')} <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : !request || !detail ? <p role="status">Loading kit request…</p> : <>
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">{kitRequestReference(request)}</h1><Badge variant="outline">{kitRequestStatus(request.status)}</Badge></div><p className="mt-1 text-sm wrap-anywhere">Job {request.jobNumber} · {request.organizationName} · {request.departmentName}</p><p className="mt-1 text-xs text-muted-foreground">Requested {new Date(request.requestedAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2">{['Pending', 'PartiallyDispatched'].includes(request.status) ? <Button disabled={!detail.canDispatch} onClick={() => setDispatch(detail)}>Fulfill request</Button> : null}{request.canCancel ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]"><DropdownMenuItem onSelect={() => setCancelling(request)}>Cancel request</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : null}</div></div>
      {detail.dispatchBlockedReason && ['Pending', 'PartiallyDispatched'].includes(request.status) ? <Alert><AlertTitle>Not ready for dispatch</AlertTitle><AlertDescription>{detail.dispatchBlockedReason}</AlertDescription></Alert> : null}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"><Card><CardHeader><CardTitle>Requested kits</CardTitle><CardDescription>Kits and outbound shipping are included. No additional charge.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="divide-y">{request.lines.map(line => <div key={line.id} className="py-3"><p className="font-medium wrap-anywhere">{line.commonName}</p><p className="mt-1 text-xs text-muted-foreground">SKU {line.sku} · {line.tubeCapacity} tubes per kit</p><p className="mt-2 text-sm">{line.requestedQuantity} requested · {line.dispatchedQuantity} sent · {line.receivedQuantity} received</p></div>)}</div>
        {shortage.length && ['Pending', 'PartiallyDispatched'].includes(request.status) ? <div className="rounded-md border bg-muted/30 p-3 text-sm"><p className="font-medium">More ready kits needed</p><ul className="mt-2 list-inside list-disc space-y-1">{shortage.map(line => <li key={line.id} className="wrap-anywhere">{line.commonName}: {line.requestedQuantity - line.dispatchedQuantity} still needed, {detail.availableStockKits.filter(kit => kit.containerDefinitionId === line.containerDefinitionId).length} ready</li>)}</ul><Button asChild variant="outline" size="sm" className="mt-3"><Link to="/lab-operations" search={{ section: 'receipt' }} hash="standard-kits">Open standard kits</Link></Button></div> : null}
      </CardContent></Card><Card><CardHeader><CardTitle>Deliver to {request.deliveryAddress.label}</CardTitle><CardDescription>Address confirmed by the Customer for this request.</CardDescription></CardHeader><CardContent><DeliveryLocationAddress location={request.deliveryAddress} /></CardContent></Card></div>
      <Card><CardHeader><CardTitle>Dispatch and receipt</CardTitle><CardDescription>Dispatched kits are on the way until the Customer confirms receipt.</CardDescription></CardHeader><CardContent><div className="divide-y">{request.kits.map(kit => <div key={kit.stockKitId} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0"><Link className="font-medium text-primary underline underline-offset-2" to="/lab-operations/stock-kits/$kitId" params={{ kitId: kit.stockKitId }} search={{ section: 'receipt' }}>{kit.kitNumber}</Link><p className="mt-1 text-sm wrap-anywhere">{kit.outboundCarrier} · {kit.outboundTrackingNumber}</p><p className="mt-1 text-xs text-muted-foreground">Sent {new Date(kit.dispatchedAt).toLocaleString()}{kit.receivedAt ? ` · Received ${new Date(kit.receivedAt).toLocaleString()}` : ''}</p></div><Badge variant="outline">{kit.receivedAt ? 'Received by Customer' : 'On the way'}</Badge></div>)}</div>{!request.kits.length ? <p className="text-sm text-muted-foreground">No kits have been dispatched.</p> : null}{request.status === 'Cancelled' ? <p className="mt-3 text-sm">Cancelled{request.cancellationReason ? `: ${request.cancellationReason}` : '.'}</p> : null}</CardContent></Card>
      {dispatch ? <KitRequestDispatchDialog detail={dispatch} onClose={() => setDispatch(null)} onSaved={dispatched} /> : null}
      {cancelling ? <CancelKitRequestDialog request={cancelling} onClose={() => setCancelling(null)} onSaved={async () => { setCancelling(null); await refresh() }} /> : null}
    </>}
  </main>
}

function CancelKitRequestDialog({ request, onClose, onSaved }: { request: TransportationKitRequest; onClose: () => void; onSaved: () => Promise<void> }) {
  const [reason, setReason] = useState(''), attempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const mutation = useMutation({ mutationFn: () => {
    const input = { version: request.version, reason: reason.trim() || undefined }, fingerprint = JSON.stringify(input)
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() }
    return cancelPlatformTransportationKitRequest(request.id, input, attempt.current.key)
  }, onSuccess: async () => { allowNavigation(); await onSaved() } })
  const allowNavigation = useOrderDraftGuard(Boolean(reason.trim()), mutation.isPending)
  function close() { if (!mutation.isPending && (!reason.trim() || window.confirm('Discard this cancellation reason?'))) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><DialogHeader><DialogTitle>Cancel kit request</DialogTitle><DialogDescription>Cancel {kitRequestReference(request)} for Job {request.jobNumber}. The Customer can submit a new request. Cancellation is available only before dispatch.</DialogDescription></DialogHeader>{mutation.error ? <Alert variant="destructive"><AlertTitle>Request was not cancelled</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Refresh the request and try again.')}</AlertDescription></Alert> : null}<div className="space-y-2"><Label htmlFor="cancel-kit-request-reason">Reason (optional)</Label><Textarea id="cancel-kit-request-reason" rows={3} maxLength={2000} disabled={mutation.isPending} value={reason} onChange={event => setReason(event.target.value)} /></div><DialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Keep request</Button><Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Cancelling…' : 'Cancel request'}</Button></DialogFooter></DialogContent></Dialog>
}
