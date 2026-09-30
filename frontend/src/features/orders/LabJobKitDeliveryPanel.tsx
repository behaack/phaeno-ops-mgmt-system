import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Package, Truck } from 'lucide-react'
import { useRef, useState } from 'react'
import { confirmTransportationKitsReceived, getLabOrderTransportationKits } from '#/api/transportation-kit-requests'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { DeliveryLocationAddress } from '#/features/organizations/delivery-locations/DeliveryLocationAddress'
import { transportationKitStageLabel } from './lab-job-progress'

export function LabJobKitDeliveryPanel({ orderId, canConfirm }: { orderId: string; canConfirm: boolean }) {
  const client = useQueryClient()
  const [receivingId, setReceivingId] = useState<string | null>(null)
  const [receiptBarcode, setReceiptBarcode] = useState('')
  const [barcodeIssue, setBarcodeIssue] = useState<string | null>(null)
  const barcodeInput = useRef<HTMLInputElement>(null)
  const confirmButton = useRef<HTMLButtonElement>(null)
  const request = useQuery({ queryKey: ['lab-order-transportation-kits', orderId], queryFn: () => getLabOrderTransportationKits(orderId) })
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
      client.invalidateQueries({ queryKey: ['lab-sample-tube-pairs', orderId] }),
      client.invalidateQueries({ queryKey: ['transportation-kit-supply', orderId] }),
      client.invalidateQueries({ queryKey: ['location-kit-inventory'] }),
    ])
  } })
  const selected = request.data?.kits.find(kit => kit.stockKitId === receivingId)
  function closeReceipt() {
    if (receive.isPending) return
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
  return <Card id="job-kit-delivery" tabIndex={-1} className="scroll-mt-6 gap-0 py-0">
    <CardHeader className="border-b py-3"><CardTitle>{transportationKitStageLabel(delivery?.status)}</CardTitle></CardHeader>
    <CardContent className="space-y-4 py-4">
      {request.isLoading ? <p role="status">Checking kit fulfillment…</p> : null}
      {request.error ? <Alert variant="destructive"><AlertTitle>Kit status unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(request.error, 'Try again.')} <Button variant="outline" size="sm" onClick={() => void request.refetch()}>Retry</Button></AlertDescription></Alert> : null}
      {request.data === null ? <div className="flex items-start gap-3 rounded-md border border-accent bg-accent/40 p-4 text-sm"><CircleCheck className="mt-0.5 size-5 shrink-0 text-[var(--status-ready)]" aria-hidden="true" /><div><p className="font-semibold">You already have compatible kits</p><p className="mt-1 text-muted-foreground">Received kits at your delivery location cover this order. Select one when preparing your sample shipment.</p></div></div> : null}
      {delivery && status ? <>
        <div role="status" className={`flex items-start gap-3 rounded-md border p-4 ${status.tone}`}><status.icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div className="min-w-0"><p className="font-semibold text-foreground">{status.title}</p><p className="mt-1 text-sm text-foreground">{status.detail}</p>{received === 0 && ['Pending', 'PartiallyDispatched', 'Dispatched'].includes(delivery.status) ? <p className="mt-2 text-sm text-foreground">Sample preparation becomes available after a compatible physical kit is confirmed received.</p> : null}</div></div>
        <div className="grid gap-2 border-t pt-4 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]"><p className="font-medium text-muted-foreground">Delivering to</p><DeliveryLocationAddress location={delivery.deliveryAddress} showInstructions={false} /></div>
        {delivery.kits.length ? <section aria-label="Physical kit deliveries" className="border-t pt-4"><div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-medium">Physical kits and tracking</h3><p className="text-xs text-muted-foreground">{received} received · {inTransit} on the way</p></div><ul className="divide-y rounded-md border">
          {delivery.kits.map(kit => <li key={kit.stockKitId} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0"><p className="font-medium wrap-anywhere">{kit.kitNumber}</p><p className="mt-1 wrap-anywhere text-muted-foreground">{kit.outboundCarrier} · Tracking {kit.outboundTrackingNumber}</p><p className="mt-1 text-xs text-muted-foreground">Sent <time dateTime={kit.dispatchedAt}>{new Date(kit.dispatchedAt).toLocaleDateString()}</time>{kit.receivedAt ? <> · Received <time dateTime={kit.receivedAt}>{new Date(kit.receivedAt).toLocaleDateString()}</time></> : null}</p></div>
            {!kit.receivedAt && canConfirm ? <Button variant="outline" size="sm" aria-label={`Confirm ${kit.kitNumber} received`} onClick={() => { receive.reset(); setReceiptBarcode(''); setBarcodeIssue(null); setReceivingId(kit.stockKitId) }}>Confirm received</Button> : null}
          </li>)}
        </ul>{inTransit > 0 && !canConfirm ? <p className="mt-2 text-xs text-muted-foreground">An organization or Department administrator can confirm receipt after the physical kit arrives.</p> : null}</section> : null}
      </> : null}
    </CardContent>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) closeReceipt() }}>
      <DialogContent showCloseButton={!receive.isPending} aria-busy={receive.isPending} onOpenAutoFocus={event => { event.preventDefault(); barcodeInput.current?.focus() }}>
        <DialogHeader><DialogTitle>Confirm physical kit receipt</DialogTitle><DialogDescription>Scan the barcode on the kit that arrived. It must match the selected kit below.</DialogDescription></DialogHeader>
        {receive.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(receive.error, 'Refresh the kit status and try again.')}</AlertDescription></Alert> : null}
        {selected ? <div className="space-y-4 text-sm">
          <div className="space-y-1.5"><Label htmlFor="receipt-kit-barcode"><RequiredFieldName>Physical kit barcode</RequiredFieldName></Label><Input ref={barcodeInput} id="receipt-kit-barcode" className="font-mono" value={receiptBarcode} maxLength={100} autoComplete="off" spellCheck={false} disabled={receive.isPending} aria-invalid={Boolean(barcodeIssue)} aria-describedby={`receipt-kit-barcode-help${barcodeIssue ? ' receipt-kit-barcode-error' : ''}`} onChange={event => { setReceiptBarcode(event.target.value); setBarcodeIssue(null) }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (checkReceiptBarcode(event.currentTarget.value)) confirmButton.current?.focus() } }} /><p id="receipt-kit-barcode-help" className="text-xs text-muted-foreground">Scan or enter the complete barcode printed on the physical kit.</p>{barcodeIssue ? <p id="receipt-kit-barcode-error" role="alert" className="text-xs text-destructive">{barcodeIssue}</p> : null}</div>
          <div className="rounded-md border bg-muted/30 p-3"><p className="text-xs font-medium text-muted-foreground">Physical kit number</p><p className="mt-1 font-mono font-semibold wrap-anywhere">{selected.kitNumber}</p></div>
          <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-muted-foreground">Carrier</dt><dd className="mt-0.5 font-medium wrap-anywhere">{selected.outboundCarrier}</dd></div><div><dt className="text-muted-foreground">Tracking number</dt><dd className="mt-0.5 font-medium wrap-anywhere">{selected.outboundTrackingNumber}</dd></div></dl>
          <p className="text-muted-foreground">Confirm only after this physical kit arrives. Tracking alone does not record receipt.</p>
        </div> : null}
        <RequiredDialogFooter><Button variant="outline" disabled={receive.isPending} onClick={closeReceipt}>Cancel</Button><Button ref={confirmButton} disabled={receive.isPending || !selected} onClick={confirmReceipt}>{receive.isPending ? 'Recording…' : 'Confirm physical receipt'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  </Card>
}
