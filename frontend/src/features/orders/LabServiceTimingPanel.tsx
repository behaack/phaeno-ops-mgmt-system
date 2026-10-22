import { formatDisplayTimestamp } from '#/lib/display-format'
import { FieldError } from '#/components/ui/field'
import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  overrideLabServiceTiming,
  type LabServiceTiming,
} from '#/api/order-bundles'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
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
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from './use-order-draft-guard'

const reasons = [
  'Laboratory scheduling adjustment',
  'Additional processing or quality review',
  'Equipment or supply interruption',
  'Specimen or shipping issue',
  'Customer action required',
  'Other operational delay',
] as const
export const timingSchema = z
  .object({
    expectedCompletion: z
      .string()
      .min(1, 'Choose the expected completion date.')
      .refine(
        (value) => Number.isFinite(Date.parse(value)),
        'Choose a valid date and time.',
      ),
    reason: z.enum(reasons),
    customerSafeNote: z.string().trim().max(2000),
    internalNote: z.string().trim().max(4000),
  })
  .superRefine((value, context) => {
    if (value.reason === 'Other operational delay' && !value.customerSafeNote)
      context.addIssue({
        code: 'custom',
        path: ['customerSafeNote'],
        message:
          'Explain the delay in a note safe for the ordering organization.',
      })
  })
const empty = {
  expectedCompletion: '',
  reason: reasons[0],
  customerSafeNote: '',
  internalNote: '',
}
function display(value: string | null) {
  return value ? formatDisplayTimestamp(value, { seconds: true }) : 'Not yet recorded'
}
function localInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

export function LabServiceTimingPanel({
  orderId,
  timing,
  staff = false,
  phaseCount = 1,
}: {
  orderId: string
  timing?: LabServiceTiming | null
  staff?: boolean
  phaseCount?: number
}) {
  const client = useQueryClient()
  const [reviewed, setReviewed] = useState<LabServiceTiming | null>(null)
  const form = useForm<z.infer<typeof timingSchema>>({
    resolver: zodResolver(timingSchema),
    defaultValues: empty,
  })
  const { isDirty: __formDraftDirty } = form.formState

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof timingSchema>) =>
      overrideLabServiceTiming(orderId, {
        version: reviewed!.version,
        expectedCompletionAtUtc: new Date(
          values.expectedCompletion,
        ).toISOString(),
        reason: values.reason,
        customerSafeNote: values.customerSafeNote || undefined,
        internalNote: values.internalNote || undefined,
      }),
    onSuccess: async () => {
      setReviewed(null)
      form.reset(empty)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['lab-service-order', orderId] }),
        client.invalidateQueries({ queryKey: ['platform-order'] }),
        client.invalidateQueries({ queryKey: ['lab-work'] }),
      ])
    },
  })
  useOrderDraftGuard(
    Boolean(reviewed) && __formDraftDirty,
    mutation.isPending,
  )
  async function close() {
    if (
      !mutation.isPending &&
      (!__formDraftDirty ||
        (await confirmPortal('Discard the unsaved timing change?')))
    )
      setReviewed(null)
  }
  if (!timing) return null
  const duration =
    timing.firstReceivedAtUtc && timing.acceptedAtUtc
      ? Math.max(
          0,
          (Date.parse(timing.acceptedAtUtc) -
            Date.parse(timing.firstReceivedAtUtc)) /
            86_400_000,
        )
      : null
  return (
    <Card className="mb-5">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{phaseCount > 1 ? <CustomerSourceText source={"Whole-Job milestones"} /> : <CustomerSourceText source={"Turnaround and progress"} />}</CardTitle>
          {staff && phaseCount === 1 && timing.canOverrideTiming ? (
            <Button
              variant="outline"
              onClick={() => {
                mutation.reset()
                form.reset({
                  ...empty,
                  expectedCompletion: localInput(
                    timing.expectedCompletionAtUtc,
                  ),
                })
                setReviewed(timing)
              }}
            >
              <CustomerSourceText source={"Change expected completion"} />
            </Button>
          ) : null}
        </div>
        <CardDescription>
          {phaseCount > 1 ? <CustomerSourceText source={"Review the Phases card for each cohort’s receipt-triggered TAT, original commitment and current delivery due date."} /> : <CustomerSourceText source={"Processing targets track scientific acceptance. Delivery TAT starts after physical receipt of every required tube. Original targets remain recorded when timing changes."} />} <CustomerSourceText source={"Laboratory completion is separate from delivery of every required result."} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {[
            ['First receipt', timing.firstReceivedAtUtc],
            ['Scientific acceptance', timing.acceptedAtUtc],
            ...phaseCount === 1 ? [['Original target', timing.originalTargetAtUtc], ['Current expected completion', timing.expectedCompletionAtUtc]] : [],
            ['Laboratory completion', timing.completedAtUtc],
            ...phaseCount === 1 ? [['Delivery due date', timing.deliveryDueAtUtc ?? null], ['Original delivery target', timing.originalDeliveryDueAtUtc ?? null]] : [],
            ['All samples delivered to Portal', timing.portalDeliveredAtUtc ?? null],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-medium">{display(value)}</dd>
            </div>
          ))}
        </dl>
        {duration !== null ? (
          <p className="mt-4 text-sm">
            <CustomerSourceText source={"Receipt to acceptance:"} /> {duration.toFixed(1)} <CustomerSourceText source={"days."} />
          </p>
        ) : null}
        <p className="mt-3 text-sm">
          <CustomerSourceText source={"Laboratory schedule:"} /> {timing.scheduleHealth.replace(/([a-z])([A-Z])/g, '$1 $2')}
        </p>
        {timing.changes.length ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">
              <CustomerSourceText source={"Timing history"} />
            </summary>
            <ol className="mt-3 divide-y">
              {timing.changes.map((change) => (
                <li key={change.id} className="space-y-1 py-3 text-sm">
                  <p>
                    {display(change.previousExpectedAtUtc)} →{' '}
                    {display(change.expectedAtUtc)}
                  </p>
                  <p>
                    {change.reason}
                    {change.customerSafeNote
                      ? `: ${change.customerSafeNote}`
                      : ''}
                  </p>
                  <p className="text-muted-foreground">
                    <CustomerSourceText source={"Recorded"} /> {display(change.occurredAtUtc)}
                  </p>
                  {staff ? (
                    <>
                      {change.internalNote ? (
                        <p><CustomerSourceText source={"Internal note:"} /> {change.internalNote}</p>
                      ) : null}
                      {change.notificationRequired ? (
                        <p>
                          <CustomerSourceText source={"Organization notification:"} /> {change.notificationStatus}
                          <CustomerSourceText source={". Failed delivery can be reviewed in Order operations\r\n                          → Legacy integrations → Notifications."} />
                        </p>
                      ) : (
                        <p><CustomerSourceText source={"No later-date notification required."} /></p>
                      )}
                    </>
                  ) : null}
                </li>
              ))}
            </ol>
          </details>
        ) : null}
        <Dialog
          open={Boolean(reviewed)}
          onOpenChange={(open) => {
            if (!open) close()
          }}
        >
          <DialogContent
            showCloseButton={!mutation.isPending}
            aria-busy={mutation.isPending}
          >
            <DialogHeader>
              <DialogTitle><CustomerSourceText source={"Change expected completion"} /></DialogTitle>
              <DialogDescription>
                <CustomerSourceText source={"A later date updates the Portal and queues a notice to the\r\n                ordering organization. Earlier dates update the Portal. The\r\n                original target remains"} />{' '}
                {display(reviewed?.originalTargetAtUtc ?? null)}.
              </DialogDescription>
            </DialogHeader>
            {mutation.error ? (
              <Alert variant="destructive">
                <AlertTitle><CustomerSourceText source={"Timing was not changed"} /></AlertTitle>
                <AlertDescription>
                  {<CustomerSourceText source={getOrderErrorMessage(
                    mutation.error,
                    'Review the details and try again.',
                  )} />}{' '}
                  <CustomerSourceText source={"Your entries remain here. Reopen this action after refreshing\r\n                  if another operator changed the record."} />
                </AlertDescription>
              </Alert>
            ) : null}
            <form
              id="lab-timing-form"
              noValidate
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            >
              <fieldset disabled={mutation.isPending} className="space-y-4">
                <PortalField>
                  <Label htmlFor="lab-expected">
                    <RequiredFieldName><CustomerSourceText source={"Expected completion"} /></RequiredFieldName>
                  </Label>
                  <Input
                    id="lab-expected"
                    type="datetime-local"

                    {...form.register('expectedCompletion')}
                  />
                  {form.formState.errors.expectedCompletion ? (
                    <FieldError role="alert" >
                      {<CustomerSourceText source={form.formState.errors.expectedCompletion.message} />}
                    </FieldError>
                  ) : null}
                </PortalField>
                <PortalField>
                  <Label htmlFor="lab-timing-reason">
                    <RequiredFieldName>
                      <CustomerSourceText source={"Reason shown to the organization"} />
                    </RequiredFieldName>
                  </Label>
                  <NativeSelect
                    id="lab-timing-reason"
                    className="w-full"
                    {...form.register('reason')}
                  >
                    {reasons.map((reason) => (
                      <option key={reason}>{reason}</option>
                    ))}
                  </NativeSelect>
                </PortalField>
                <PortalField>
                  <Label htmlFor="lab-safe-note">
                    {form.watch('reason') === 'Other operational delay' ? (
                      <RequiredFieldName>
                        <CustomerSourceText source={"Organization-visible note"} />
                      </RequiredFieldName>
                    ) : (
                      'Organization-visible note (optional)'
                    )}
                  </Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <CustomerSourceText source={"Do not include other organizations, internal batch\r\n                    composition or confidential details."} />
                  </p>
                  <Textarea
                    id="lab-safe-note"

                    {...form.register('customerSafeNote')}
                  />
                  {form.formState.errors.customerSafeNote ? (
                    <FieldError role="alert" >
                      {<CustomerSourceText source={form.formState.errors.customerSafeNote.message} />}
                    </FieldError>
                  ) : null}
                </PortalField>
                <PortalField>
                  <Label htmlFor="lab-internal-note">
                    <CustomerSourceText source={"Internal note (optional)"} />
                  </Label>
                  <Textarea
                    id="lab-internal-note"

                    {...form.register('internalNote')}
                  />
                </PortalField>
              </fieldset>
            </form>
            <RequiredDialogFooter>
              <Button
                variant="outline"
                type="button"
                disabled={mutation.isPending}
                onClick={close}
              >
                <CustomerSourceText source={"Cancel"} />
              </Button>
              <Button
                type="submit"
                form="lab-timing-form"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <CustomerSourceText source={"Saving…"} /> : <CustomerSourceText source={"Save expected completion"} />}
              </Button>
            </RequiredDialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
