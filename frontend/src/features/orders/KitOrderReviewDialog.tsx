import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import type { ReagentOffering, ShippingAddress } from '#/api/order-management'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

export type KitCartValues = {
  purchaseOrderNumber: string
  shippingAddressId: string
  requestedDeliveryDate?: string
  shippingInstructions?: string
  lines: Array<{ offeringId: string; quantity: number; note?: string }>
}
export type KitOrderReview = {
  values: KitCartValues
  offerings: ReagentOffering[]
  address: ShippingAddress
}
export function KitOrderReviewDialog({
  review,
  pending,
  error,
  onClose,
  onConfirm,
  onRefresh,
}: {
  review: KitOrderReview | null
  pending: boolean
  error: unknown
  onClose: () => void
  onConfirm: () => void
  onRefresh: () => void
}) {
  const currencies = [
    ...new Set(review?.offerings.map((item) => item.currency) ?? []),
  ]
  const money = (value: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
      value,
    )
  return (
    <Dialog
      open={Boolean(review)}
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent showCloseButton={!pending} aria-busy={pending}>
        <DialogHeader>
          <DialogTitle><CustomerSourceText source={"Review PSeq Kit order"} /></DialogTitle>
          <DialogDescription>
            <CustomerSourceText source={"Each kit unit includes one assembly case. Placing this order commits\r\n            the complete bundle; submitting the included data later does not\r\n            create a second purchase."} />
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle><CustomerSourceText source={"Kit order was not placed"} /></AlertTitle>
            <AlertDescription>
              {<CustomerSourceText source={getOrderErrorMessage(error, 'Review the details and try again.')} />}{' '}
              <Button variant="outline" disabled={pending} onClick={onRefresh}>
                <CustomerSourceText source={"Refresh offerings and review again"} />
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {review ? (
          <div className="space-y-4 text-sm">
            <ul className="divide-y">
              {review.values.lines.map((line) => {
                const offering = review.offerings.find(
                  (item) => item.id === line.offeringId,
                )!
                return (
                  <li key={line.offeringId} className="space-y-1 py-3">
                    <p className="font-medium">
                      {offering.itemName} × {line.quantity}
                    </p>
                    <p>
                      {money(offering.negotiatedUnitPrice, offering.currency)}{' '}
                      <CustomerSourceText source={"per kit ·"} />{' '}
                      {money(
                        offering.negotiatedUnitPrice * line.quantity,
                        offering.currency,
                      )}
                    </p>
                    <p>
                      <CustomerSourceText source={"Includes"} /> {line.quantity} <CustomerSourceText source={"assembly case"} />
                      {line.quantity === 1 ? '' : 's'} ·{' '}
                      {offering.includedAssemblyProfileName} <CustomerSourceText source={"version"} />{' '}
                      {offering.includedAssemblyProfileVersion}
                    </p>
                  </li>
                )
              })}
            </ul>
            {currencies.map((currency) => (
              <p key={currency} className="text-lg font-semibold">
                <CustomerSourceText source={"Bundle price:"} />{' '}
                {money(
                  review.values.lines.reduce((sum, line) => {
                    const item = review.offerings.find(
                      (value) => value.id === line.offeringId,
                    )!
                    return (
                      sum +
                      (item.currency === currency
                        ? item.negotiatedUnitPrice * line.quantity
                        : 0)
                    )
                  }, 0),
                  currency,
                )}
              </p>
            ))}
            <p>PO {review.values.purchaseOrderNumber}</p>
            <address className="not-italic">
              {review.address.recipient}
              <br />
              {review.address.line1}
              {review.address.line2 ? (
                <>
                  <br />
                  {review.address.line2}
                </>
              ) : null}
              <br />
              {review.address.city}, {review.address.region}{' '}
              {review.address.postalCode} · {review.address.countryCode}
            </address>
            {review.values.requestedDeliveryDate ? (
              <p><CustomerSourceText source={"Requested delivery:"} /> {review.values.requestedDeliveryDate}</p>
            ) : null}
            <p>
              <CustomerSourceText source={"Unused cases expire 90 days after each kit’s labeled expiration.\r\n              If no expiration is recorded, the deadline is 12 months after\r\n              shipment. The actual deadline appears with each shipped kit.\r\n              Unused or expired cases do not automatically create a refund."} />
            </p>
            <p>
              <CustomerSourceText source={"Each partial shipment creates a billing source only for shipped\r\n              units. Assembly submission and completion do not create another\r\n              billing source."} />
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            <CustomerSourceText source={"Keep editing"} />
          </Button>
          <Button
            type="button"
            disabled={pending || !review}
            onClick={onConfirm}
          >
            {pending ? <CustomerSourceText source={"Placing order…"} /> : <CustomerSourceText source={"Place PSeq Kit order"} />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
