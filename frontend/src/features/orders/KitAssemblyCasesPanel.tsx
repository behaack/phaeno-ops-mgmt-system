import { formatDisplayTimestamp } from '#/lib/display-format'
import { FieldError } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { ActionMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { KitLotSubmissionSummary, PartnerKitLotDialog } from './KitLotSubmission'
import { RegisteredKitLotField } from './RegisteredKitLotField'
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
import { Field } from '#/components/ui/field'
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
  })
type Values = z.infer<typeof kitCaseSchema>
const empty: Values = {
  action: 'extend',
  reason: '',
  submissionDeadlineAt: '',
  lotBatchNumber: '',
  shippedAt: '',
  carrier: '',
  trackingNumber: '',
}
const display = (value: string | null | undefined) =>
  value ? formatDisplayTimestamp(value, { seconds: true }) : 'Set when the kit ships'
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
  const [lotCase, setLotCase] = useState<KitAssemblyCase | null>(null)
  const caseActionButtons = useRef(new Map<string, HTMLButtonElement>())
  const [reviewed, setReviewed] = useState<{
    item: KitAssemblyCase
    action: Values['action']
  } | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(kitCaseSchema),
    defaultValues: empty,
  })
  const { isDirty: __formDraftDirty } = form.formState

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
    Boolean(reviewed) && __formDraftDirty,
    mutation.isPending,
  )
  function open(item: KitAssemblyCase, action: Values['action']) {
    mutation.reset()
    form.reset({ ...empty, action })
    setReviewed({ item, action })
  }
  async function close() {
    if (
      !mutation.isPending &&
      (!__formDraftDirty ||
        (await confirmPortal('Discard the unsaved case change?')))
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
      <Field>
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
          aria-invalid={Boolean(form.formState.errors[name])}
          {...form.register(name)}
        />
        {form.formState.errors[name] ? (
          <FieldError role="alert" >
            {<CustomerSourceText source={form.formState.errors[name]?.message} />}
          </FieldError>
        ) : null}
      </Field>
    )
  }
  if (!order.isKitBundle) return null
  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle><CustomerSourceText source={"Included assembly cases"} /></CardTitle>
        <CardDescription>
          <CustomerSourceText source={"Each purchased kit unit includes one case. Corrected inputs stay with\r\n          that case. Assembly does not create another purchase or billing\r\n          source."} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-medium">
          {order.operationalSummary ||
            'Kit fulfillment and assembly are tracked separately.'}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <CustomerSourceText source={"Unused cases expire 90 days after the kit’s labeled expiration, or 12\r\n          months after shipment when no expiration is recorded. An unused case\r\n          does not automatically create a refund."} />
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
                    <dt className="text-muted-foreground"><CustomerSourceText source={"Kit"} /></dt>
                    <dd>
                      {unit?.label ?? 'Assigned kit'}
                      {unit?.lotBatchNumber
                        ? ` · Lot ${unit.lotBatchNumber}`
                        : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      <CustomerSourceText source={"Submission deadline"} />
                    </dt>
                    <dd>
                      {display(item.submissionDeadlineAt)}
                      {item.deadlineBasis
                        ? ` · ${humanizeStatus(item.deadlineBasis)}`
                        : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground"><CustomerSourceText source={"Included profile"} /></dt>
                    <dd>
                      {item.profile.name} <CustomerSourceText source={"· version"} />{' '}
                      {item.profile.profileVersion}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground"><CustomerSourceText source={"Shipment"} /></dt>
                    <dd>
                      {unit?.shippedAt
                        ? `${display(unit.shippedAt)} · ${unit.carrier ?? ''} ${unit.trackingNumber ?? ''}`
                        : <CustomerSourceText source={"Awaiting kit shipment"} />}
                    </dd>
                  </div>
                </dl>
                <KitLotSubmissionSummary submission={item.lotSubmission} />
                <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" ref={node => { if (node) caseActionButtons.current.set(item.id, node); else caseActionButtons.current.delete(item.id) }}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                  {item.canSubmitLot ? <DropdownMenuItem onSelect={() => setLotCase(item)}>{item.lotSubmission ? 'Update kit lot submission' : 'Submit kit lot'}</DropdownMenuItem> : null}
                  {item.assemblyRequestId ? <DropdownMenuItem asChild>{staff ? <Link to="/lab-operations/data-assembly/$orderId" params={{ orderId: item.assemblyRequestId }} search={{ section: undefined }}>Open assembly work</Link> : <Link to="/data-assembly/$requestId" params={{ requestId: item.assemblyRequestId }} search={previous => previous}>{item.status === 'ResultsReleased' ? 'View results' : 'Open assembly case'}</Link>}</DropdownMenuItem> : !staff && item.canPrepare ? <DropdownMenuItem asChild><Link to="/data-assembly/new" search={{ kitOrderId: order.id, kitCaseId: item.id }}>Prepare inputs</Link></DropdownMenuItem> : null}
                  {staff && item.canExtend ? <DropdownMenuItem onSelect={() => open(item, 'extend')}>Extend deadline</DropdownMenuItem> : null}
                  {staff && item.canReplace ? <DropdownMenuItem onSelect={() => open(item, 'replace')}>Replace kit</DropdownMenuItem> : null}
                  {staff && item.canCancel ? <DropdownMenuItem variant="destructive" onSelect={() => open(item, 'cancel')}>Cancel unused case</DropdownMenuItem> : null}
                </DropdownMenuContent></ActionMenu>
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">
                    <CustomerSourceText source={"Included outputs and case history"} />
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
            <CustomerSourceText source={"Case identities are created when this kit order is placed."} />
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
            </DialogHeader>
            <div>
              <DialogDescription>
                {reviewed?.action === 'replace'
                  ? <CustomerSourceText source={"The existing assembly case transfers to the replacement kit. This records the actual replacement shipment without creating another entitlement, sale or invoice."} />
                  : reviewed?.action === 'cancel'
                    ? 'This closes the unused assembly entitlement. It does not cancel shipped kits or automatically issue a refund.'
                    : `Current deadline: ${display(reviewed?.item.submissionDeadlineAt)}. This extension preserves the original purchase and records your reason.`}
              </DialogDescription>
            </div>
            {mutation.error ? (
              <Alert variant="destructive">
                <AlertTitle><CustomerSourceText source={"Case was not changed"} /></AlertTitle>
                <AlertDescription>
                  {<CustomerSourceText source={getOrderErrorMessage(
                    mutation.error,
                    'Review the entries and try again.',
                  )} />}{' '}
                  <CustomerSourceText source={"Your entries remain here. Refresh and reopen this action if\r\n                  the case has changed."} />
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
                    <RegisteredKitLotField productId={order.lines.find(line => line.id === order.kitUnits?.find(unit => unit.id === reviewed.item.currentKitUnitId)?.orderLineId)?.qboCatalogItemId} value={form.watch('lotBatchNumber')} onChange={value => form.setValue('lotBatchNumber', value, { shouldDirty: true, shouldValidate: true })} error={form.formState.errors.lotBatchNumber?.message} disabled={mutation.isPending} />
                    {field(
                      'shippedAt',
                      'Actual shipment time',
                      'datetime-local',
                    )}
                    {field('carrier', 'Carrier')}
                    {field('trackingNumber', 'Tracking number')}
                  </>
                ) : null}
                <Field>
                  <Label htmlFor="kit-case-reason">
                    <RequiredFieldName><CustomerSourceText source={"Reason"} /></RequiredFieldName>
                  </Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <CustomerSourceText source={"This reason is visible in the Partner’s case history. Keep\r\n                    internal and other-customer details out."} />
                  </p>
                  <Textarea
                    id="kit-case-reason"

                    {...form.register('reason')}
                  />
                  {form.formState.errors.reason ? (
                    <FieldError role="alert" >
                      {<CustomerSourceText source={form.formState.errors.reason.message} />}
                    </FieldError>
                  ) : null}
                </Field>
              </fieldset>
            </form>
            <RequiredDialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={close}
              >
                <CustomerSourceText source={"Keep case"} />
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
                  ? <CustomerSourceText source={"Saving…"} />
                  : reviewed
                    ? titles[reviewed.action]
                    : 'Save'}
              </Button>
            </RequiredDialogFooter>
          </DialogContent>
        </Dialog>
        {lotCase ? <PartnerKitLotDialog key={lotCase.currentKitUnitId} orderId={order.id} kitCase={lotCase} onClose={() => setLotCase(null)} restoreFocus={() => caseActionButtons.current.get(lotCase.id)?.focus()} /> : null}
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
