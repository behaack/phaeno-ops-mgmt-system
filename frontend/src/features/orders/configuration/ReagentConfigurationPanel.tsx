import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { listOrganizations } from '#/api/data-provisioning'
import { getOrderErrorMessage, saveReagentOffering, type OrderConfiguration, type ReagentOffering } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const schema = z.object({
  partnerOrganizationId: z.string().uuid('Select a Partner organization.'),
  qboCatalogItemId: z.string().uuid('Select a QuickBooks item.'),
  negotiatedUnitPrice: z.coerce.number().nonnegative(),
  currency: z.string().trim().length(3),
  sellingUnit: z.string().trim().min(1).max(100),
  orderIncrement: z.coerce.number().positive(),
  minimumQuantity: z.coerce.number().positive(),
  maximumQuantity: z.union([z.literal(''), z.coerce.number().positive()]),
  shippingRestrictionsJson: z.string().refine(isJson, 'Shipping restrictions must be valid JSON.'),
  effectiveFrom: z.string().min(1),
  effectiveUntil: z.string(),
  isActive: z.boolean(),
}).superRefine((value, context) => {
  if (typeof value.maximumQuantity === 'number' && value.maximumQuantity < value.minimumQuantity) context.addIssue({ code: 'custom', path: ['maximumQuantity'], message: 'Maximum quantity cannot be less than the minimum.' })
})
type FormValues = z.input<typeof schema>
type Values = z.output<typeof schema>
const empty: FormValues = { partnerOrganizationId: '', qboCatalogItemId: '', negotiatedUnitPrice: 0, currency: 'USD', sellingUnit: '', orderIncrement: 1, minimumQuantity: 1, maximumQuantity: '', shippingRestrictionsJson: '{}', effectiveFrom: new Date().toISOString().slice(0, 10), effectiveUntil: '', isActive: false }

export function ReagentConfigurationPanel({ configuration }: { configuration: OrderConfiguration }) {
  const client = useQueryClient()
  const organizations = useQuery({ queryKey: ['organizations'], queryFn: listOrganizations })
  const [editing, setEditing] = useState<ReagentOffering | null | undefined>(undefined)
  const form = useForm<FormValues, unknown, Values>({ resolver: zodResolver(schema), defaultValues: empty })
  const mutation = useMutation({
    mutationFn: (values: Values) => saveReagentOffering(editing?.id ?? null, { ...values, maximumQuantity: values.maximumQuantity === '' ? null : values.maximumQuantity, minimumQuantity: values.minimumQuantity, effectiveUntil: values.effectiveUntil || null, version: editing?.version }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['order-configuration'] }); setEditing(undefined); form.reset(empty) },
  })
  const partners = (organizations.data ?? []).filter((organization) => organization.kind === 'Partner')
  function open(item: ReagentOffering | null) {
    setEditing(item)
    form.reset(item ? { partnerOrganizationId: item.partnerOrganizationId, qboCatalogItemId: item.qboCatalogItemId, negotiatedUnitPrice: item.negotiatedUnitPrice, currency: item.currency, sellingUnit: item.sellingUnit, orderIncrement: item.orderIncrement, minimumQuantity: item.minimumQuantity, maximumQuantity: item.maximumQuantity ?? '', shippingRestrictionsJson: item.shippingRestrictionsJson, effectiveFrom: item.effectiveFrom.slice(0, 10), effectiveUntil: item.effectiveUntil?.slice(0, 10) ?? '', isActive: item.isActive } : empty)
  }
  return <><Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Partner reagent pricing</CardTitle><CardDescription>Each offering freezes a negotiated Partner price, selling unit, quantity rules, and active date window.</CardDescription></div><Button type="button" onClick={() => open(null)}><Plus data-icon="inline-start" />Add offering</Button></div></CardHeader><CardContent><div className="divide-y">{configuration.reagentOfferings.map((item) => <button type="button" key={item.id} onClick={() => open(item)} className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><div><span className="font-medium">{item.itemName}</span><span className="mt-1 block text-xs text-muted-foreground">{item.currency} {item.negotiatedUnitPrice.toFixed(2)} / {item.sellingUnit} · Partner {item.partnerOrganizationId}</span></div><Badge variant={item.isActive ? 'secondary' : 'outline'}>{item.isActive ? 'Active' : 'Inactive'}</Badge></button>)}</div>{!configuration.reagentOfferings.length ? <p className="py-8 text-center text-sm text-muted-foreground">No Partner offerings configured.</p> : null}</CardContent></Card>
    <Dialog open={editing !== undefined} onOpenChange={(openState) => !openState && setEditing(undefined)}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit reagent offering' : 'Add reagent offering'}</DialogTitle><DialogDescription>Price changes apply to newly placed orders only; placed orders retain their frozen commercial snapshot.</DialogDescription></DialogHeader><form id="reagent-config-form" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid max-h-[60vh] gap-4 overflow-y-auto px-1 sm:grid-cols-2"><div><Label htmlFor="reagentPartner">Partner organization *</Label><select id="reagentPartner" {...form.register('partnerOrganizationId')} disabled={Boolean(editing)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select Partner</option>{partners.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></div><div><Label htmlFor="reagentItem">QuickBooks item *</Label><select id="reagentItem" {...form.register('qboCatalogItemId')} disabled={Boolean(editing)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select item</option>{configuration.catalogItems.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><Label htmlFor="reagentPrice">Negotiated unit price *</Label><Input id="reagentPrice" type="number" step="0.01" className="mt-2" {...form.register('negotiatedUnitPrice')} /></div><div><Label htmlFor="reagentCurrency">Currency *</Label><Input id="reagentCurrency" className="mt-2 uppercase" maxLength={3} {...form.register('currency')} /></div><div><Label htmlFor="reagentUnit">Selling unit *</Label><Input id="reagentUnit" className="mt-2" {...form.register('sellingUnit')} /></div><div><Label htmlFor="reagentIncrement">Order increment *</Label><Input id="reagentIncrement" type="number" step="any" className="mt-2" {...form.register('orderIncrement')} /></div><div><Label htmlFor="reagentMinimum">Minimum quantity *</Label><Input id="reagentMinimum" type="number" step="any" className="mt-2" {...form.register('minimumQuantity')} /></div><div><Label htmlFor="reagentMaximum">Maximum quantity</Label><Input id="reagentMaximum" type="number" step="any" className="mt-2" {...form.register('maximumQuantity')} /></div><div><Label htmlFor="reagentFrom">Effective from *</Label><Input id="reagentFrom" type="date" className="mt-2" {...form.register('effectiveFrom')} /></div><div><Label htmlFor="reagentUntil">Effective until</Label><Input id="reagentUntil" type="date" className="mt-2" {...form.register('effectiveUntil')} /></div><div className="sm:col-span-2"><Label htmlFor="reagentRestrictions">Shipping restrictions (JSON) *</Label><textarea id="reagentRestrictions" {...form.register('shippingRestrictionsJson')} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm" /></div><div className="flex items-center gap-2 sm:col-span-2"><Checkbox id="reagentActive" checked={form.watch('isActive')} onCheckedChange={(value) => form.setValue('isActive', value === true, { shouldDirty: true })} /><Label htmlFor="reagentActive" className="cursor-pointer font-normal">Active for Partner orders</Label></div></form>{mutation.error ? <Alert variant="destructive"><AlertTitle>Offering was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the pricing rules and try again.')}</AlertDescription></Alert> : null}<DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="reagent-config-form" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save offering'}</Button></DialogFooter></DialogContent></Dialog></>
}

function isJson(value: string) { try { JSON.parse(value); return true } catch { return false } }
