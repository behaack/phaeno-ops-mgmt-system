import { RecordLink } from '#/components/ui/record-link'
import { CustomerSourceText, useCustomerSourceText } from '#/features/customer-i18n/customer-text'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { ShippingStockKit } from '#/api/shipping-containers'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { containerDateTime } from '../configuration/shipping-container-utils'
import { stockKitState } from './stock-kit-utils'

export function StockKitFacts({ kit }: { kit: ShippingStockKit }) {
  const state = stockKitState(kit), atPhaeno = state === 'Preparing' || state === 'Ready'
  const originNumber = kit.originatingJobNumber ?? kit.authorizationReference
  const assignedShipmentId = kit.boundSampleShipmentId ?? kit.reservedSampleShipmentId
  return <div className="space-y-4">
    <Card className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle><CustomerSourceText source={"Kit details"} /></CardTitle></CardHeader><CardContent className="grid items-start gap-6 p-4 lg:grid-cols-2">
      <section aria-labelledby="kit-location-heading"><h3 id="kit-location-heading" className="font-medium"><CustomerSourceText source={"Location and assignment"} /></h3><dl className="mt-2 divide-y text-sm">
        {!atPhaeno ? <Fact label="Customer">{[kit.organizationName, kit.departmentName].filter(Boolean).join(' · ') || 'Not recorded'}</Fact> : null}
        <Fact label="Location">{atPhaeno ? <CustomerSourceText source={"Phaeno"} /> : kit.deliveryLocationLabel || 'Location not recorded'}</Fact>
        <Fact label="Customer receipt">{kit.customerReceivedAt ? containerDateTime(kit.customerReceivedAt) : atPhaeno ? 'Not dispatched' : 'Not acknowledged'}</Fact>
        <Fact label="Assigned Job">{kit.assignedJobId && kit.assignedJobNumber ? <RecordLink asChild><Link to="/order-operations/lab-services/orders/$orderId" params={{ orderId: kit.assignedJobId }}>{kit.assignedJobNumber}</Link></RecordLink> : state === 'InUse' || state === 'Assigned' ? 'See assigned shipment' : 'Not assigned'}</Fact>
        {assignedShipmentId ? <Fact label="Sample shipment"><Link className="text-primary underline underline-offset-2" to="/lab-operations" search={{ section: 'receipt', receiptTab: 'receiving', shipmentId: assignedShipmentId }}><CustomerSourceText source={"Open assigned shipment"} /></Link></Fact> : null}
      </dl>{state === 'Available' ? <p className="mt-3 text-sm text-muted-foreground"><CustomerSourceText source={"Received and unused. An eligible Job at this location can use this container."} /></p> : state === 'Assigned' ? <p className="mt-3 text-sm text-muted-foreground"><CustomerSourceText source={"Reserved for the assigned Job. Resetting its configuration before tube scanning releases the container."} /></p> : state === 'InUse' ? <p className="mt-3 text-sm text-muted-foreground"><CustomerSourceText source={"Tube use has started. Normal reset and reassignment are locked."} /></p> : null}</section>
      <section aria-labelledby="kit-products-heading"><h3 id="kit-products-heading" className="font-medium"><CustomerSourceText source={"Products"} /></h3><dl className="mt-2 divide-y text-sm">
        <Fact label="Tube supplier">{kit.tubeSupplierName}</Fact><Fact label="Tube product">{kit.tubeProductNumber}{kit.tubeProductDescription ? ' — ' + kit.tubeProductDescription : null}</Fact><Fact label="Tube lot">{kit.tubeLotNumber || 'Not specified'}</Fact>
        <Fact label="Shipper supplier">{kit.shipperSupplierName}</Fact><Fact label="Shipper product">{kit.shipperProductNumber}{kit.shipperProductDescription ? ' — ' + kit.shipperProductDescription : null}</Fact>
      </dl></section>
      <section aria-labelledby="kit-expiration-heading" className="border-t pt-4 lg:col-span-2"><h3 id="kit-expiration-heading" className="font-medium"><CustomerSourceText source={"Product expiration records"} /></h3>
        {kit.productExpirations?.length ? <dl className="mt-2 divide-y text-sm">{kit.productExpirations.map(product => <Fact key={product.supplierProductId} label={product.supplierName + ' · ' + product.productNumber}>{product.expirationDate ? product.expirationDate + (product.expirationDate < new Date().toISOString().slice(0, 10) ? ' · Expired' : '') : product.canExpire ? 'Expiration unknown' : 'Expiration not required when recorded'}</Fact>)}</dl> : <p className="mt-2 text-sm text-muted-foreground"><CustomerSourceText source={"Expiration requirements and dates were not recorded for this kit."} /></p>}
      </section>
    </CardContent></Card>
    <Card className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle><CustomerSourceText source={"Dispatch history"} /></CardTitle></CardHeader><CardContent className="p-4">
      {!kit.fulfilledAt ? <p className="mb-2 text-sm text-muted-foreground"><CustomerSourceText source={"This kit has not been dispatched."} /></p> : null}
      <dl className="divide-y text-sm">
        {kit.transportationKitRequestId || kit.fulfilledAt ? <Fact label="Originating request">{kit.transportationKitRequestId ? <RecordLink asChild><Link to="/lab-operations/kit-requests/$requestId" params={{ requestId: kit.transportationKitRequestId }} search={{ section: 'kit-requests' }}><CustomerSourceText source={"Request"} /> {kit.transportationKitRequestId.slice(0, 8).toUpperCase()}</Link></RecordLink> : <CustomerSourceText source={"Not recorded"} />}</Fact> : null}
        {originNumber || kit.fulfilledAt ? <Fact label="Originating Job">{originNumber || 'Not recorded'}</Fact> : null}
        {kit.fulfilledAt ? <><Fact label="Carrier">{kit.outboundCarrier || 'Not recorded'}</Fact><Fact label="Tracking number">{kit.outboundTrackingNumber || 'Not recorded'}</Fact><Fact label="Dispatched at">{containerDateTime(kit.fulfilledAt)}</Fact></> : null}
      </dl>{kit.deliveryLocationId ? <p className="mt-3 text-xs text-muted-foreground"><CustomerSourceText source={"The originating Job records why the kit was ordered. It does not restrict unused Customer location stock to that Job."} /></p> : null}
    </CardContent></Card>
  </div>
}

export function StockKitTubeRoster({ kit }: { kit: ShippingStockKit }) {
  const state = stockKitState(kit)
  return <Card className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><CardTitle><CustomerSourceText source={"Physical tube roster"} /></CardTitle><Badge variant={kit.tubes.length === kit.container.capacity ? 'secondary' : 'outline'}>{kit.tubes.length === kit.container.capacity ? <CustomerSourceText source={"All tubes recorded"} /> : <CustomerSourceText source={"Incomplete"} />}</Badge></div>
    <p className="text-sm text-muted-foreground">{kit.tubes.length} of {kit.container.capacity} <CustomerSourceText source={"tubes registered"} /></p>
  </CardHeader><CardContent className="space-y-3 p-4">
    {kit.tubes.length ? <RegisteredTubeList tubes={kit.tubes} /> : <p className="text-sm text-muted-foreground"><CustomerSourceText source={"Use Actions →"} /> {kit.assemblyWorkflowRevisionId ? <CustomerSourceText source={"Resume assembly"} /> : <CustomerSourceText source={"Register tubes"} />} <CustomerSourceText source={"to scan each permanent supplier barcode into this kit."} /></p>}
    <p className="text-sm text-muted-foreground">{kit.fulfilledAt ? <CustomerSourceText source={"The recorded tube roster is frozen after dispatch."} /> : kit.assemblyWorkflowRevisionId && !kit.assemblyCompletedAt ? 'Scan each tube as it goes into the container. Resume assembly to review saved IDs and complete the kit.' : state === 'Ready' ? 'Assembly is complete and the full tube roster is recorded. The kit is ready for dispatch.' : 'Record the exact required tube roster before completion.'}</p>
    {kit.tubesVerifiedAt ? <p className="text-xs text-muted-foreground"><CustomerSourceText source={"Optional physical rescan recorded"} /> {containerDateTime(kit.tubesVerifiedAt)}.</p> : null}
    {kit.tubeCorrections?.length ? <details><summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"><CustomerSourceText source={"Tube ID corrections ("} />{kit.tubeCorrections.length})</summary><ul className="mt-2 space-y-2 text-xs text-muted-foreground">{kit.tubeCorrections.map((item, index) => <li key={item.correctedAt + '-' + index} className="wrap-anywhere">{item.previousBarcode} → {item.replacementBarcode} · {containerDateTime(item.correctedAt)} · {item.reason}</li>)}</ul></details> : null}
  </CardContent></Card>
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1 py-2.5 sm:grid-cols-[9rem_1fr]"><dt className="text-muted-foreground wrap-anywhere">{label}</dt><dd className="min-w-0 wrap-anywhere">{children}</dd></div>
}

export function RegisteredTubeList({ tubes }: { tubes: ShippingStockKit['tubes'] }) {
  const __customerSource = useCustomerSourceText()

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users must be able to scroll the fixed tube history.
    <div role="region" tabIndex={0} aria-label={__customerSource("Registered tube barcodes")} className="max-h-96 overflow-y-auto overscroll-contain rounded-md border px-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><ul className="divide-y">{tubes.map(tube => <li key={tube.id} className="wrap-anywhere py-2 font-mono text-sm">{tube.supplierBarcode}</li>)}</ul></div>
  )
}
