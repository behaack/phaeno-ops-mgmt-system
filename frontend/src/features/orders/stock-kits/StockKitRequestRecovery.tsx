import { useMutation, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import { getSourceSampleShipments } from '#/api/sample-shipping'
import { dispatchShippingStockKit, type ShippingStockKit } from '#/api/shipping-containers'
import { getPlatformTransportationKitRequests, type TransportationKitRequest } from '#/api/transportation-kit-requests'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { containerDateTime } from '../configuration/shipping-container-utils'
import { kitRequestReference } from '../kit-requests/kit-request-navigation'
import { useOrderDraftGuard } from '../use-order-draft-guard'
import { matchingUnlinkedKitRequest } from './stock-kit-request-sync'

type Recovery = { kit: ShippingStockKit; request: TransportationKitRequest; shipmentId: string }

export function StockKitRequestRecovery({ kit, onSaved }: { kit: ShippingStockKit; onSaved: () => Promise<void> }) {
  const [review, setReview] = useState<Recovery | null>(null)
  const requests = useQuery({ queryKey: ['platform-transportation-kit-requests'], queryFn: () => getPlatformTransportationKitRequests() })
  const request = requests.data ? matchingUnlinkedKitRequest(kit, requests.data) : null
  const shipments = useQuery({ queryKey: ['platform-sample-shipments', 'stock-kit-recovery', kit.authorizationSourceId], queryFn: () => getSourceSampleShipments(kit.authorizationSourceId!, true), enabled: Boolean(request) })
  const shipment = shipments.data?.find(value => value.authorizationSourceId === request?.jobId
    && value.organizationId === request.organizationId
    && ['Preparing', 'ReadyToShip'].includes(value.status))
  const error = requests.error ?? (request ? shipments.error : null)
  if (error && !review) return <Alert variant="destructive" className="mb-5"><AlertTitle>Kit request could not be checked</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Try again before updating its request.')}<Button variant="outline" size="sm" onClick={() => { void requests.refetch(); if (request) void shipments.refetch() }}>Retry kit request</Button></AlertDescription></Alert>
  if (requests.isPending) return <p role="status" className="mb-5 text-sm text-muted-foreground">Checking the kit request…</p>
  if (!request && !review) return null
  return <>
    {request ? <Alert className="mb-5"><AlertTitle>Update the matching kit request</AlertTitle><AlertDescription>
      <p>{kitRequestReference(request)} for Job {request.jobNumber} does not yet include this kit's saved dispatch.</p>
      {shipments.isPending ? <p role="status">Checking the Job's shipping records…</p>
        : shipment ? <Button variant="outline" size="sm" onClick={() => setReview({ kit, request, shipmentId: shipment.id })}>Update kit request</Button>
          : <p>No eligible shipping record is available. Review the Job before updating its kit request.</p>}
    </AlertDescription></Alert> : null}
    {review ? <UpdateKitRequestDialog {...review} onClose={() => setReview(null)} onSaved={async () => { await onSaved(); setReview(null) }} /> : null}
  </>
}

export function UpdateKitRequestDialog({ kit, request, shipmentId, onClose, onSaved }: Recovery & { onClose: () => void; onSaved: () => Promise<void> }) {
  const submitting = useRef(false)
  const mutation = useMutation({ mutationFn: () => dispatchShippingStockKit(kit.id, {
    shipmentId, version: kit.version, outboundCarrier: kit.outboundCarrier!,
    outboundTrackingNumber: kit.outboundTrackingNumber!, fulfilledAt: kit.fulfilledAt!,
  }), onSuccess: async () => { allowNavigation(); await onSaved() }, onSettled: () => { submitting.current = false } })
  const allowNavigation = useOrderDraftGuard(false, mutation.isPending)
  function close() { if (!submitting.current) onClose() }
  function confirm() { if (!submitting.current) { submitting.current = true; mutation.mutate() } }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent showCloseButton={!mutation.isPending} onEscapeKeyDown={event => { if (submitting.current) event.preventDefault() }}>
    <DialogHeader className="pr-[var(--dialog-inset)]"><DialogTitle className="pr-8">Update kit request</DialogTitle><DialogDescription className="pr-8">Link {kit.kitNumber}'s recorded dispatch to {kitRequestReference(request)} for Job {request.jobNumber}.</DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive" className="min-w-0 self-stretch"><AlertTitle>Kit request was not updated</AlertTitle><AlertDescription className="min-w-0 wrap-anywhere">{getOrderErrorMessage(mutation.error, 'The saved dispatch could not be linked. Review the request and try again.')}</AlertDescription></Alert> : null}
    <div className="space-y-3 text-sm"><p>This uses the existing dispatch. It does not send another kit or confirm Customer receipt.</p>
      <dl className="space-y-3 rounded-md border bg-muted/30 p-3">
        <DispatchFact label="Kit" value={`${kit.kitNumber} · ${kit.container.commonName} · SKU ${kit.container.sku}`} />
        <DispatchFact label="Carrier" value={kit.outboundCarrier!} />
        <DispatchFact label="Tracking number" value={kit.outboundTrackingNumber!} />
        <DispatchFact label="Dispatched at" value={containerDateTime(kit.fulfilledAt!)} />
      </dl>
    </div>
    <DialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Keep reviewing</Button><Button disabled={mutation.isPending} onClick={confirm}>{mutation.isPending ? 'Updating…' : 'Update kit request'}</Button></DialogFooter>
  </DialogContent></Dialog>
}

function DispatchFact({ label, value }: { label: string; value: string }) { return <div><dt className="text-muted-foreground">{label}</dt><dd className="wrap-anywhere font-medium">{value}</dd></div> }
