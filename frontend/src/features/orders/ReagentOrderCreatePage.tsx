import { KitOrderReviewDialog, type KitOrderReview } from './KitOrderReviewDialog'
import { useOrderDraftGuard } from './use-order-draft-guard'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

import type { ReagentOrder } from '#/api/order-management'
import { ResumableDraft } from './resumable-draft'

import { createReagentOrder, createShippingAddress, getOrderErrorMessage, getReagentOrder, listReagentOfferings, listShippingAddresses, placeReagentOrder, updateReagentOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredLegend, RequiredMark as Required } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'

const schema = z.object({
  purchaseOrderNumber: z.string().trim().max(255),
  shippingAddressId: z.union([z.literal(''), z.string().uuid('Select a shipping address.')]),
  requestedDeliveryDate: z.string().refine(value => !value || !Number.isNaN(Date.parse(value)), 'Enter a valid delivery date.').optional(),
  shippingInstructions: z.string().trim().max(2000).optional(),
  lines: z.array(z.object({ offeringId: z.string().uuid('Select a kit.'), quantity: z.coerce.number().int('Order whole kit units.').positive('Quantity must be positive.'), note: z.string().trim().max(2000).optional() })).min(1).max(100),
}).superRefine((values, context) => {
  if (new Set(values.lines.map((line) => line.offeringId)).size !== values.lines.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Each kit offering may appear only once.' })
})

const addressSchema = z.object({ label: z.string().trim().min(1), recipient: z.string().trim().min(1), line1: z.string().trim().min(1), line2: z.string().trim().optional(), city: z.string().trim().min(1), region: z.string().trim().min(1), postalCode: z.string().trim().min(1), countryCode: z.string().trim().length(2), phone: z.string().trim().optional() })
type FormValues = z.input<typeof schema>
type Values = z.output<typeof schema>
type AddressValues = z.infer<typeof addressSchema>

export function ReagentOrderCreatePage({ orderId }: { orderId?: string }) {
  const { authProvider, session } = usePhaenoSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [addressOpen, setAddressOpen] = useState(false)
  const [review, setReview] = useState<KitOrderReview | null>(null)
  const canCommit = session?.memberships?.find(item => item.organizationId === session.selectedOrganization?.organizationId)?.isOrganizationAdmin === true
  const canCreate = Boolean(session?.capabilities.canCreateReagentOrders)
  const apiEnabled = canCreate && authProvider !== 'mock'
  const offerings = useQuery({ queryKey: ['order-catalog', 'reagent-offerings'], queryFn: listReagentOfferings, enabled: apiEnabled })
  const addresses = useQuery({ queryKey: ['partner-shipping-addresses'], queryFn: listShippingAddresses, enabled: apiEnabled })
  const existingOrder = useQuery({ queryKey: ['reagent-order', orderId], queryFn: () => getReagentOrder(orderId!), enabled: apiEnabled && Boolean(orderId) })
  const form = useForm<FormValues, unknown, Values>({ resolver: zodResolver(schema), defaultValues: { purchaseOrderNumber: '', shippingAddressId: '', requestedDeliveryDate: '', shippingInstructions: '', lines: [{ offeringId: '', quantity: 1, note: '' }] } })
  const addressForm = useForm<AddressValues>({ resolver: zodResolver(addressSchema), defaultValues: { label: '', recipient: '', line1: '', line2: '', city: '', region: '', postalCode: '', countryCode: 'US', phone: '' } })
  const lines = useFieldArray({ control: form.control, name: 'lines' })
  const initializedRecord = useRef<string | null>(null)
  useEffect(() => {
    if (!existingOrder.data || initializedRecord.current === existingOrder.data.id) return
    initializedRecord.current = existingOrder.data.id
    form.reset({
      purchaseOrderNumber: existingOrder.data.purchaseOrderNumber ?? '',
      shippingAddressId: existingOrder.data.shippingAddressId ?? '',
      requestedDeliveryDate: existingOrder.data.requestedDeliveryDate?.slice(0, 10) ?? '',
      shippingInstructions: existingOrder.data.shippingInstructions ?? '',
      lines: existingOrder.data.lines.map((line) => ({ offeringId: line.offeringId, quantity: line.quantity, note: line.note ?? '' })),
    })
  }, [existingOrder.data, form])
  const draftSession = useRef(new ResumableDraft<Values, ReagentOrder>())
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null)
  const placeKey = useRef<{ payload: string; key: string } | null>(null)
  const placeMutation = useMutation({
    mutationFn: async ({ values, place, reviewed }: { values: Values; place: boolean; reviewed?: KitOrderReview }) => {
      if (place && !canCommit) throw new Error('An organization administrator must place the PSeq Kit order. Department administrators may save a draft.')
      if (place && (!values.purchaseOrderNumber || !values.shippingAddressId)) {
        if (!values.purchaseOrderNumber) form.setError('purchaseOrderNumber', { message: 'Enter a purchase order number before placing the order.' })
        if (!values.shippingAddressId) form.setError('shippingAddressId', { message: 'Select a shipping address before placing the order.' })
        throw new Error('Complete purchase and delivery details before placing the order. You can save an incomplete draft.')
      }
      const details = (input: Values) => ({ purchaseOrderNumber: input.purchaseOrderNumber || null,
        shippingAddressId: input.shippingAddressId || null, requestedDeliveryDate: input.requestedDeliveryDate ? new Date(input.requestedDeliveryDate).toISOString() : null,
        shippingInstructions: input.shippingInstructions || null })
      const created = orderId ? null : await draftSession.current.getOrCreate(values,
        (input, key) => createReagentOrder(input.lines, details(input), key))
      const id = orderId ?? created!.id
      setSavedDraftId(id)
      const current = await getReagentOrder(id)
      if (!current.canEdit) return current
      const draft = await updateReagentOrder(id, values.lines, current.version, details(values))
      if (!place) return draft
      if (!reviewed || draft.lines.some(line => { const displayed = reviewed.offerings.find(item => item.id === line.offeringId); return !displayed || displayed.negotiatedUnitPrice !== line.unitPrice || displayed.currency !== line.currency || displayed.version !== line.includedOfferingVersion || displayed.includedAssemblyProfileId !== line.includedAssemblyProfileId || displayed.includedAssemblyProfileVersion !== line.includedAssemblyProfileVersion })) throw new Error('The kit price or included scope changed. Your draft is saved. Refresh offerings, save changes and review the updated bundle before placing it.')
      const input = { version: draft.version, purchaseOrderNumber: values.purchaseOrderNumber,
        shippingAddressId: values.shippingAddressId, requestedDeliveryDate: values.requestedDeliveryDate ? new Date(values.requestedDeliveryDate).toISOString() : null,
        shippingInstructions: values.shippingInstructions || null }
      const payload = JSON.stringify(input)
      if (placeKey.current?.payload !== payload) placeKey.current = { payload, key: crypto.randomUUID() }
      return placeReagentOrder(draft.id, input, placeKey.current.key)
    },
    onSuccess: async (order) => {
      setReview(null); form.reset(form.getValues())
      permitNavigation()
      await queryClient.invalidateQueries({ queryKey: ['reagent-orders'] })
      await queryClient.invalidateQueries({ queryKey: ['reagent-order', order.id] })
      await navigate({ to: '/reagent-orders/$orderId', params: { orderId: order.id }, search: previous => previous })
    },
  })
  const addressMutation = useMutation({
    mutationFn: (values: AddressValues) => createShippingAddress({ ...values, line2: values.line2 || null, phone: values.phone || null }),
    onSuccess: async (address) => {
      await queryClient.invalidateQueries({ queryKey: ['partner-shipping-addresses'] })
      form.setValue('shippingAddressId', address.id, { shouldDirty: true, shouldValidate: true })
      addressForm.reset(); setAddressOpen(false)
    },
  })

  const permitNavigation = useOrderDraftGuard(form.formState.isDirty || addressForm.formState.isDirty, placeMutation.isPending || addressMutation.isPending)

  function reviewOrder(values: Values) {
    if (!canCommit) return
    if (!values.purchaseOrderNumber || !values.shippingAddressId) {
      if (!values.purchaseOrderNumber) form.setError('purchaseOrderNumber', { message: 'Enter a purchase order number before placing the order.' })
      if (!values.shippingAddressId) form.setError('shippingAddressId', { message: 'Select a shipping address before placing the order.' })
      return
    }
    const selectedOfferings = values.lines.map(line => offerings.data?.find(item => item.id === line.offeringId))
    const address = addresses.data?.find(item => item.id === values.shippingAddressId)
    if (!address || selectedOfferings.some(item => !item?.includedAssemblyProfileId)) { form.setError('lines', { message: 'Choose available PSeq Kit offerings with an included assembly profile.' }); return }
    placeMutation.reset(); setReview({ values: structuredClone(values), offerings: structuredClone(selectedOfferings) as KitOrderReview['offerings'], address: structuredClone(address) })
  }
  if (!canCreate) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Order creation unavailable</AlertTitle><AlertDescription>An active organization or Department administrator is required.</AlertDescription></Alert></main>
  return <main className="page-wrap px-4 py-8">
    <section className="mb-6 max-w-3xl"><p className="text-sm text-muted-foreground"><Link to="/reagent-orders" search={previous => previous} className="hover:underline">PSeq Kit orders</Link> / {orderId ? 'Edit order' : 'New order'}</p><h1 className="mt-2 text-3xl font-semibold">{orderId ? 'Edit PSeq Kit order' : 'Review PSeq Kit order'}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Select only offerings negotiated for your Partner organization. An organization administrator places the order after reviewing the included scope and price. Department administrators may prepare and save a draft.</p></section>
    {offerings.error || addresses.error || existingOrder.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Order choices could not be loaded</AlertTitle><AlertDescription>Retry without leaving your draft. <Button type="button" variant="outline" onClick={() => { void offerings.refetch(); void addresses.refetch(); if (orderId) void existingOrder.refetch() }}>Retry</Button></AlertDescription></Alert> : null}
    {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Ordering is paused in mock-session mode</AlertTitle><AlertDescription>Connect a real Partner session to place an order.</AlertDescription></Alert> : null}
    {existingOrder.data && !existingOrder.data.canEdit ? <Alert variant="destructive" className="mb-5"><AlertTitle>Order is no longer editable</AlertTitle><AlertDescription>Return to the order to review its current status.</AlertDescription></Alert> : null}
    {placeMutation.error && !review ? <Alert variant="destructive" className="mb-5"><AlertTitle>{savedDraftId ? 'Draft saved; order needs attention' : 'Order was not saved'}</AlertTitle><AlertDescription>{getOrderErrorMessage(placeMutation.error, 'Review the order and try again.')}{savedDraftId ? <Link to="/reagent-orders/$orderId" params={{ orderId: savedDraftId }} className="ml-2 underline">Open saved draft</Link> : null}</AlertDescription></Alert> : null}
    <form noValidate onSubmit={form.handleSubmit(reviewOrder)} className="space-y-5">
      <fieldset disabled={placeMutation.isPending} className="contents">
      <RequiredLegend />
      <Card><CardHeader><CardTitle>PSeq Kit bundles</CardTitle><CardDescription>Quantities must follow each offering’s selling increment and limits.</CardDescription></CardHeader><CardContent className="space-y-4">{lines.fields.map((field, index) => <div key={field.id} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"><div><Label htmlFor={`offering-${index}`}>Kit <Required /></Label><select id={`offering-${index}`} {...form.register(`lines.${index}.offeringId`)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><option value="">Select kit</option>{(offerings.data ?? []).filter(offering => Boolean(offering.includedAssemblyProfileId)).map((offering) => <option key={offering.id} value={offering.id}>{offering.itemName} — {formatMoney(offering.negotiatedUnitPrice, offering.currency)} / {offering.sellingUnit}</option>)}</select><ErrorText message={form.formState.errors.lines?.[index]?.offeringId?.message} /></div><div><Label htmlFor={`quantity-${index}`}>Quantity <Required /></Label><Input id={`quantity-${index}`} type="number" step="1" className="mt-2" {...form.register(`lines.${index}.quantity`)} /><ErrorText message={form.formState.errors.lines?.[index]?.quantity?.message} /></div><Button type="button" variant="ghost" size="icon" className="mt-7" aria-label={`Remove reagent line ${index + 1}`} disabled={lines.fields.length === 1} onClick={() => lines.remove(index)}><Trash2 /></Button></div>)}<ErrorText message={form.formState.errors.lines?.root?.message ?? form.formState.errors.lines?.message} /><Button type="button" variant="outline" onClick={() => lines.append({ offeringId: '', quantity: 1, note: '' })}><Plus data-icon="inline-start" />Add kit</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Purchase and delivery</CardTitle><CardDescription>These details may be completed later in the draft. Purchase order number and shipping address are required when placing the order. Phaeno selects the carrier and service.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="purchaseOrderNumber">Purchase order number (required to place)</Label><Input id="purchaseOrderNumber" className="mt-2" {...form.register('purchaseOrderNumber')} /><ErrorText message={form.formState.errors.purchaseOrderNumber?.message} /></div><div><Label htmlFor="requestedDeliveryDate">Requested delivery date</Label><Input id="requestedDeliveryDate" type="date" className="mt-2" {...form.register('requestedDeliveryDate')} /></div><div className="sm:col-span-2"><div className="flex items-center justify-between gap-2"><Label htmlFor="shippingAddressId">Shipping address (required to place)</Label><Button type="button" variant="link" onClick={() => setAddressOpen(true)}>Add address</Button></div><select id="shippingAddressId" {...form.register('shippingAddressId')} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><option value="">Select address</option>{(addresses.data ?? []).map((address) => <option key={address.id} value={address.id}>{address.label} — {address.city}, {address.region}</option>)}</select><ErrorText message={form.formState.errors.shippingAddressId?.message} /></div><div className="sm:col-span-2"><Label htmlFor="shippingInstructions">Shipping instructions</Label><textarea id="shippingInstructions" {...form.register('shippingInstructions')} className="mt-2 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div></CardContent></Card>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" asChild><Link to={orderId ? '/reagent-orders/$orderId' : '/reagent-orders'} params={orderId ? { orderId } : undefined} search={previous => previous}>Cancel</Link></Button><Button type="button" variant="secondary" disabled={!apiEnabled || placeMutation.isPending || (Boolean(orderId) && !existingOrder.data?.canEdit)} onClick={form.handleSubmit((values) => placeMutation.mutate({ values, place: false }))}>{placeMutation.isPending ? 'Saving…' : 'Save draft'}</Button><Button type="submit" disabled={!apiEnabled || !canCommit || placeMutation.isPending || (Boolean(orderId) && !existingOrder.data?.canPlace)}>{placeMutation.isPending ? 'Placing order…' : 'Review PSeq Kit order'}</Button></div>
      </fieldset>
    </form>

    <KitOrderReviewDialog review={review} pending={placeMutation.isPending} error={placeMutation.error} onClose={() => { if (!placeMutation.isPending) setReview(null) }} onConfirm={() => { if (review) placeMutation.mutate({ values: review.values, place: true, reviewed: review }) }} onRefresh={() => { setReview(null); placeMutation.reset(); void offerings.refetch() }} />
    <Dialog open={addressOpen} onOpenChange={open => { if (!addressMutation.isPending && (open || !addressForm.formState.isDirty || window.confirm('Discard the unsaved address?'))) setAddressOpen(open) }}><DialogContent><DialogHeader><DialogTitle>Add shipping address</DialogTitle><DialogDescription>This address belongs to the selected Partner organization. This shipping address is operational only; Finance maintains billing-address records separately.</DialogDescription></DialogHeader><form id="shipping-address-form" onSubmit={addressForm.handleSubmit((values) => addressMutation.mutate(values))} className="grid gap-4 px-1 sm:grid-cols-2"><AddressField form={addressForm} name="label" label="Label" /><AddressField form={addressForm} name="recipient" label="Recipient" /><div className="sm:col-span-2"><AddressField form={addressForm} name="line1" label="Address line 1" /></div><div className="sm:col-span-2"><AddressField form={addressForm} name="line2" label="Address line 2" required={false} /></div><AddressField form={addressForm} name="city" label="City" /><AddressField form={addressForm} name="region" label="State or region" /><AddressField form={addressForm} name="postalCode" label="Postal code" /><AddressField form={addressForm} name="countryCode" label="Country code" /><div className="sm:col-span-2"><AddressField form={addressForm} name="phone" label="Phone" required={false} /></div></form>{addressMutation.error ? <Alert variant="destructive"><AlertTitle>Address was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(addressMutation.error, 'Review the address and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="shipping-address-form" disabled={addressMutation.isPending}>{addressMutation.isPending ? 'Saving…' : 'Add address'}</Button></RequiredDialogFooter></DialogContent></Dialog>
  </main>
}

function AddressField({ form, name, label, required = true }: { form: ReturnType<typeof useForm<AddressValues>>; name: keyof AddressValues; label: string; required?: boolean }) { const id = `address-${name}`; return <div><Label htmlFor={id}>{label}{required ? <Required /> : null}</Label><Input id={id} className="mt-2" {...form.register(name)} /><ErrorText message={form.formState.errors[name]?.message} /></div> }
function ErrorText({ message }: { message?: string }) { return message ? <p role="alert" className="mt-1 text-sm text-destructive">{message}</p> : null }
function formatMoney(value: number, currency: string) { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value) }
