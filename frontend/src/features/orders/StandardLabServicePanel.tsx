import { RequestCustomWorkButton } from './RequestCustomWorkButton'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  listLabServiceOfferings,
  placeStandardLabOrder,
  previewStandardLabOrder,
  type StandardLabOrderPreview,
  type LabServiceOffering,
} from '#/api/order-bundles'
import {
  getOrderErrorMessage,
  type LabServiceOrder,
} from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { useOrderDraftGuard } from './use-order-draft-guard'

const schema = z.object({
  purchaseOrderNumber: z.string().trim().max(255),
  confirmed: z
    .boolean()
    .refine(
      (value) => value,
      'Confirm the scope and prohibited-data statement before placing the order.',
    ),
})
type Review = { preview: StandardLabOrderPreview; key: string }
const money = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
export function StandardLabServicePanel({
  order,
  readOnly = false,
}: {
  order: LabServiceOrder
  readOnly?: boolean
}) {
  const {
    authProvider,
    session,
    selectedOrganizationId,
    selectedDepartmentId,
  } = usePhaenoSession()
  const client = useQueryClient()
  const committed = order.standardCommercialSnapshot
  const canReview =
    !readOnly &&
    !order.placedAt &&
    (order.canEdit || order.canSubmit || order.canPlaceStandardOrder)
  const offerings = useQuery({
    queryKey: [
      'lab-service-offerings',
      selectedOrganizationId,
      selectedDepartmentId,
    ],
    queryFn: () => listLabServiceOfferings(),
    enabled: authProvider !== 'mock' && Boolean(canReview),
  })
  const [offeringId, setOfferingId] = useState('')
  const preview = useQuery({
    queryKey: [
      'standard-lab-preview',
      selectedOrganizationId,
      selectedDepartmentId,
      order.id,
      order.version,
      offeringId,
    ],
    queryFn: () => previewStandardLabOrder(order.id, offeringId),
    enabled: Boolean(canReview && offeringId) && authProvider !== 'mock',
  })
  const [review, setReview] = useState<Review | null>(null)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { purchaseOrderNumber: '', confirmed: false },
  })
  const requiresPo = session?.selectedDepartment?.purchaseOrderRequired === true
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      if (!review)
        throw new Error('Review an offering before placing the order.')
      if (requiresPo && !values.purchaseOrderNumber) {
        form.setError('purchaseOrderNumber', {
          message: 'Enter the required purchase order number.',
        })
        throw new Error('Enter the required purchase order number.')
      }
      const terms = review.preview
      if (
        !terms.canPlaceStandardOrder ||
        terms.total === null ||
        terms.commercialProfileVersion === null
      )
        throw new Error(
          'Complete the listed requirements and review the final price before placing the order.',
        )
      return placeStandardLabOrder(
        order.id,
        {
          reviewToken: terms.reviewToken,
          version: terms.orderVersion,
          offeringId: terms.offering.id,
          offeringVersion: terms.offering.offeringVersion,
          offeringRecordVersion: terms.offering.version,
          catalogItemVersion: terms.offering.catalogItemVersion,
          commercialProfileVersion: terms.commercialProfileVersion,
          departmentVersion: terms.departmentVersion,
          organizationVersion: terms.organizationVersion,
          prohibitedDataConfirmed: values.confirmed,
          purchaseOrderNumber: values.purchaseOrderNumber || undefined,
        },
        review.key,
      )
    },
    onSuccess: async (updated) => {
      setReview(null)
      form.reset()
      client.setQueryData(['lab-service-order', order.id], updated)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['lab-service-orders'] }),
        client.invalidateQueries({ queryKey: ['lab-service-order', order.id] }),
      ])
    },
  })
  useOrderDraftGuard(
    Boolean(review) && form.formState.isDirty,
    mutation.isPending,
  )
  function close() {
    if (
      !mutation.isPending &&
      (!form.formState.isDirty ||
        window.confirm('Discard the unsaved order confirmation?'))
    )
      setReview(null)
  }
  const selected = offerings.data?.find((item) => item.id === offeringId)
  function startReview() {
    if (
      !preview.data?.canPlaceStandardOrder ||
      preview.error ||
      preview.isFetching
    )
      return
    mutation.reset()
    form.reset({ purchaseOrderNumber: '', confirmed: false })
    setReview({ preview: preview.data, key: crypto.randomUUID() })
  }
  async function refreshReview() {
    setReview(null)
    form.reset()
    mutation.reset()
    await Promise.all([
      offerings.refetch(),
      preview.refetch(),
      client.invalidateQueries({ queryKey: ['lab-service-order', order.id] }),
    ])
  }
  if (!committed && !canReview) return null
  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>
          {committed
            ? 'Accepted PSeq Lab Service'
            : 'Standard PSeq Lab Service'}
        </CardTitle>
        <CardDescription>
          Specimen processing and data assembly are included in one per-specimen
          price.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {committed ? (
          <>
            <p className="font-medium">
              {committed.productName} · version {committed.offeringVersion}
            </p>
            <p>
              {money(committed.unitPrice, committed.currency)} ×{' '}
              {committed.specimenCount} specimens · Total{' '}
              {money(committed.total, committed.currency)}
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {committed.includedOutputContract}
            </p>
            <p className="text-sm text-muted-foreground">
              Published turnaround: {committed.minimumTurnaroundDays}–
              {committed.maximumTurnaroundDays} days after scientific
              acceptance. Accepted{' '}
              {new Date(committed.committedAtUtc).toLocaleDateString()}.
            </p>
          </>
        ) : (
          <>
            {offerings.isLoading ? (
              <p role="status">Checking eligible offerings…</p>
            ) : null}
            {offerings.error ? (
              <Alert variant="destructive">
                <AlertTitle>Standard offerings could not be loaded</AlertTitle>
                <AlertDescription>
                  {getOrderErrorMessage(offerings.error, 'Try again.')}{' '}
                  <Button
                    variant="outline"
                    onClick={() => void offerings.refetch()}
                  >
                    Retry offerings
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {offerings.data?.length ? (
              <>
                <div>
                  <Label htmlFor="standard-lab-offering">Offering</Label>
                  <select
                    id="standard-lab-offering"
                    value={offeringId}
                    onChange={(event) => setOfferingId(event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select an offering</option>
                    {offerings.data.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {money(item.unitPrice, item.currency)} /
                        specimen
                      </option>
                    ))}
                  </select>
                </div>
                {selected ? (
                  <OfferingSummary
                    offering={selected}
                    quantity={order.requestedSpecimenCount}
                  />
                ) : null}
                {preview.isLoading ? (
                  <p role="status">
                    Calculating the final price and checking eligibility…
                  </p>
                ) : null}
                {preview.error ? (
                  <Alert variant="destructive">
                    <AlertTitle>Final price could not be checked</AlertTitle>
                    <AlertDescription>
                      {getOrderErrorMessage(preview.error, 'Try again.')}{' '}
                      <Button
                        variant="outline"
                        onClick={() => void preview.refetch()}
                      >
                        Retry price review
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}
                {preview.data ? <PreviewTotal preview={preview.data} /> : null}
                <Button
                  disabled={
                    !selected ||
                    !preview.data?.canPlaceStandardOrder ||
                    preview.isFetching ||
                    Boolean(preview.error)
                  }
                  onClick={startReview}
                >
                  Review standard order
                </Button>
                {!order.canPlaceStandardOrder ? (
                  <p className="text-sm text-muted-foreground">
                    An organization administrator must place standard orders.
                    Complete the Job pricing details and ordering setup before
                    commitment.
                  </p>
                ) : null}
              </>
            ) : !offerings.isLoading && !offerings.error ? (
              <p className="text-sm text-muted-foreground">
                No standard offering is currently available for this
                organization. You can request custom pricing from this Job.
              </p>
            ) : null}
            <RequestCustomWorkButton
              service="PSeqLabService"
              sourceOrderId={order.id}
              defaultSubject={order.customerReference || order.orderNumber}
            />
            <p className="text-sm text-muted-foreground">
              For scope, sources or outputs outside an offering, use the
              custom-work action on this Job. Selecting an offering does not
              commit the order.
            </p>
          </>
        )}
        <Dialog
          open={Boolean(review)}
          onOpenChange={(open) => {
            if (!open) close()
          }}
        >
          <DialogContent
            showCloseButton={!mutation.isPending}
            aria-busy={mutation.isPending}
          >
            <DialogHeader>
              <DialogTitle>
                Place standard order {order.orderNumber}?
              </DialogTitle>
              <DialogDescription>
                Accept this complete bundled scope and price. This opens
                sample-list preparation; laboratory work and shipping begin only
                after you finalize the accepted sample list.
              </DialogDescription>
            </DialogHeader>
            {mutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>Standard order was not placed</AlertTitle>
                <AlertDescription>
                  {getOrderErrorMessage(
                    mutation.error,
                    'Review the details and try again.',
                  )}{' '}
                  <Button
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => void refreshReview()}
                  >
                    Refresh terms and review again
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {review ? (
              <>
                <OfferingSummary
                  offering={review.preview.offering}
                  quantity={review.preview.specimenCount}
                />
                <PreviewTotal preview={review.preview} />
              </>
            ) : null}
            <form
              id="standard-lab-order"
              noValidate
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            >
              <fieldset disabled={mutation.isPending} className="space-y-4">
                <div>
                  <Label htmlFor="standard-po">
                    {requiresPo ? (
                      <RequiredFieldName>
                        Purchase order number
                      </RequiredFieldName>
                    ) : (
                      'Purchase order number (optional)'
                    )}
                  </Label>
                  <Input
                    id="standard-po"
                    className="mt-2"
                    aria-invalid={Boolean(
                      form.formState.errors.purchaseOrderNumber,
                    )}
                    {...form.register('purchaseOrderNumber')}
                  />
                  {form.formState.errors.purchaseOrderNumber ? (
                    <p role="alert" className="mt-1 text-sm text-destructive">
                      {form.formState.errors.purchaseOrderNumber.message}
                    </p>
                  ) : null}
                </div>
                <label
                  htmlFor="standard-confirmed"
                  className="flex cursor-pointer items-start gap-2 text-sm"
                >
                  <Checkbox
                    id="standard-confirmed"
                    checked={form.watch('confirmed')}
                    onCheckedChange={(value) =>
                      form.setValue('confirmed', value === true, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  <span>
                    <RequiredFieldName>
                      I accept the displayed scope and price and confirm that
                      the Job contains no patient identifiers or PHI.
                    </RequiredFieldName>
                  </span>
                </label>
                {form.formState.errors.confirmed ? (
                  <p role="alert" className="text-sm text-destructive">
                    {form.formState.errors.confirmed.message}
                  </p>
                ) : null}
              </fieldset>
            </form>
            <RequiredDialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={close}
              >
                Keep reviewing
              </Button>
              <Button
                type="submit"
                form="standard-lab-order"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Placing order…' : 'Place standard order'}
              </Button>
            </RequiredDialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
export function OfferingSummary({
  offering,
  quantity,
}: {
  offering: LabServiceOffering
  quantity: number
}) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">
        {offering.name} · version {offering.offeringVersion}
      </p>
      <p>{offering.description}</p>
      <p className="whitespace-pre-wrap">{offering.includedOutputContract}</p>
      <p>
        Materials: {offering.allowedMaterialTypes.join(', ')}. Biological
        sources: {offering.allowedBiologicalSources.join(', ')}.
      </p>
      <p>
        Published turnaround: {offering.minimumTurnaroundDays}–
        {offering.maximumTurnaroundDays} days after scientific acceptance.
      </p>
      <p className="text-base font-semibold">
        {money(offering.unitPrice, offering.currency)} × {quantity} specimens ={' '}
        {money(offering.unitPrice * quantity, offering.currency)}
      </p>
      <p className="text-muted-foreground">
        Scope subtotal. Review the final tax and total before commitment. No
        separate assembly purchase is required.
      </p>
    </div>
  )
}

function PreviewTotal({ preview }: { preview: StandardLabOrderPreview }) {
  return (
    <div className="space-y-2 text-sm">
      <p>
        Subtotal {money(preview.subtotal, preview.currency)} · Tax{' '}
        {preview.tax === null
          ? 'Requires billing setup'
          : money(preview.tax, preview.currency)}
      </p>
      <p className="text-lg font-semibold">
        Total{' '}
        {preview.total === null
          ? 'Not yet available'
          : money(preview.total, preview.currency)}
      </p>
      {preview.blockers.length ? (
        <Alert>
          <AlertTitle>Before standard placement</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5">
              {preview.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
