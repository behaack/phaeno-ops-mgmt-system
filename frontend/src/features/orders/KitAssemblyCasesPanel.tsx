import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  changeKitAssemblyCase,
  type KitAssemblyCase,
} from '#/api/order-bundles'
import { getOrderErrorMessage, type ReagentOrder } from '#/api/order-management'
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
import { humanizeStatus, OrderStatusBadge } from './OrderStatusBadge'
import { useOrderDraftGuard } from './use-order-draft-guard'

const validDate = z
  .string()
  .refine(
    (value) => !value || Number.isFinite(Date.parse(value)),
    'Choose a valid date and time.',
  )
export const kitCaseSchema = z
  .object({
    action: z.enum(['extend', 'replace', 'cancel']),
    reason: z.string().trim().min(1, 'Explain this change.').max(4000),
    submissionDeadlineAt: validDate,
    lotBatchNumber: z.string().trim().max(255),
    expiresAt: validDate,
    shippedAt: validDate,
    carrier: z.string().trim().max(255),
    trackingNumber: z.string().trim().max(255),
  })
  .superRefine((value, context) => {
    const required: Array<keyof typeof value> =
      value.action === 'extend'
        ? ['submissionDeadlineAt']
        : value.action === 'replace'
          ? ['lotBatchNumber', 'shippedAt', 'carrier', 'trackingNumber']
          : []
    for (const name of required)
      if (!value[name])
        context.addIssue({
          code: 'custom',
          path: [name],
          message: 'Complete this required field.',
        })
    if (
      value.action === 'replace' &&
      value.expiresAt &&
      value.shippedAt &&
      Date.parse(value.expiresAt) <= Date.parse(value.shippedAt)
    )
      context.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'The replacement must expire after shipment.',
      })
  })
type Values = z.infer<typeof kitCaseSchema>
const empty: Values = {
  action: 'extend',
  reason: '',
  submissionDeadlineAt: '',
  lotBatchNumber: '',
  expiresAt: '',
  shippedAt: '',
  carrier: '',
  trackingNumber: '',
}
const display = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : 'Set when the kit ships'
const titles = {
  extend: 'Extend submission deadline',
  cancel: 'Cancel unused assembly case',
  replace: 'Replace kit unit',
}

export function KitAssemblyCasesPanel({
  order,
  staff = false,
}: {
  order: ReagentOrder
  staff?: boolean
}) {
  const client = useQueryClient()
  const [reviewed, setReviewed] = useState<{
    item: KitAssemblyCase
    action: Values['action']
  } | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(kitCaseSchema),
    defaultValues: empty,
  })
  const mutation = useMutation({
    mutationFn: (values: Values) => {
      if (
        values.action === 'extend' &&
        reviewed?.item.submissionDeadlineAt &&
        Date.parse(values.submissionDeadlineAt) <=
          Date.parse(reviewed.item.submissionDeadlineAt)
      ) {
        form.setError('submissionDeadlineAt', {
          message: 'Choose a date later than the current deadline.',
        })
        throw new Error('An extension must move the current deadline later.')
      }
      return changeKitAssemblyCase(order.id, reviewed!.item.id, values.action, {
        version: reviewed!.item.version,
        reason: values.reason,
        ...(values.action === 'extend'
          ? {
              submissionDeadlineAt: new Date(
                values.submissionDeadlineAt,
              ).toISOString(),
            }
          : {}),
        ...(values.action === 'replace'
          ? {
              lotBatchNumber: values.lotBatchNumber,
              shippedAt: new Date(values.shippedAt).toISOString(),
              expiresAt: values.expiresAt
                ? new Date(values.expiresAt).toISOString()
                : null,
              carrier: values.carrier,
              trackingNumber: values.trackingNumber,
            }
          : {}),
      })
    },
    onSuccess: async () => {
      setReviewed(null)
      form.reset(empty)
      await Promise.all(
        [
          'reagent-order',
          'reagent-orders',
          'platform-order',
          'lab-reagent-order',
        ].map((key) => client.invalidateQueries({ queryKey: [key] })),
      )
    },
  })
  useOrderDraftGuard(
    Boolean(reviewed) && form.formState.isDirty,
    mutation.isPending,
  )
  function open(item: KitAssemblyCase, action: Values['action']) {
    mutation.reset()
    form.reset({ ...empty, action })
    setReviewed({ item, action })
  }
  function close() {
    if (
      !mutation.isPending &&
      (!form.formState.isDirty ||
        window.confirm('Discard the unsaved case change?'))
    )
      setReviewed(null)
  }
  function field(
    name: keyof Omit<Values, 'action' | 'reason'>,
    label: string,
    type = 'text',
    required = true,
  ) {
    return (
      <div>
        <Label htmlFor={`kit-case-${name}`}>
          {required ? (
            <RequiredFieldName>{label}</RequiredFieldName>
          ) : (
            `${label} (optional)`
          )}
        </Label>
        <Input
          id={`kit-case-${name}`}
          type={type}
          className="mt-2"
          aria-invalid={Boolean(form.formState.errors[name])}
          {...form.register(name)}
        />
        {form.formState.errors[name] ? (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {form.formState.errors[name]?.message}
          </p>
        ) : null}
      </div>
    )
  }
  if (!order.isKitBundle) return null
  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>Included assembly cases</CardTitle>
        <CardDescription>
          Each purchased kit unit includes one case. Corrected inputs stay with
          that case. Assembly does not create another purchase or billing
          source.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-medium">
          {order.operationalSummary ||
            'Kit fulfillment and assembly are tracked separately.'}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Unused cases expire 90 days after the kit’s labeled expiration, or 12
          months after shipment when no expiration is recorded. An unused case
          does not automatically create a refund.
        </p>
        <div className="mt-4 divide-y">
          {(order.assemblyCases ?? []).map((item) => {
            const unit = order.kitUnits?.find(
              (value) => value.id === item.currentKitUnitId,
            )
            return (
              <article key={item.id} className="space-y-3 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-medium">{item.caseNumber}</h3>
                  <OrderStatusBadge status={item.status} />
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Kit</dt>
                    <dd>
                      {unit?.label ?? 'Assigned kit'}
                      {unit?.lotBatchNumber
                        ? ` · Lot ${unit.lotBatchNumber}`
                        : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      Submission deadline
                    </dt>
                    <dd>
                      {display(item.submissionDeadlineAt)}
                      {item.deadlineBasis
                        ? ` · ${humanizeStatus(item.deadlineBasis)}`
                        : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Included profile</dt>
                    <dd>
                      {item.profile.name} · version{' '}
                      {item.profile.profileVersion}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Shipment</dt>
                    <dd>
                      {unit?.shippedAt
                        ? `${display(unit.shippedAt)} · ${unit.carrier ?? ''} ${unit.trackingNumber ?? ''}`
                        : 'Awaiting kit shipment'}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  {item.assemblyRequestId ? (
                    <Button variant="outline" asChild>
                      {staff ? (
                        <Link
                          to="/lab-operations/data-assembly/$orderId"
                          params={{ orderId: item.assemblyRequestId }}
                          search={{ section: undefined }}
                        >
                          Open assembly work
                        </Link>
                      ) : (
                        <Link
                          to="/data-assembly/$requestId"
                          params={{ requestId: item.assemblyRequestId }}
                          search={(previous) => previous}
                        >
                          {item.status === 'ResultsReleased'
                            ? 'View results'
                            : 'Open assembly case'}
                        </Link>
                      )}
                    </Button>
                  ) : !staff && item.canPrepare ? (
                    <Button asChild>
                      <Link
                        to="/data-assembly/new"
                        search={{ kitOrderId: order.id, kitCaseId: item.id }}
                      >
                        Prepare inputs
                      </Link>
                    </Button>
                  ) : null}
                  {staff && item.canExtend ? (
                    <Button
                      variant="outline"
                      onClick={() => open(item, 'extend')}
                    >
                      Extend deadline
                    </Button>
                  ) : null}
                  {staff && item.canReplace ? (
                    <Button
                      variant="outline"
                      onClick={() => open(item, 'replace')}
                    >
                      Replace kit
                    </Button>
                  ) : null}
                  {staff && item.canCancel ? (
                    <Button
                      variant="outline"
                      onClick={() => open(item, 'cancel')}
                    >
                      Cancel unused case
                    </Button>
                  ) : null}
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">
                    Included outputs and case history
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap">
                    {item.profile.instructions}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">
                    {readContract(item.profile.outputContractJson)}
                  </p>
                  <ol className="mt-3 space-y-2">
                    {item.history.map((event) => (
                      <li key={event.id}>
                        {display(event.at)} · {humanizeStatus(event.eventType)}
                        {event.reason ? ` — ${event.reason}` : ''}
                      </li>
                    ))}
                  </ol>
                </details>
              </article>
            )
          })}
        </div>
        {!order.assemblyCases?.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Case identities are created when this kit order is placed.
          </p>
        ) : null}
        <Dialog
          open={Boolean(reviewed)}
          onOpenChange={(value) => {
            if (!value) close()
          }}
        >
          <DialogContent
            showCloseButton={!mutation.isPending}
            aria-busy={mutation.isPending}
          >
            <DialogHeader>
              <DialogTitle>
                {reviewed ? titles[reviewed.action] : ''} ·{' '}
                {reviewed?.item.caseNumber}
              </DialogTitle>
              <DialogDescription>
                {reviewed?.action === 'replace'
                  ? 'The existing assembly case transfers to the replacement kit. This records the actual replacement shipment without creating another entitlement, sale or invoice.'
                  : reviewed?.action === 'cancel'
                    ? 'This closes the unused assembly entitlement. It does not cancel shipped kits or automatically issue a refund.'
                    : `Current deadline: ${display(reviewed?.item.submissionDeadlineAt)}. This extension preserves the original purchase and records your reason.`}
              </DialogDescription>
            </DialogHeader>
            {mutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>Case was not changed</AlertTitle>
                <AlertDescription>
                  {getOrderErrorMessage(
                    mutation.error,
                    'Review the entries and try again.',
                  )}{' '}
                  Your entries remain here. Refresh and reopen this action if
                  the case has changed.
                </AlertDescription>
              </Alert>
            ) : null}
            <form
              id="kit-case-action"
              noValidate
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            >
              <fieldset disabled={mutation.isPending} className="space-y-4">
                {reviewed?.action === 'extend'
                  ? field(
                      'submissionDeadlineAt',
                      'New submission deadline',
                      'datetime-local',
                    )
                  : null}
                {reviewed?.action === 'replace' ? (
                  <>
                    {field('lotBatchNumber', 'Replacement lot or batch')}
                    {field(
                      'shippedAt',
                      'Actual shipment time',
                      'datetime-local',
                    )}
                    {field(
                      'expiresAt',
                      'Labeled expiration',
                      'datetime-local',
                      false,
                    )}
                    {field('carrier', 'Carrier')}
                    {field('trackingNumber', 'Tracking number')}
                  </>
                ) : null}
                <div>
                  <Label htmlFor="kit-case-reason">
                    <RequiredFieldName>Reason</RequiredFieldName>
                  </Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This reason is visible in the Partner’s case history. Keep
                    internal and other-customer details out.
                  </p>
                  <Textarea
                    id="kit-case-reason"
                    className="mt-2"
                    {...form.register('reason')}
                  />
                  {form.formState.errors.reason ? (
                    <p role="alert" className="mt-1 text-sm text-destructive">
                      {form.formState.errors.reason.message}
                    </p>
                  ) : null}
                </div>
              </fieldset>
            </form>
            <RequiredDialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={close}
              >
                Keep case
              </Button>
              <Button
                type="submit"
                variant={
                  reviewed?.action === 'cancel' ? 'destructive' : 'default'
                }
                form="kit-case-action"
                disabled={mutation.isPending}
              >
                {mutation.isPending
                  ? 'Saving…'
                  : reviewed
                    ? titles[reviewed.action]
                    : 'Save'}
              </Button>
            </RequiredDialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
export function readContract(value: string) {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed === 'string') return parsed
    if (Array.isArray(parsed))
      return parsed
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        .join(', ')
    if (parsed && typeof parsed === 'object')
      return Object.entries(parsed)
        .map(
          ([key, item]) =>
            `${key.replace(/([a-z])([A-Z])/g, '$1 $2')}: ${Array.isArray(item) ? item.join(', ') : typeof item === 'string' ? item : JSON.stringify(item)}`,
        )
        .join('\n')
    return value
  } catch {
    return value
  }
}
