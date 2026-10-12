import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
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
import { Field } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { Label } from '#/components/ui/label'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { useOrderDecisionDismissal } from './use-order-decision-dismissal'

const schema = z.object({
  purchaseOrderNumber: z.string().trim().max(255),
  sampleTypeConfirmed: z.boolean().refine(value => value, 'Confirm the Sample type you will send.'),
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
  const __customerText = useCustomerText()

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
    !order.customerDraft &&
    !order.placedAt &&
    ['DraftRequest', 'ChangesRequested'].includes(order.status) &&
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
    defaultValues: { purchaseOrderNumber: '', confirmed: false, sampleTypeConfirmed: false },
  })
  const { isDirty: __formDraftDirty } = form.formState

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
      if (!order.sampleTypeDefinitionId) throw new Error('Review the Sample type before placing the order.')
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
          confirmedSampleTypeId: order.sampleTypeDefinitionId,
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
  const dismissal = useOrderDecisionDismissal(
    Boolean(review) && __formDraftDirty,
    mutation.isPending,
    () => setReview(null),
    { scope: 'order confirmation', description: __customerText('m_4c74e6df1c92') },
  )
  function close() {
    dismissal.close()
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
    form.reset({ purchaseOrderNumber: '', confirmed: false, sampleTypeConfirmed: false })
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
  if (order.customerDraft && !committed) return <Card><CardHeader><CardTitle><CustomerText message="m_4a69ce3718a6" /></CardTitle><CardDescription>{order.customerReference} · {order.requestedSpecimenCount} <CustomerText message="m_c705a8dc3b3e" /></CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground"><CustomerText message="m_cc1a52b475ce" /></p></CardContent></Card>
  if (!committed && !canReview) return null
  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>
          {committed
            ? <CustomerSourceText source={"Accepted PSeq Lab Service"} />
            : __customerText('m_2bd147cb43c9')}
        </CardTitle>
        <CardDescription>
          <CustomerText message="m_7eeda7e38b90" /></CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {committed ? (
          <>
            <p className="font-medium">
              {committed.productName} <CustomerText message="m_46e8c5a67b4d" />{committed.offeringVersion}
            </p>
            <p>
              {money(committed.unitPrice, committed.currency)} ×{' '}
              {committed.specimenCount} <CustomerText message="m_a0d8d107681a" />{committed.sequencingRunCount || committed.specimenCount} <CustomerText message="m_e759d1106547" />{' '}
              {money(committed.total, committed.currency)}
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {committed.includedOutputContract}
            </p>
            {committed.priceProvenance ? <p className="text-sm text-muted-foreground"><CustomerText message="m_ca77c99d7648" />{committed.priceProvenance.source === 'Standard' ? <CustomerSourceText source={"standard service price"} /> : __customerText('m_d038e507b36e', { p0: String(committed.priceProvenance.source.toLowerCase()) })}<CustomerText message="m_994ced719a20" /></p> : null}
            <p className="text-sm text-muted-foreground">
              {committed.deliveryTargetBusinessDays
                ? <><CustomerText message="m_d5b76e17a87c" />{committed.deliveryTargetBusinessDays} <CustomerText message="m_7db55fa12e0b" /></>
                : <><CustomerText message="m_9cd0b037a749" />{committed.minimumTurnaroundDays}–{committed.maximumTurnaroundDays} <CustomerText message="m_a4733936bbd3" /></>} <CustomerText message="m_77d3cbce8e9a" />{' '}
              {new Date(committed.committedAtUtc).toLocaleDateString()}.
            </p>
          </>
        ) : (
          <>
            {offerings.isLoading ? (
              <p role="status"><CustomerText message="m_6b1e18db3b76" /></p>
            ) : null}
            {offerings.error ? (
              <Alert variant="destructive">
                <AlertTitle><CustomerText message="m_f89c50613c4f" /></AlertTitle>
                <AlertDescription>
                  {<CustomerSourceText source={getOrderErrorMessage(offerings.error, 'Try again.')} />}{' '}
                  <Button
                    variant="outline"
                    onClick={() => void offerings.refetch()}
                  >
                    <CustomerText message="m_762f87fee8fc" /></Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {offerings.data?.length ? (
              <>
                <Field>
                  <Label htmlFor="standard-lab-offering"><CustomerText message="m_300e2bef4a7a" /></Label>
                  <NativeSelect
                    id="standard-lab-offering"
                    value={offeringId}
                    onChange={(event) => setOfferingId(event.target.value)}
                  >
                    <option value=""><CustomerText message="m_d50fdaa30f51" /></option>
                    {offerings.data.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {money(item.unitPrice, item.currency)} <CustomerText message="m_9b77b7969333" /></option>
                    ))}
                  </NativeSelect>
                </Field>
                {selected ? (
                  <OfferingSummary
                    offering={selected}
                    quantity={order.requestedSpecimenCount}
                  />
                ) : null}
                {preview.isLoading ? (
                  <p role="status">
                    <CustomerText message="m_dd87c0888c1e" /></p>
                ) : null}
                {preview.error ? (
                  <Alert variant="destructive">
                    <AlertTitle><CustomerText message="m_4a2719541fe4" /></AlertTitle>
                    <AlertDescription>
                      {<CustomerSourceText source={getOrderErrorMessage(preview.error, 'Try again.')} />}{' '}
                      <Button
                        variant="outline"
                        onClick={() => void preview.refetch()}
                      >
                        <CustomerText message="m_9078e12b1074" /></Button>
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
                  <CustomerText message="m_74cb0c55c607" /></Button>
                {!order.canPlaceStandardOrder ? (
                  <p className="text-sm text-muted-foreground">
                    <CustomerText message="m_b1b5e128d734" /></p>
                ) : null}
              </>
            ) : !offerings.isLoading && !offerings.error ? (
              <p className="text-sm text-muted-foreground">
                <CustomerText message="m_2d3f22adc957" /></p>
            ) : null}

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
            onOpenAutoFocus={event => { event.preventDefault(); document.getElementById('standard-order-keep-reviewing')?.focus() }}
          >
            <DialogHeader>
              <DialogTitle>
                <CustomerText message="m_00d8b866637e" />{order.orderNumber}?
              </DialogTitle>
              <DialogDescription>
                <CustomerText message="m_5d1863cd6174" /></DialogDescription>
            </DialogHeader>
            <p className="text-sm"><CustomerText message="m_53d6f2c2ca00" /></p>
            {mutation.error ? (
              <Alert variant="destructive">
                <AlertTitle><CustomerText message="m_20b959c97e0f" /></AlertTitle>
                <AlertDescription>
                  {<CustomerSourceText source={getOrderErrorMessage(
                    mutation.error,
                    'Review the details and try again.',
                  )} />}{' '}
                  <Button
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => void refreshReview()}
                  >
                    <CustomerText message="m_29ec0b5a4ab9" /></Button>
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
                <div className="space-y-2">
                  <Label htmlFor="standard-sample-type-confirmed"><RequiredFieldName><CustomerText message="m_1e3f2e3f87c9" /></RequiredFieldName></Label>
                  <p className="text-sm">{order.sampleTypeName ?? 'No Sample type selected'}</p>
                  <label htmlFor="standard-sample-type-confirmed" className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox id="standard-sample-type-confirmed" checked={form.watch('sampleTypeConfirmed')} onCheckedChange={value => form.setValue('sampleTypeConfirmed', value === true, { shouldDirty: true, shouldValidate: true })} />
                    <span><CustomerText message="m_a2447be7c1e2" /></span>
                  </label>
                  {form.formState.errors.sampleTypeConfirmed ? <p role="alert" className="text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.sampleTypeConfirmed.message} />}</p> : null}
                </div>

                <Field>
                  <Label htmlFor="standard-po">
                    {requiresPo ? (
                      <RequiredFieldName>
                        <CustomerText message="m_65b4c1324e67" /></RequiredFieldName>
                    ) : (
                      __customerText('m_f04d695faf06')
                    )}
                  </Label>
                  <Input
                    id="standard-po"
                    aria-invalid={Boolean(
                      form.formState.errors.purchaseOrderNumber,
                    )}
                    {...form.register('purchaseOrderNumber')}
                  />
                  {form.formState.errors.purchaseOrderNumber ? (
                    <p role="alert" className="mt-1 text-sm text-destructive">
                      {<CustomerSourceText source={form.formState.errors.purchaseOrderNumber.message} />}
                    </p>
                  ) : null}
                </Field>
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
                      <CustomerText message="m_07ae6308212d" /></RequiredFieldName>
                  </span>
                </label>
                {form.formState.errors.confirmed ? (
                  <p role="alert" className="text-sm text-destructive">
                    {<CustomerSourceText source={form.formState.errors.confirmed.message} />}
                  </p>
                ) : null}
              </fieldset>
            </form>
            <RequiredDialogFooter>
              <Button
                id="standard-order-keep-reviewing"
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={close}
              >
                <CustomerText message="m_34411a1bde47" /></Button>
              <Button
                type="submit"
                form="standard-lab-order"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <CustomerSourceText source={"Placing order…"} /> : __customerText('m_bbc89584850e')}
              </Button>
            </RequiredDialogFooter>
          </DialogContent>
        </Dialog>
        {dismissal.confirmation}
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
        {offering.name} <CustomerText message="m_46e8c5a67b4d" />{offering.offeringVersion}
      </p>
      <p>{offering.description}</p>
      <p className="whitespace-pre-wrap">{offering.includedOutputContract}</p>
      <p>
        <CustomerText message="m_1400337dbb99" />{offering.supportedSampleTypes?.length ? offering.supportedSampleTypes.map(type => type.name).join(', ') : offering.allowedMaterialTypes.join(', ')}<CustomerText message="m_1c0617aaaaa2" />{offering.allowedBiologicalSources.join(', ')}.
      </p>
      <p>
        <CustomerText message="m_d9c6daa047fc" />{offering.maximumTurnaroundDays} <CustomerText message="m_8416d1f10238" /></p>
      <p className="text-base font-semibold">
        <CustomerText message="m_8217b55dc65e" />{' '}
        {money(offering.unitPrice, offering.currency)} × {quantity} <CustomerText message="m_ab0118a46083" />{' '}
        {money(offering.unitPrice * quantity, offering.currency)}
      </p>
      <p className="text-muted-foreground">
        <CustomerText message="m_3b78283d8b1a" /></p>
    </div>
  )
}

function PreviewTotal({ preview }: { preview: StandardLabOrderPreview }) {


  return (
    <div className="space-y-2 text-sm">
      <p>
        <CustomerText message="m_8c0f2cb34079" />{money(preview.subtotal, preview.currency)} <CustomerText message="m_9ab850e6b676" />{' '}
        {preview.tax === null
          ? <CustomerSourceText source={"Requires billing setup"} />
          : money(preview.tax, preview.currency)}
      </p>
      <p className="text-lg font-semibold">
        <CustomerText message="m_c9b3c38247f7" />{' '}
        {preview.total === null
          ? <CustomerSourceText source={"Not yet available"} />
          : money(preview.total, preview.currency)}
      </p>
      {preview.blockers.length ? (
        <Alert>
          <AlertTitle><CustomerText message="m_8f297969792d" /></AlertTitle>
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
