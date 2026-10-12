import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { useSourceSampleShipments } from './use-source-sample-shipments'

export function RelatedSampleShipments({ sourceId, staff = false, showSampleReceiptProgress = true }: { sourceId: string; staff?: boolean; showSampleReceiptProgress?: boolean }) {
  const __customerText = useCustomerText()

  const { allowed, shipments, related, retired, sampleReceipts, receiptState } = useSourceSampleShipments(sourceId, staff)
  const unallocated = related.filter(value => value.isPackingPool).reduce((sum, value) => sum + value.crosswalk.length, 0)
  const receipt = related.find(value => value.orderExpectedTubeCount !== undefined && value.orderReceivedTubeCount !== undefined)
  return <section aria-label={__customerText('m_458170a809f7')} className="space-y-3 border-t pt-4">
    <h3 className="font-semibold"><CustomerText message="m_069c9ed08a56" /></h3>
    {!allowed ? <p className="text-sm text-muted-foreground"><CustomerText message="m_f448cbfd6b69" /></p>
      : shipments.error ? <div role="alert" className="text-sm"><CustomerText message="m_3c88f45d3c0a" /><Button variant="outline" onClick={() => { void shipments.refetch() }}><CustomerText message="m_6b505c2eafc9" /></Button></div>
        : shipments.isLoading ? <p role="status" className="text-sm"><CustomerText message="m_1346b6eb5c93" /></p>
          : related.length ? <>
            {unallocated > 0 ? <p className="text-sm font-medium">{unallocated} {unallocated === 1 ? <CustomerSourceText source={"tube still needs a shipping container."} /> : __customerText('m_58ff4c762b35')}</p> : null}
            {receipt ? <p className="text-sm">{receipt.orderReceivedTubeCount} of {receipt.orderExpectedTubeCount} <CustomerText message="m_0c5d9ee60168" /></p> : null}
            <ul className="max-h-[28rem] divide-y overflow-y-auto">{related.map(shipment => <li key={shipment.id} className="space-y-1 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{shipment.isPackingPool ? <CustomerSourceText source={"Tubes awaiting containers"} /> : shipment.shipmentNumber}</span><span>{shipment.status.replace(/([a-z])([A-Z])/g, '$1 $2')}</span></div>
            {shipment.container ? <p>{shipment.container.commonName} <CustomerText message="m_ce92c91a9097" />{shipment.container.sku} <CustomerText message="m_37bdf9777d54" />{shipment.container.capacity} <CustomerText message="m_0f4552851513" /></p> : null}
            <p>{shipment.destinationName} · {shipment.isPackingPool ? __customerText('m_98c699dbcf79', { p0: String(shipment.crosswalk.length) }) : __customerText('m_df3da940050f', { p0: String(shipment.crosswalk.filter(value => value.supplierTubeBarcode).length), p1: String(shipment.crosswalk.length) })}</p>
            {!shipment.isPackingPool && shipment.receivedTubeCount !== undefined ? <p>{shipment.receivedTubeCount} of {shipment.expectedTubeCount ?? shipment.crosswalk.length} <CustomerText message="m_90af0fc8c247" /></p> : null}
            {shipment.trackingNumber ? <p>{shipment.carrier} <CustomerText message="m_d5f8fccbb347" />{shipment.trackingNumber}</p> : null}
            <div className="pt-2">
              <Button asChild>
                {staff ? <Link to="/lab-operations" search={{ section: "receipt", shipmentId: shipment.id }}><CustomerText message="m_b084126b903e" /></Link>
                  : <Link to="/sample-shipping/$shipmentId" params={{ shipmentId: shipment.id }}>{shipment.isPackingPool ? <CustomerSourceText source={"Choose containers"} /> : __customerText('m_2e7d2b1376f3')}</Link>}
              </Button>
            </div>
          </li>)}</ul>
          {showSampleReceiptProgress && sampleReceipts.size > 0 ? <details><summary className="cursor-pointer text-sm font-medium"><CustomerText message="m_3cc042bc2409" /></summary><ul className="mt-2 max-h-60 space-y-2 overflow-y-auto text-sm">{[...sampleReceipts.entries()].map(([id, item]) => <li key={id}><span className="font-medium">{item.name}</span> · {receiptState === 'loading' ? <CustomerSourceText source={"Checking receipt…"} /> : receiptState !== 'ready' || !item.counts ? "Receipt not available" : <>{item.counts.received} of {item.counts.total} {item.counts.total === 1 ? <CustomerSourceText source={"tube"} /> : __customerText('m_cc169e248ff2')} <CustomerText message="m_45e182c95bc5" />{item.counts.received > 0 && item.counts.received < item.counts.total ? <CustomerSourceText source={" · Partially received"} /> : item.counts.received >= item.counts.total ? " · Complete" : __customerText('m_e10df7612bea')}</>}</li>)}</ul></details> : null}
          </> : <p className="text-sm text-muted-foreground"><CustomerText message="m_1053bcb05d74" /></p>}
    {allowed && staff && retired.length > 0 ? <details><summary className="cursor-pointer text-sm font-medium"><CustomerText message="m_d868038600ae" />{retired.length})</summary><p className="mt-2 text-xs text-muted-foreground"><CustomerText message="m_f7806ef5db23" /></p><ul className="mt-2 space-y-2 text-sm">{retired.map(shipment => <li key={shipment.id}><span>{shipment.shipmentNumber}</span></li>)}</ul></details> : null}
  </section>
}
