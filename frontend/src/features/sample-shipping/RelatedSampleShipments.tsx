import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { useSourceSampleShipments } from './use-source-sample-shipments'

export function RelatedSampleShipments({ sourceId, staff = false, showSampleReceiptProgress = true }: { sourceId: string; staff?: boolean; showSampleReceiptProgress?: boolean }) {
  const { allowed, shipments, related, retired, sampleReceipts, receiptState } = useSourceSampleShipments(sourceId, staff)
  const unallocated = related.filter(value => value.isPackingPool).reduce((sum, value) => sum + value.crosswalk.length, 0)
  const receipt = related.find(value => value.orderExpectedTubeCount !== undefined && value.orderReceivedTubeCount !== undefined)
  return <section aria-label="Related shipments" className="space-y-3 border-t pt-4">
    <h3 className="font-semibold">Shipping containers</h3>
    {!allowed ? <p className="text-sm text-muted-foreground">Laboratory operators manage the return kit, tubes, and packet in Lab operations.</p>
      : shipments.error ? <div role="alert" className="text-sm">Shipments could not be loaded. <Button variant="outline" onClick={() => { void shipments.refetch() }}>Retry shipments</Button></div>
        : shipments.isLoading ? <p role="status" className="text-sm">Loading related shipments…</p>
          : related.length ? <>
            {unallocated > 0 ? <p className="text-sm font-medium">{unallocated} {unallocated === 1 ? 'tube still needs a shipping container.' : 'tubes still need shipping containers.'}</p> : null}
            {receipt ? <p className="text-sm">{receipt.orderReceivedTubeCount} of {receipt.orderExpectedTubeCount} tubes received across all shipments.</p> : null}
            <ul className="max-h-[28rem] divide-y overflow-y-auto">{related.map(shipment => <li key={shipment.id} className="space-y-1 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{shipment.isPackingPool ? 'Tubes awaiting containers' : shipment.shipmentNumber}</span><span>{shipment.status.replace(/([a-z])([A-Z])/g, '$1 $2')}</span></div>
            {shipment.container ? <p>{shipment.container.commonName} · SKU {shipment.container.sku} · Capacity {shipment.container.capacity} tubes</p> : null}
            <p>{shipment.destinationName} · {shipment.isPackingPool ? `${shipment.crosswalk.length} unallocated tubes` : `${shipment.crosswalk.filter(value => value.supplierTubeBarcode).length} of ${shipment.crosswalk.length} tubes matched`}</p>
            {!shipment.isPackingPool && shipment.receivedTubeCount !== undefined ? <p>{shipment.receivedTubeCount} of {shipment.expectedTubeCount ?? shipment.crosswalk.length} tubes received in this shipment.</p> : null}
            {shipment.trackingNumber ? <p>{shipment.carrier} · Tracking {shipment.trackingNumber}</p> : null}
            <div className="pt-2">
              <Button asChild>
                {staff ? <Link to="/lab-operations" search={{ section: 'receipt', shipmentId: shipment.id }}>Open Lab shipping</Link>
                  : <Link to="/sample-shipping/$shipmentId" params={{ shipmentId: shipment.id }}>{shipment.isPackingPool ? 'Choose containers' : 'Open shipment'}</Link>}
              </Button>
            </div>
          </li>)}</ul>
          {showSampleReceiptProgress && sampleReceipts.size > 0 ? <details><summary className="cursor-pointer text-sm font-medium">Sample receipt progress</summary><ul className="mt-2 max-h-60 space-y-2 overflow-y-auto text-sm">{[...sampleReceipts.entries()].map(([id, item]) => <li key={id}><span className="font-medium">{item.name}</span> · {receiptState === 'loading' ? 'Checking receipt…' : receiptState !== 'ready' || !item.counts ? 'Receipt not available' : <>{item.counts.received} of {item.counts.total} {item.counts.total === 1 ? 'tube' : 'tubes'} received{item.counts.received > 0 && item.counts.received < item.counts.total ? ' · Partially received' : item.counts.received >= item.counts.total ? ' · Complete' : ' · Awaiting receipt'}</>}</li>)}</ul></details> : null}
          </> : <p className="text-sm text-muted-foreground">Container preparation appears after the sample list is authorized. Phaeno supplies registered, permanently barcoded tubes.</p>}
    {allowed && staff && retired.length > 0 ? <details><summary className="cursor-pointer text-sm font-medium">Retired container configurations ({retired.length})</summary><p className="mt-2 text-xs text-muted-foreground">Previous configurations are retained as history.</p><ul className="mt-2 space-y-2 text-sm">{retired.map(shipment => <li key={shipment.id}><span>{shipment.shipmentNumber}</span></li>)}</ul></details> : null}
  </section>
}
