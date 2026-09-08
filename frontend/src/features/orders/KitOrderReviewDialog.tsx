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
          <DialogTitle>Review PSeq Kit order</DialogTitle>
          <DialogDescription>
            Each kit unit includes one assembly case. Placing this order commits
            the complete bundle; submitting the included data later does not
            create a second purchase.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Kit order was not placed</AlertTitle>
            <AlertDescription>
              {getOrderErrorMessage(error, 'Review the details and try again.')}{' '}
              <Button variant="outline" disabled={pending} onClick={onRefresh}>
                Refresh offerings and review again
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
                      per kit ·{' '}
                      {money(
                        offering.negotiatedUnitPrice * line.quantity,
                        offering.currency,
                      )}
                    </p>
                    <p>
                      Includes {line.quantity} assembly case
                      {line.quantity === 1 ? '' : 's'} ·{' '}
                      {offering.includedAssemblyProfileName} version{' '}
                      {offering.includedAssemblyProfileVersion}
                    </p>
                  </li>
                )
              })}
            </ul>
            {currencies.map((currency) => (
              <p key={currency} className="text-lg font-semibold">
                Bundle price:{' '}
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
              <p>Requested delivery: {review.values.requestedDeliveryDate}</p>
            ) : null}
            <p>
              Unused cases expire 90 days after each kit’s labeled expiration.
              If no expiration is recorded, the deadline is 12 months after
              shipment. The actual deadline appears with each shipped kit.
              Unused or expired cases do not automatically create a refund.
            </p>
            <p>
              Each partial shipment creates a billing source only for shipped
              units. Assembly submission and completion do not create another
              billing source.
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
            Keep editing
          </Button>
          <Button
            type="button"
            disabled={pending || !review}
            onClick={onConfirm}
          >
            {pending ? 'Placing order…' : 'Place PSeq Kit order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
