import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

import { createReagentOrder, createShippingAddress, getOrderErrorMessage, getReagentOrder, listReagentOfferings, listShippingAddresses, placeReagentOrder, updateReagentOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'

const schema = z.object({
  purchaseOrderNumber: z.string().trim().min(1, 'Purchase order number is required.').max(255),
  shippingAddressId: z.string().uuid('Select a shipping address.'),
  requestedDeliveryDate: z.string().optional(),
  shippingInstructions: z.string().trim().max(2000).optional(),
  lines: z.array(z.object({ offeringId: z.string().uuid('Select a reagent.'), quantity: z.coerce.number().positive('Quantity must be positive.'), note: z.string().trim().max(2000).optional() })).min(1).max(100),
}).superRefine((values, context) => {
  if (new Set(values.lines.map((line) => line.offeringId)).size !== values.lines.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Each reagent may appear only once.' })
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
  const canCreate = Boolean(session?.capabilities.canCreateReagentOrders)
  const apiEnabled = canCreate && authProvider !== 'mock'
  const offerings = useQuery({ queryKey: ['order-catalog', 'reagent-offerings'], queryFn: listReagentOfferings, enabled: apiEnabled })
  const addresses = useQuery({ queryKey: ['partner-shipping-addresses'], queryFn: listShippingAddresses, enabled: apiEnabled })
  const existingOrder = useQuery({ queryKey: ['reagent-order', orderId], queryFn: () => getReagentOrder(orderId!), enabled: apiEnabled && Boolean(orderId) })
  const form = useForm<FormValues, unknown, Values>({ resolver: zodResolver(schema), defaultValues: { purchaseOrderNumber: '', shippingAddressId: '', requestedDeliveryDate: '', shippingInstructions: '', lines: [{ offeringId: '', quantity: 1, note: '' }] } })
  const addressForm = useForm<AddressValues>({ resolver: zodResolver(addressSchema), defaultValues: { label: '', recipient: '', line1: '', line2: '', city: '', region: '', postalCode: '', countryCode: 'US', phone: '' } })
  const lines = useFieldArray({ control: form.control, name: 'lines' })
  useEffect(() => {
    if (!existingOrder.data) return
    form.reset({
      purchaseOrderNumber: existingOrder.data.purchaseOrderNumber ?? '',
      shippingAddressId: existingOrder.data.shippingAddressId ?? '',
      requestedDeliveryDate: existingOrder.data.requestedDeliveryDate?.slice(0, 10) ?? '',
      shippingInstructions: existingOrder.data.shippingInstructions ?? '',
      lines: existingOrder.data.lines.map((line) => ({ offeringId: line.offeringId, quantity: line.quantity, note: line.note ?? '' })),
    })
  }, [existingOrder.data, form])
  const placeMutation = useMutation({
    mutationFn: async ({ values, place }: { values: Values; place: boolean }) => {
      const draft = orderId
        ? await updateReagentOrder(orderId, values.lines, existingOrder.data!.version)
        : await createReagentOrder(values.lines)
      if (!place) return draft
      return placeReagentOrder(draft.id, { version: draft.version, purchaseOrderNumber: values.purchaseOrderNumber,
        shippingAddressId: values.shippingAddressId, requestedDeliveryDate: values.requestedDeliveryDate || null,
        shippingInstructions: values.shippingInstructions || null })
    },
    onSuccess: (order) => navigate({ to: '/reagent-orders/$orderId', params: { orderId: order.id } }),
  })
  const addressMutation = useMutation({
    mutationFn: (values: AddressValues) => createShippingAddress({ ...values, line2: values.line2 || null, phone: values.phone || null }),
    onSuccess: async (address) => {
      await queryClient.invalidateQueries({ queryKey: ['partner-shipping-addresses'] })
      form.setValue('shippingAddressId', address.id, { shouldDirty: true, shouldValidate: true })
      addressForm.reset(); setAddressOpen(false)
    },
  })

  if (!canCreate) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Order creation unavailable</AlertTitle><AlertDescription>An active Partner administrator is required.</AlertDescription></Alert></main>
  return <main className="page-wrap px-4 py-8">
    <section className="mb-6 max-w-3xl"><p className="text-sm text-muted-foreground"><Link to="/reagent-orders" className="hover:underline">Reagent orders</Link> / {orderId ? 'Edit order' : 'New order'}</p><h1 className="mt-2 text-3xl font-semibold">{orderId ? 'Edit reagent order' : 'Place reagent order'}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Select only offerings negotiated for your Partner organization. Prices and address details are frozen when you place the order.</p></section>
    {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Ordering is paused in mock-session mode</AlertTitle><AlertDescription>Connect a real Partner session to place an order.</AlertDescription></Alert> : null}
    {existingOrder.data && !existingOrder.data.canEdit ? <Alert variant="destructive" className="mb-5"><AlertTitle>Order is no longer editable</AlertTitle><AlertDescription>Return to the order to review its current status.</AlertDescription></Alert> : null}
    {placeMutation.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Order was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(placeMutation.error, 'Review the order and try again.')}</AlertDescription></Alert> : null}
    <form noValidate onSubmit={form.handleSubmit((values) => placeMutation.mutate({ values, place: true }))} className="space-y-5">
      <p className="text-sm text-muted-foreground"><span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> Required field</p>
      <Card><CardHeader><CardTitle>Reagents</CardTitle><CardDescription>Quantities must follow each offering’s selling increment and limits.</CardDescription></CardHeader><CardContent className="space-y-4">{lines.fields.map((field, index) => <div key={field.id} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"><div><Label htmlFor={`offering-${index}`}>Reagent <Required /></Label><select id={`offering-${index}`} {...form.register(`lines.${index}.offeringId`)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><option value="">Select reagent</option>{(offerings.data ?? []).map((offering) => <option key={offering.id} value={offering.id}>{offering.itemName} — {formatMoney(offering.negotiatedUnitPrice, offering.currency)} / {offering.sellingUnit}</option>)}</select><ErrorText message={form.formState.errors.lines?.[index]?.offeringId?.message} /></div><div><Label htmlFor={`quantity-${index}`}>Quantity <Required /></Label><Input id={`quantity-${index}`} type="number" step="any" className="mt-2" {...form.register(`lines.${index}.quantity`)} /><ErrorText message={form.formState.errors.lines?.[index]?.quantity?.message} /></div><Button type="button" variant="ghost" size="icon" className="mt-7" aria-label={`Remove reagent line ${index + 1}`} disabled={lines.fields.length === 1} onClick={() => lines.remove(index)}><Trash2 /></Button></div>)}<ErrorText message={form.formState.errors.lines?.root?.message ?? form.formState.errors.lines?.message} /><Button type="button" variant="outline" onClick={() => lines.append({ offeringId: '', quantity: 1, note: '' })}><Plus data-icon="inline-start" />Add reagent</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Purchase and delivery</CardTitle><CardDescription>Phaeno selects the carrier and service. Requested delivery dates are not guarantees.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="purchaseOrderNumber">Purchase order number <Required /></Label><Input id="purchaseOrderNumber" className="mt-2" {...form.register('purchaseOrderNumber')} /><ErrorText message={form.formState.errors.purchaseOrderNumber?.message} /></div><div><Label htmlFor="requestedDeliveryDate">Requested delivery date</Label><Input id="requestedDeliveryDate" type="date" className="mt-2" {...form.register('requestedDeliveryDate')} /></div><div className="sm:col-span-2"><div className="flex items-center justify-between gap-2"><Label htmlFor="shippingAddressId">Shipping address <Required /></Label><Button type="button" variant="link" onClick={() => setAddressOpen(true)}>Add address</Button></div><select id="shippingAddressId" {...form.register('shippingAddressId')} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><option value="">Select address</option>{(addresses.data ?? []).map((address) => <option key={address.id} value={address.id}>{address.label} — {address.city}, {address.region}</option>)}</select><ErrorText message={form.formState.errors.shippingAddressId?.message} /></div><div className="sm:col-span-2"><Label htmlFor="shippingInstructions">Shipping instructions</Label><textarea id="shippingInstructions" {...form.register('shippingInstructions')} className="mt-2 min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div></CardContent></Card>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" asChild><Link to={orderId ? '/reagent-orders/$orderId' : '/reagent-orders'} params={orderId ? { orderId } : undefined}>Cancel</Link></Button><Button type="button" variant="secondary" disabled={!apiEnabled || placeMutation.isPending || (Boolean(orderId) && !existingOrder.data?.canEdit)} onClick={form.handleSubmit((values) => placeMutation.mutate({ values, place: false }))}>{placeMutation.isPending ? 'Saving…' : 'Save draft'}</Button><Button type="submit" disabled={!apiEnabled || placeMutation.isPending || (Boolean(orderId) && !existingOrder.data?.canPlace)}>{placeMutation.isPending ? 'Placing order…' : 'Place reagent order'}</Button></div>
    </form>

    <Dialog open={addressOpen} onOpenChange={setAddressOpen}><DialogContent><DialogHeader><DialogTitle>Add shipping address</DialogTitle><DialogDescription>This address belongs to the selected Partner organization. QuickBooks remains the billing-address system of record.</DialogDescription></DialogHeader><form id="shipping-address-form" onSubmit={addressForm.handleSubmit((values) => addressMutation.mutate(values))} className="grid max-h-[60vh] gap-4 overflow-y-auto px-1 sm:grid-cols-2"><AddressField form={addressForm} name="label" label="Label" /><AddressField form={addressForm} name="recipient" label="Recipient" /><div className="sm:col-span-2"><AddressField form={addressForm} name="line1" label="Address line 1" /></div><div className="sm:col-span-2"><AddressField form={addressForm} name="line2" label="Address line 2" required={false} /></div><AddressField form={addressForm} name="city" label="City" /><AddressField form={addressForm} name="region" label="State or region" /><AddressField form={addressForm} name="postalCode" label="Postal code" /><AddressField form={addressForm} name="countryCode" label="Country code" /><div className="sm:col-span-2"><AddressField form={addressForm} name="phone" label="Phone" required={false} /></div></form>{addressMutation.error ? <Alert variant="destructive"><AlertTitle>Address was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(addressMutation.error, 'Review the address and try again.')}</AlertDescription></Alert> : null}<DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="shipping-address-form" disabled={addressMutation.isPending}>{addressMutation.isPending ? 'Saving…' : 'Add address'}</Button></DialogFooter></DialogContent></Dialog>
  </main>
}

function AddressField({ form, name, label, required = true }: { form: ReturnType<typeof useForm<AddressValues>>; name: keyof AddressValues; label: string; required?: boolean }) { const id = `address-${name}`; return <div><Label htmlFor={id}>{label}{required ? <Required /> : null}</Label><Input id={id} className="mt-2" {...form.register(name)} /><ErrorText message={form.formState.errors[name]?.message} /></div> }
function Required() { return <span className="ml-1 text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> }
function ErrorText({ message }: { message?: string }) { return message ? <p role="alert" className="mt-1 text-sm text-destructive">{message}</p> : null }
function formatMoney(value: number, currency: string) { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value) }
