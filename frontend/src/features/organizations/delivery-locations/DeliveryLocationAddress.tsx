import type { CustomerDeliveryLocation } from '#/api/customer-delivery-locations'

export function DeliveryLocationAddress({ location, showInstructions = true }: { location: CustomerDeliveryLocation; showInstructions?: boolean }) {
  return <div className="min-w-0 space-y-2 text-sm wrap-anywhere">
    <address className="not-italic"><p className="font-medium">{location.recipient}</p><p>{location.line1}</p>{location.line2 ? <p>{location.line2}</p> : null}<p>{location.city}, {location.region} {location.postalCode}</p><p>{location.countryCode}</p>{location.phone ? <p className="mt-2">{location.phone}</p> : null}</address>
    {showInstructions && location.deliveryInstructions ? <div className="border-t pt-2"><p className="font-medium">Delivery instructions</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{location.deliveryInstructions}</p></div> : null}
  </div>
}
