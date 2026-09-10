import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { ShippingStockKit } from '#/api/shipping-containers'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { ShippingBarcode } from '#/features/sample-shipping/ShippingBarcode'
import { containerDateTime } from '../configuration/shipping-container-utils'
import { stockKitState } from './stock-kit-utils'

export function StockKitFacts({ kit }: { kit: ShippingStockKit }) {
  const state = stockKitState(kit), atPhaeno = state === 'Preparing' || state === 'Ready'
  const originNumber = kit.originatingJobNumber ?? kit.authorizationReference
  const assignedShipmentId = kit.boundSampleShipmentId ?? kit.reservedSampleShipmentId
  return <div className="grid items-start gap-5 lg:grid-cols-2">
    <div className="space-y-5">
      <Card><CardHeader><CardTitle>Location and assignment</CardTitle></CardHeader><CardContent><dl className="divide-y text-sm">
        {!atPhaeno ? <Fact label="Customer">{[kit.organizationName, kit.departmentName].filter(Boolean).join(' · ') || 'Not recorded'}</Fact> : null}
        <Fact label="Location">{atPhaeno ? 'Phaeno' : kit.deliveryLocationLabel || 'Location not recorded'}</Fact>
        <Fact label="Customer receipt">{kit.customerReceivedAt ? containerDateTime(kit.customerReceivedAt) : atPhaeno ? 'Not dispatched' : 'Not acknowledged'}</Fact>
        <Fact label="Assigned Job">{kit.assignedJobId && kit.assignedJobNumber ? <Link className="text-primary underline underline-offset-2" to="/order-operations/$workflow/$orderId" params={{ workflow: 'lab', orderId: kit.assignedJobId }}>{kit.assignedJobNumber}</Link> : state === 'InUse' || state === 'Assigned' ? 'See assigned shipment' : 'Not assigned'}</Fact>
        {assignedShipmentId ? <Fact label="Sample shipment"><Link className="text-primary underline underline-offset-2" to="/lab-operations" search={{ section: 'receipt', shipmentId: assignedShipmentId }}>Open assigned shipment</Link></Fact> : null}
      </dl>{state === 'Available' ? <p className="mt-3 text-sm text-muted-foreground">Received and unused. An eligible Job at this location can use this container.</p> : state === 'Assigned' ? <p className="mt-3 text-sm text-muted-foreground">Reserved for the assigned Job. Resetting its configuration before tube scanning releases the container.</p> : state === 'InUse' ? <p className="mt-3 text-sm text-muted-foreground">Tube use has started. Normal reset and reassignment are locked.</p> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle>Dispatch history</CardTitle></CardHeader><CardContent><dl className="divide-y text-sm">
        <Fact label="Originating request">{kit.transportationKitRequestId ? <Link className="text-primary underline underline-offset-2" to="/lab-operations/kit-requests/$requestId" params={{ requestId: kit.transportationKitRequestId }} search={{ section: 'receipt' }}>Request {kit.transportationKitRequestId.slice(0, 8).toUpperCase()}</Link> : 'Not recorded'}</Fact>
        <Fact label="Originating Job">{originNumber || 'Not recorded'}</Fact>
        <Fact label="Carrier">{kit.outboundCarrier || 'Not dispatched'}</Fact><Fact label="Tracking number">{kit.outboundTrackingNumber || 'Not dispatched'}</Fact><Fact label="Dispatched at">{kit.fulfilledAt ? containerDateTime(kit.fulfilledAt) : 'Not dispatched'}</Fact>
      </dl>{kit.deliveryLocationId ? <p className="mt-3 text-xs text-muted-foreground">The originating Job records why the kit was ordered. It does not restrict unused Customer location stock to that Job.</p> : null}</CardContent></Card>
    </div>
    <div className="space-y-5">
      <Card><CardHeader><CardTitle>Physical container</CardTitle></CardHeader><CardContent className="space-y-4"><ShippingBarcode value={kit.kitNumber} label="Container barcode" /><dl className="divide-y text-sm"><Fact label="Tube supplier">{kit.tubeSupplierName}</Fact><Fact label="Tube product">{kit.tubeProductNumber}</Fact><Fact label="Tube lot">{kit.tubeLotNumber || 'Not specified'}</Fact><Fact label="Shipper supplier">{kit.shipperSupplierName}</Fact><Fact label="Shipper product">{kit.shipperProductNumber}</Fact></dl></CardContent></Card>
      <Card><CardHeader><CardTitle>Registered tubes</CardTitle><p className="text-sm text-muted-foreground">{kit.tubes.length} of {kit.container.capacity} tubes registered</p></CardHeader><CardContent>{kit.tubes.length ? <RegisteredTubeList tubes={kit.tubes} /> : <p className="text-sm text-muted-foreground">Register the permanent supplier barcode on each physical tube.</p>}<p className="mt-3 text-sm text-muted-foreground">{atPhaeno ? state === 'Ready' ? 'The complete kit is ready for dispatch.' : 'Register the full configured capacity before dispatch.' : 'The registered tube membership is frozen after dispatch.'}</p></CardContent></Card>
    </div>
  </div>
}
function Fact({ label, children }: { label: string; children: ReactNode }) { return <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 wrap-anywhere">{children}</dd></div> }
function RegisteredTubeList({ tubes }: { tubes: ShippingStockKit['tubes'] }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users must be able to scroll the fixed tube history.
    <div role="region" tabIndex={0} aria-label="Registered tube barcodes" className="max-h-96 overflow-y-auto overscroll-contain rounded-md border px-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><ul className="divide-y">{tubes.map(tube => <li key={tube.id} className="wrap-anywhere py-2 font-mono text-sm">{tube.supplierBarcode}</li>)}</ul></div>
  )
}
