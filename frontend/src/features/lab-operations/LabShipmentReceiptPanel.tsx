import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { receiveLabShipment } from '#/api/lab-shipment-receipt'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { LabShipmentQueue } from './LabShipmentQueue'

export function LabShipmentReceiptPanel({ apiEnabled, canReceive, onAccession }: {
  apiEnabled: boolean
  canReceive: boolean
  onAccession: (barcode: string) => void
}) {
  const client = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [barcode, setBarcode] = useState('')
  const receipt = useMutation({ mutationFn: receiveLabShipment, retry: false,
    onSuccess: async () => {
      setBarcode('')
      await Promise.all(['lab-shipment-queue', 'sample-shipments', 'platform-sample-shipments', 'sample-shipment', 'lab-receipt-context', 'lab-operations', 'lab-work-order'].map(key => client.invalidateQueries({ queryKey: [key] })))
    },
    onSettled: () => window.requestAnimationFrame(() => input.current?.focus()),
  })
  return <div className="space-y-5"><Card><CardHeader><CardTitle>Receive a shipment</CardTitle><CardDescription>Scan the PH-P- barcode under “Scan to receive this shipment” in the body of the shipping insert when this container physically arrives. Submitting the scan records shipment receipt.</CardDescription></CardHeader><CardContent className="space-y-4">
    {canReceive ? <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (apiEnabled && barcode.trim() && !receipt.isPending) receipt.mutate(barcode.trim()) }}>
      <div className="w-full max-w-xl space-y-1"><Label htmlFor="container-receipt-barcode">Shipping insert barcode</Label><p id="container-receipt-help" className="text-sm text-muted-foreground">Use the complete PH-P- code. Order, shipment-reference, container and tube barcodes do not acknowledge receipt here.</p><Input ref={input} id="container-receipt-barcode" aria-describedby="container-receipt-help" placeholder="PH-P-…" autoComplete="off" spellCheck={false} value={barcode} disabled={receipt.isPending} onChange={event => { setBarcode(event.target.value); receipt.reset() }} /></div>
      <Button type="submit" disabled={!apiEnabled || !barcode.trim() || receipt.isPending}>{receipt.isPending ? 'Receiving…' : 'Receive shipment'}</Button>
    </form> : <p className="text-sm text-muted-foreground">A laboratory operator or supervisor can acknowledge shipment receipt.</p>}
    {receipt.error ? <Alert variant="destructive"><AlertTitle>Shipment receipt could not be confirmed</AlertTitle><AlertDescription>{getLabOperationsError(receipt.error, 'Scan the same insert again to check or record its receipt. Repeated scans do not create another receipt.')}</AlertDescription></Alert> : null}
    {receipt.data ? <Alert><AlertTitle>{receipt.data.alreadyReceived ? 'Shipment already received' : 'Shipment received'} · {receipt.data.shipmentNumber}</AlertTitle><AlertDescription><p>Received {new Date(receipt.data.receivedAt).toLocaleString()}. Next, accession the individual tubes.</p><Button className="mt-3" onClick={() => onAccession(receipt.data.barcode)}>Accession samples</Button></AlertDescription></Alert> : null}
  </CardContent></Card><LabShipmentQueue apiEnabled={apiEnabled} /></div>
}
