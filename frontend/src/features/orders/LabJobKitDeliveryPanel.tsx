import { DisplayDate } from '#/components/ui/display-value'
import { RecordTableHeader } from '#/components/ui/record-list'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
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
  const __customerText = useCustomerText()

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
    { scope: 'kit cancellation', description: __customerText('m_8198f1364911') })
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
    ? { title: __customerText('m_ff6231ca5fe0'), detail: 'Phaeno is preparing your kits. Carrier and tracking details will appear here when a kit is sent.', icon: Package, tone: 'border-[var(--warning-border)] bg-[var(--warning-background)] text-[var(--warning)]' }
    : delivery.status === 'PartiallyDispatched'
      ? { title: inTransit > 0 ? transitTitle : 'More kits are being prepared', detail: 'Phaeno is preparing the remaining kits. Confirm each kit only after it physically arrives.', icon: Truck, tone: 'border-primary/30 bg-primary/5 text-primary' }
      : delivery.status === 'Dispatched'
        ? { title: transitTitle, detail: 'Use the tracking details below and confirm each kit after checking its physical barcode.', icon: Truck, tone: 'border-primary/30 bg-primary/5 text-primary' }
        : delivery.status === 'Received'
          ? { title: __customerText('m_26395d29fba1'), detail: 'The dispatched kits have been confirmed received. You can use compatible received kits to prepare your sample shipment.', icon: CircleCheck, tone: 'border-accent bg-accent/40 text-accent-foreground' }
          : { title: __customerText('m_2bc9280f8aea'), detail: 'This kit order was cancelled. Contact Phaeno if you still need transportation kits for this Job.', icon: Package, tone: 'border-border bg-muted/30 text-muted-foreground' }
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
        <DialogTitle>{cancelling ? <CustomerSourceText source={"Cancel kit order?"} /> : selected ? "Confirm physical kit receipt" : __customerText('m_bcf917bc429e')}</DialogTitle>
        <DialogDescription>{cancelling ? <CustomerSourceText source={"Review this unshipped request before cancelling."} /> : selected ? "Check the physical kit that arrived before recording receipt." : __customerText('m_f09b1d3afc5c', { p0: String(delivery ? `Review kit fulfillment for Job ${delivery.jobNumber}.` : 'Review kit fulfillment and delivery details.') })}</DialogDescription>
      </DialogHeader>
      {receive.error && selected ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(receive.error, 'Refresh the kit status and try again.')} />}</AlertDescription></Alert> : null}
      {request.error && !selected ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_43854922386e" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(request.error, 'Try again.')} />} <Button variant="outline" size="sm" onClick={() => void request.refetch()}><CustomerText message="m_942087cc2d41" /></Button></AlertDescription></Alert> : null}
      {cancelling ? <div className="space-y-4"><p className="text-sm"><CustomerText message="m_13ebf622a7c0" />{delivery?.phaseName ?? `Job ${delivery?.jobNumber}`}<CustomerText message="m_9a3d04ca9e8c" /></p><Field><Label htmlFor="kit-cancellation-reason"><CustomerText message="m_0f7d4664a9bc" /></Label><Textarea id="kit-cancellation-reason" value={cancelReason} onChange={event => setCancelReason(event.target.value)} rows={3} maxLength={2000} disabled={cancel.isPending} /></Field>{cancel.error ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(cancel.error, 'Your reason is preserved. Refresh and try again.')} />}</AlertDescription></Alert> : null}</div> : !selected ? <div className="space-y-4">
      {delivery?.phaseName ? <p className="text-sm"><strong><CustomerText message="m_c8a898c23079" /></strong> {delivery.phaseName}</p> : null}
      {request.isLoading ? <p role="status"><CustomerText message="m_fb52211ffb6c" /></p> : null}
      {request.data === null ? <div className="flex items-start gap-3 rounded-md border border-accent bg-accent/40 p-4 text-sm"><CircleCheck className="mt-0.5 size-5 shrink-0 text-[var(--status-ready)]" aria-hidden="true" /><div><p className="font-semibold"><CustomerText message="m_6d8b70a52762" /></p><p className="mt-1 text-muted-foreground"><CustomerText message="m_af79623d12c8" /></p></div></div> : null}
      {delivery && status ? <>
        <div role="status" className={`flex items-start gap-3 rounded-md border p-4 ${status.tone}`}><status.icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div className="min-w-0"><p className="font-semibold text-foreground">{status.title}</p><p className="mt-1 text-sm text-foreground">{status.detail}</p>{received === 0 && ['Pending', 'PartiallyDispatched', 'Dispatched'].includes(delivery.status) ? <p className="mt-2 text-sm text-foreground"><CustomerText message="m_9b1561bf2c6a" /></p> : null}</div></div>
        <div className="grid gap-2 border-t pt-4 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]"><p className="font-medium text-muted-foreground"><CustomerText message="m_e2afb17ad515" /></p><DeliveryLocationAddress location={delivery.deliveryAddress} showInstructions={false} /></div>
        {canConfirm && delivery.canCancel ? <Button variant="outline" onClick={() => { cancel.reset(); setCancelReason(''); setCancelling(true) }}><CustomerText message="m_811258270797" /></Button> : null}
        <section aria-labelledby="kit-order-contents" className="border-t pt-4">
          <h3 id="kit-order-contents" className="mb-2 font-semibold"><CustomerText message="m_aee227968754" /></h3>
          {delivery.lines.length ? <table className="w-full text-sm"><RecordTableHeader><tr className="border-b text-left text-xs text-muted-foreground"><th scope="col" className="pb-2 font-medium"><CustomerText message="m_875d60ed20f4" /></th><th scope="col" className="pb-2 pl-2 text-right font-medium"><CustomerText message="m_a9be9c3e9ab6" /></th><th scope="col" className="pb-2 pl-2 text-right font-medium"><CustomerText message="m_c16bc82bf1f0" /></th><th scope="col" className="pb-2 pl-2 text-right font-medium"><CustomerText message="m_49f19beeecf4" /></th></tr></RecordTableHeader><tbody>
            {delivery.lines.map(line => <tr key={line.id} className="border-b last:border-0"><th scope="row" className="py-2 text-left font-medium wrap-anywhere">{line.commonName}<span className="block text-xs font-normal text-muted-foreground">{line.tubeCapacity} <CustomerText message="m_4a75ed599b36" /></span></th><td className="py-2 pl-2 text-right tabular-nums">{line.requestedQuantity}</td><td className="py-2 pl-2 text-right tabular-nums">{line.dispatchedQuantity}</td><td className="py-2 pl-2 text-right tabular-nums">{line.receivedQuantity}</td></tr>)}
          </tbody></table> : <p className="text-sm text-muted-foreground"><CustomerText message="m_c29a7964e9a2" /></p>}
        </section>
        {delivery.kits.length ? <section aria-label={__customerText('m_ce1f9ad6fea0')} className="border-t pt-4"><div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-medium"><CustomerText message="m_14e3d1988636" /></h3><p className="text-xs text-muted-foreground">{received} <CustomerText message="m_d055c699b019" />{inTransit} <CustomerText message="m_e87170570024" /></p></div><ul className="divide-y rounded-md border">
          {delivery.kits.map(kit => <li key={kit.stockKitId} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0"><p className="font-medium wrap-anywhere">{kit.kitNumber}</p><p className="mt-1 wrap-anywhere text-muted-foreground">{kit.outboundCarrier} <CustomerText message="m_d5f8fccbb347" />{kit.outboundTrackingNumber}</p><p className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_dae865f4ea03" /><time dateTime={kit.dispatchedAt}>{<DisplayDate value={kit.dispatchedAt} />}</time>{kit.receivedAt ? <> <CustomerText message="m_063a0abddec8" /><time dateTime={kit.receivedAt}>{<DisplayDate value={kit.receivedAt} />}</time></> : null}</p></div>
            {!kit.receivedAt && canConfirm && delivery.canConfirmReceipt ? <Button variant="outline" size="sm" aria-label={__customerText('m_a64c5209030c', { p0: String(kit.kitNumber) })} onClick={() => { receive.reset(); setReceiptBarcode(''); setBarcodeIssue(null); setReceivingId(kit.stockKitId) }}><CustomerText message="m_e379861f6cea" /></Button> : null}
          </li>)}
        </ul>{inTransit > 0 && !canConfirm ? <p className="mt-2 text-xs text-muted-foreground"><CustomerText message="m_d147684cec42" /></p> : null}</section> : null}
      </> : null}
      </div> : <div className="space-y-4 text-sm">
          <div className="rounded-md border bg-muted/30 p-3"><p className="text-xs font-medium text-muted-foreground"><CustomerText message="m_dc70550fe32b" /></p><p className="mt-1 font-mono font-semibold wrap-anywhere">{selected.kitNumber}</p></div>
          <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-muted-foreground"><CustomerText message="m_271c535631ff" /></dt><dd className="mt-0.5 font-medium wrap-anywhere">{selected.outboundCarrier}</dd></div><div><dt className="text-muted-foreground"><CustomerText message="m_d56dcd96cae6" /></dt><dd className="mt-0.5 font-medium wrap-anywhere">{selected.outboundTrackingNumber}</dd></div></dl>
          <Field><Label htmlFor="receipt-kit-barcode"><RequiredFieldName><CustomerText message="m_a90386cb0c79" /></RequiredFieldName></Label><Input ref={barcodeInput} id="receipt-kit-barcode" className="font-mono" value={receiptBarcode} maxLength={100} autoComplete="off" spellCheck={false} disabled={receive.isPending} aria-invalid={Boolean(barcodeIssue)} aria-describedby={`receipt-kit-barcode-help${barcodeIssue ? ' receipt-kit-barcode-error' : ''}`} onChange={event => { setReceiptBarcode(event.target.value); setBarcodeIssue(null) }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (checkReceiptBarcode(event.currentTarget.value)) confirmButton.current?.focus() } }} /><FieldDescription id="receipt-kit-barcode-help"><CustomerText message="m_17a003224d42" /></FieldDescription><FieldError id="receipt-kit-barcode-error">{barcodeIssue}</FieldError></Field>
          <p className="text-muted-foreground"><CustomerText message="m_823de1c030bb" /></p>
      </div>}
      {cancelling ? <RequiredDialogFooter showLegend={false}><Button ref={receiptCancel} variant="outline" disabled={cancel.isPending} onClick={cancellationDismissal.close}><CustomerText message="m_e45d7bfb080d" /></Button><Button variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{cancel.isPending ? <CustomerSourceText source={"Cancelling…"} /> : __customerText('m_811258270797')}</Button></RequiredDialogFooter> : selected ? <RequiredDialogFooter><Button ref={receiptCancel} variant="outline" disabled={receive.isPending} onClick={closeReceipt}><CustomerText message="m_19766ed6ccb2" /></Button><Button ref={confirmButton} disabled={receive.isPending} onClick={confirmReceipt}>{receive.isPending ? <CustomerSourceText source={"Recording…"} /> : __customerText('m_03abca66fcf4')}</Button></RequiredDialogFooter>
        : <DialogFooter><Button ref={closeButton} variant="outline" onClick={() => onOpenChange(false)}><CustomerText message="m_0533bf0a6ab4" /></Button></DialogFooter>}
    </DialogContent>
  </Dialog>{cancellationDismissal.confirmation}</>
}
