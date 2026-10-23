import { SectionPanel } from '#/components/ui/section-panel'
import { DisplayDate } from '#/components/ui/display-value'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { useSourceSampleShipments } from '#/features/sample-shipping/use-source-sample-shipments'
import { humanizeStatus } from './OrderStatusBadge'

export function LabJobAfterSend({ orderId }: { orderId: string }) {
  const { allowed, shipments, related, receiptState } = useSourceSampleShipments(orderId)
  if (!allowed) return <p className="text-sm text-muted-foreground"><CustomerSourceText source={"Shipping information is not available with your current access."} /></p>
  if (shipments.error) return <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Shipment tracking could not be refreshed"} /></AlertTitle><AlertDescription><Button variant="outline" onClick={() => void shipments.refetch()}><CustomerSourceText source={"Retry shipment tracking"} /></Button></AlertDescription></Alert>
  if (receiptState !== 'ready') return <p role="status" className="text-sm text-muted-foreground">{receiptState === 'loading' ? <CustomerSourceText source={"Checking shipment tracking…"} /> : <CustomerSourceText source={"Shipment tracking is not currently available."} />}</p>
  const sent = related.filter(item => !item.isPackingPool && item.shippedAt)
  if (!sent.length) return null
  const receipt = related.find(item => item.orderExpectedTubeCount !== undefined && item.orderReceivedTubeCount !== undefined)
  return <SectionPanel as="div" heading={<h3 ><CustomerSourceText source={"Sent shipments"} /></h3>}>

    {receipt ? <p className="text-sm">{receipt.orderReceivedTubeCount} of {receipt.orderExpectedTubeCount} <CustomerSourceText source={"tubes received across this Job."} /></p> : null}
    <ul className="divide-y">{sent.map(item => <li key={item.id} className="space-y-1 py-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{item.shipmentNumber}</span><span>{humanizeStatus(item.status)}</span></div>
      <p className="wrap-anywhere text-muted-foreground">{item.carrier || 'Carrier not recorded'}{item.trackingNumber ? ` · Tracking ${item.trackingNumber}` : ''}</p>
      <p className="text-muted-foreground"><CustomerSourceText source={"Sent"} /> {<DisplayDate value={item.shippedAt!} />} · {item.destinationName}</p>
      {item.receivedTubeCount !== undefined && item.expectedTubeCount !== undefined ? <p>{item.receivedTubeCount} of {item.expectedTubeCount} <CustomerSourceText source={"tubes received in this shipment."} /></p> : <p className="text-muted-foreground"><CustomerSourceText source={"Receipt count not available."} /></p>}
    </li>)}</ul>
  </SectionPanel>
}
