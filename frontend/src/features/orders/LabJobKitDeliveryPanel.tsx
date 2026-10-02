import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Package, Truck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cancelTransportationKitRequest, confirmTransportationKitsReceived, getLabOrderTransportationKits, getTransportationKitRequest } from '#/api/transportation-kit-requests'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { DeliveryLocationAddress } from '#/features/organizations/delivery-locations/DeliveryLocationAddress'
import { useOrderDecisionDismissal } from './use-order-decision-dismissal'

export function LabJobKitDeliveryPanel({ orderId, requestId, canConfirm, open, onOpenChange, restoreFocus }: {
  orderId: string
  requestId?: string
  canConfirm: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  restoreFocus: () => void
}) {
  const client = useQueryClient()
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const cancelAttempt = useRef<{ payload: string; key: string } | null>(null)
  const [receivingId, setReceivingId] = useState<string | null>(null)
  const [receiptBarcode, setReceiptBarcode] = useState('')
  const [barcodeIssue, setBarcodeIssue] = useState<string | null>(null)
  const barcodeInput = useRef<HTMLInputElement>(null)
  const confirmButton = useRef<HTMLButtonElement>(null)
  const receiptCancel = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const request = useQuery({ queryKey: ['lab-order-transportation-kits', orderId, requestId], queryFn: () => requestId ? getTransportationKitRequest(requestId) : getLabOrderTransportationKits(orderId), enabled: open })
  const receive = useMutation({ mutationFn: async (stockKitId: string) => {
    if (!request.data) throw new Error('The kit request is unavailable.')
    return confirmTransportationKitsReceived(request.data.id,
      { version: request.data.version, stockKitIds: [stockKitId], scannedKitBarcode: receiptBarcode.trim() }, crypto.randomUUID())
  }, onSuccess: async () => {
    setReceivingId(null)
    setReceiptBarcode('')
    setBarcodeIssue(null)
    await Promise.all([
      client.invalidateQueries({ queryKey: ['lab-order-transportation-kits', orderId] }),
      client.invalidateQueries({ queryKey: ['lab-phase-kit-supply', orderId] }),
      client.invalidateQueries({ queryKey: ['lab-sample-tube-pairs', orderId] }),
      client.invalidateQueries({ queryKey: ['transportation-kit-supply', orderId] }),
      client.invalidateQueries({ queryKey: ['location-kit-inventory'] }),
    ])
  } })
  const cancel = useMutation({ mutationFn: async () => {
    if (!request.data) throw new Error('The kit request is unavailable.')
    const body = { version: request.data.version, reason: cancelReason.trim() || undefined }
    const payload = JSON.stringify(body)
    if (cancelAttempt.current?.payload !== payload) cancelAttempt.current = { payload, key: crypto.randomUUID() }
    return cancelTransportationKitRequest(request.data.id, body, cancelAttempt.current.key)
  }, onSuccess: async () => {
    setCancelling(false); setCancelReason('')
    await Promise.all([
      client.invalidateQueries({ queryKey: ['lab-order-transportation-kits', orderId] }),
      client.invalidateQueries({ queryKey: ['lab-phase-kit-supply', orderId] }),
    ])
  } })
  const selected = request.data?.kits.find(kit => kit.stockKitId === receivingId)
  const cancellationDismissal = useOrderDecisionDismissal(open && cancelling && Boolean(cancelReason.trim()), cancel.isPending,
    () => { setCancelling(false); setCancelReason('') },
    { scope: 'kit cancellation', description: 'The unsaved cancellation reason will be discarded. The kit request will remain active.' })
  useEffect(() => {
    if (open) (receivingId || cancelling ? receiptCancel.current : closeButton.current)?.focus()
  }, [open, receivingId, cancelling])
  function closeReceipt() {
    if (receive.isPending || cancel.isPending) return
    setReceivingId(null)
    setReceiptBarcode('')
    setBarcodeIssue(null)
  }
  function checkReceiptBarcode(value = receiptBarcode) {
    const scanned = value.trim()
    const issue = !scanned ? 'Scan the physical kit barcode before confirming receipt.'
      : !selected || scanned.toUpperCase() !== selected.kitNumber.trim().toUpperCase()
        ? 'This barcode does not match the selected kit. Check the physical kit and try again.' : null
    setBarcodeIssue(issue)
    if (issue) barcodeInput.current?.focus()
    return !issue
  }
  function confirmReceipt() {
    if (receive.isPending || !selected || !checkReceiptBarcode()) return
    receive.mutate(selected.stockKitId)
  }
  const delivery = request.data
  const inTransit = delivery?.kits.filter(kit => !kit.receivedAt).length ?? 0
  const received = delivery?.kits.length ? delivery.kits.length - inTransit : 0
  const transitTitle = inTransit === 1 ? 'Your kit is on the way' : inTransit > 1 ? 'Your kits are on the way' : 'All shipped kits have arrived'
  const status = !delivery ? null : delivery.status === 'Pending'
    ? { title: 'Kit order received by Phaeno', detail: 'Phaeno is preparing your kits. Carrier and tracking details will appear here when a kit is sent.', icon: Package, tone: 'border-[var(--warning-border)] bg-[var(--warning-background)] text-[var(--warning)]' }
    : delivery.status === 'PartiallyDispatched'
      ? { title: inTransit > 0 ? transitTitle : 'More kits are being prepared', detail: 'Phaeno is preparing the remaining kits. Confirm each kit only after it physically arrives.', icon: Truck, tone: 'border-primary/30 bg-primary/5 text-primary' }
      : delivery.status === 'Dispatched'
        ? { title: transitTitle, detail: 'Use the tracking details below and confirm each kit after checking its physical barcode.', icon: Truck, tone: 'border-primary/30 bg-primary/5 text-primary' }
        : delivery.status === 'Received'
          ? { title: 'Kit delivery complete', detail: 'The dispatched kits have been confirmed received. You can use compatible received kits to prepare your sample shipment.', icon: CircleCheck, tone: 'border-accent bg-accent/40 text-accent-foreground' }
          : { title: 'Kit order cancelled', detail: 'This kit order was cancelled. Contact Phaeno if you still need transportation kits for this Job.', icon: Package, tone: 'border-border bg-muted/30 text-muted-foreground' }
  return <><Dialog open={open} onOpenChange={next => {
    if (receive.isPending || cancel.isPending) return
    if (!next && cancelling) cancellationDismissal.close()
    else if (!next && selected) closeReceipt()
    else onOpenChange(next)
  }}>
    <DialogContent className="max-w-2xl" showCloseButton={!receive.isPending && !cancel.isPending} aria-busy={receive.isPending || cancel.isPending}
      onEscapeKeyDown={event => { if (receive.isPending || cancel.isPending) event.preventDefault() }}
      onOpenAutoFocus={event => { event.preventDefault(); closeButton.current?.focus() }}
      onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
      <DialogHeader>
        <DialogTitle>{cancelling ? 'Cancel kit order?' : selected ? 'Confirm physical kit receipt' : 'Transportation kit order'}</DialogTitle>
        <DialogDescription>{cancelling ? 'Review this unshipped request before cancelling.' : selected ? 'Check the physical kit that arrived before recording receipt.' : `${delivery ? `Review kit fulfillment for Job ${delivery.jobNumber}.` : 'Review kit fulfillment and delivery details.'} Kits and outbound delivery are included in the Lab order.`}</DialogDescription>
      </DialogHeader>
      {receive.error && selected ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(receive.error, 'Refresh the kit status and try again.')}</AlertDescription></Alert> : null}
      {request.error && !selected ? <Alert variant="destructive"><AlertTitle>Kit status unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(request.error, 'Try again.')} <Button variant="outline" size="sm" onClick={() => void request.refetch()}>Retry</Button></AlertDescription></Alert> : null}
      {cancelling ? <div className="space-y-4"><p className="text-sm">Cancel the unshipped kit request for {delivery?.phaseName ?? `Job ${delivery?.jobNumber}`}. The accepted Job and pricing remain in place. You can request the corrected kits and delivery address afterwards.</p><Field><Label htmlFor="kit-cancellation-reason">Reason (optional)</Label><Textarea id="kit-cancellation-reason" value={cancelReason} onChange={event => setCancelReason(event.target.value)} rows={3} maxLength={2000} disabled={cancel.isPending} /></Field>{cancel.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(cancel.error, 'Your reason is preserved. Refresh and try again.')}</AlertDescription></Alert> : null}</div> : !selected ? <div className="space-y-4">
      {delivery?.phaseName ? <p className="text-sm"><strong>Phase:</strong> {delivery.phaseName}</p> : null}
      {request.isLoading ? <p role="status">Checking kit fulfillment…</p> : null}
      {request.data === null ? <div className="flex items-start gap-3 rounded-md border border-accent bg-accent/40 p-4 text-sm"><CircleCheck className="mt-0.5 size-5 shrink-0 text-[var(--status-ready)]" aria-hidden="true" /><div><p className="font-semibold">You already have compatible kits</p><p className="mt-1 text-muted-foreground">Received kits at your delivery location cover this order. Select one when preparing your sample shipment.</p></div></div> : null}
      {delivery && status ? <>
        <div role="status" className={`flex items-start gap-3 rounded-md border p-4 ${status.tone}`}><status.icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div className="min-w-0"><p className="font-semibold text-foreground">{status.title}</p><p className="mt-1 text-sm text-foreground">{status.detail}</p>{received === 0 && ['Pending', 'PartiallyDispatched', 'Dispatched'].includes(delivery.status) ? <p className="mt-2 text-sm text-foreground">Sample preparation becomes available after a compatible physical kit is confirmed received.</p> : null}</div></div>
        <div className="grid gap-2 border-t pt-4 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]"><p className="font-medium text-muted-foreground">Delivering to</p><DeliveryLocationAddress location={delivery.deliveryAddress} showInstructions={false} /></div>
        {canConfirm && delivery.canCancel ? <Button variant="outline" onClick={() => { cancel.reset(); setCancelReason(''); setCancelling(true) }}>Cancel kit request</Button> : null}
        <section aria-labelledby="kit-order-contents" className="border-t pt-4">
          <h3 id="kit-order-contents" className="mb-2 font-semibold">Kits ordered</h3>
          {delivery.lines.length ? <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th scope="col" className="pb-2 font-medium">Kit</th><th scope="col" className="pb-2 pl-2 text-right font-medium">Qty</th><th scope="col" className="pb-2 pl-2 text-right font-medium">Sent</th><th scope="col" className="pb-2 pl-2 text-right font-medium">Received</th></tr></thead><tbody>
            {delivery.lines.map(line => <tr key={line.id} className="border-b last:border-0"><th scope="row" className="py-2 text-left font-medium wrap-anywhere">{line.commonName}<span className="block text-xs font-normal text-muted-foreground">{line.tubeCapacity} tubes per kit</span></th><td className="py-2 pl-2 text-right tabular-nums">{line.requestedQuantity}</td><td className="py-2 pl-2 text-right tabular-nums">{line.dispatchedQuantity}</td><td className="py-2 pl-2 text-right tabular-nums">{line.receivedQuantity}</td></tr>)}
          </tbody></table> : <p className="text-sm text-muted-foreground">Phaeno will select the kit configuration for this order.</p>}
        </section>
        {delivery.kits.length ? <section aria-label="Physical kit deliveries" className="border-t pt-4"><div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-medium">Physical kits and tracking</h3><p className="text-xs text-muted-foreground">{received} received · {inTransit} on the way</p></div><ul className="divide-y rounded-md border">
          {delivery.kits.map(kit => <li key={kit.stockKitId} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0"><p className="font-medium wrap-anywhere">{kit.kitNumber}</p><p className="mt-1 wrap-anywhere text-muted-foreground">{kit.outboundCarrier} · Tracking {kit.outboundTrackingNumber}</p><p className="mt-1 text-xs text-muted-foreground">Sent <time dateTime={kit.dispatchedAt}>{new Date(kit.dispatchedAt).toLocaleDateString()}</time>{kit.receivedAt ? <> · Received <time dateTime={kit.receivedAt}>{new Date(kit.receivedAt).toLocaleDateString()}</time></> : null}</p></div>
            {!kit.receivedAt && canConfirm && delivery.canConfirmReceipt ? <Button variant="outline" size="sm" aria-label={`Confirm ${kit.kitNumber} received`} onClick={() => { receive.reset(); setReceiptBarcode(''); setBarcodeIssue(null); setReceivingId(kit.stockKitId) }}>Confirm received</Button> : null}
          </li>)}
        </ul>{inTransit > 0 && !canConfirm ? <p className="mt-2 text-xs text-muted-foreground">An organization or Department administrator can confirm receipt after the physical kit arrives.</p> : null}</section> : null}
      </> : null}
      </div> : <div className="space-y-4 text-sm">
          <div className="rounded-md border bg-muted/30 p-3"><p className="text-xs font-medium text-muted-foreground">Physical kit number</p><p className="mt-1 font-mono font-semibold wrap-anywhere">{selected.kitNumber}</p></div>
          <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-muted-foreground">Carrier</dt><dd className="mt-0.5 font-medium wrap-anywhere">{selected.outboundCarrier}</dd></div><div><dt className="text-muted-foreground">Tracking number</dt><dd className="mt-0.5 font-medium wrap-anywhere">{selected.outboundTrackingNumber}</dd></div></dl>
          <Field><Label htmlFor="receipt-kit-barcode"><RequiredFieldName>Physical kit barcode</RequiredFieldName></Label><Input ref={barcodeInput} id="receipt-kit-barcode" className="font-mono" value={receiptBarcode} maxLength={100} autoComplete="off" spellCheck={false} disabled={receive.isPending} aria-invalid={Boolean(barcodeIssue)} aria-describedby={`receipt-kit-barcode-help${barcodeIssue ? ' receipt-kit-barcode-error' : ''}`} onChange={event => { setReceiptBarcode(event.target.value); setBarcodeIssue(null) }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (checkReceiptBarcode(event.currentTarget.value)) confirmButton.current?.focus() } }} /><FieldDescription id="receipt-kit-barcode-help">Scan or enter the complete barcode printed on the physical kit.</FieldDescription><FieldError id="receipt-kit-barcode-error">{barcodeIssue}</FieldError></Field>
          <p className="text-muted-foreground">Confirm only after this physical kit arrives. Tracking alone does not record receipt.</p>
      </div>}
      {cancelling ? <RequiredDialogFooter showLegend={false}><Button ref={receiptCancel} variant="outline" disabled={cancel.isPending} onClick={cancellationDismissal.close}>Keep kit request</Button><Button variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{cancel.isPending ? 'Cancelling…' : 'Cancel kit request'}</Button></RequiredDialogFooter> : selected ? <RequiredDialogFooter><Button ref={receiptCancel} variant="outline" disabled={receive.isPending} onClick={closeReceipt}>Cancel</Button><Button ref={confirmButton} disabled={receive.isPending} onClick={confirmReceipt}>{receive.isPending ? 'Recording…' : 'Confirm physical receipt'}</Button></RequiredDialogFooter>
        : <DialogFooter><Button ref={closeButton} variant="outline" onClick={() => onOpenChange(false)}>Close kit order</Button></DialogFooter>}
    </DialogContent>
  </Dialog>{cancellationDismissal.confirmation}</>
}
