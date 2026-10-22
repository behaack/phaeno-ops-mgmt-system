import { FieldError } from '#/components/ui/field'
import { RequiredFieldName } from '#/components/ui/required-field'
import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { confirmPortal } from '#/components/PortalConfirmation'
import { useOrderDraftGuard } from '../use-order-draft-guard'
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter as DialogFooter } from '#/components/ui/required-field'

const schema = z.object({
  includedAssemblyProfileId: z.string().uuid('Select the included assembly profile.').or(z.literal('')),
  partnerOrganizationId: z.string().uuid('Select a Partner organization.'),
  qboCatalogItemId: z.string().uuid('Select a commercial catalog item.'),
  negotiatedUnitPrice: z.coerce.number().nonnegative(),
  currency: z.string().trim().length(3),
  sellingUnit: z.string().trim().min(1).max(100),
  orderIncrement: z.coerce.number().int('Use whole kit units.').positive(),
  minimumQuantity: z.coerce.number().int('Use whole kit units.').positive(),
  maximumQuantity: z.union([z.literal(''), z.coerce.number().int('Use whole kit units.').positive()]),
  shippingRestrictionsJson: z.string().refine(isJson, 'Shipping restrictions must be valid JSON.'),
  effectiveFrom: z.string().min(1),
  effectiveUntil: z.string(),
  isActive: z.boolean(),
}).superRefine((value, context) => {
  if (value.isActive && !value.includedAssemblyProfileId) context.addIssue({ code: 'custom', path: ['includedAssemblyProfileId'], message: 'An active PSeq Kit offering requires an included assembly profile.' })
  if (typeof value.maximumQuantity === 'number' && value.maximumQuantity < value.minimumQuantity) context.addIssue({ code: 'custom', path: ['maximumQuantity'], message: 'Maximum quantity cannot be less than the minimum.' })
})
type FormValues = z.input<typeof schema>
type Values = z.output<typeof schema>
const empty: FormValues = { includedAssemblyProfileId: '', partnerOrganizationId: '', qboCatalogItemId: '', negotiatedUnitPrice: 0, currency: 'USD', sellingUnit: '', orderIncrement: 1, minimumQuantity: 1, maximumQuantity: '', shippingRestrictionsJson: '{}', effectiveFrom: new Date().toISOString().slice(0, 10), effectiveUntil: '', isActive: false }

export function ReagentConfigurationPanel({ configuration }: { configuration: OrderConfiguration }) {
  const client = useQueryClient()
  const organizations = useQuery({ queryKey: ['organizations'], queryFn: listOrganizations })
  const [editing, setEditing] = useState<ReagentOffering | null | undefined>(undefined)
  const form = useForm<FormValues, unknown, Values>({ resolver: zodResolver(schema), defaultValues: empty })
  const { isDirty: __formDraftDirty } = form.formState

  const mutation = useMutation({
    mutationFn: (values: Values) => saveReagentOffering(editing?.id ?? null, { ...values, includedAssemblyProfileId: values.includedAssemblyProfileId || null, maximumQuantity: values.maximumQuantity === '' ? null : values.maximumQuantity, minimumQuantity: values.minimumQuantity, effectiveUntil: values.effectiveUntil || null, version: editing?.version }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['order-configuration'] }); setEditing(undefined); form.reset(empty) },
  })
  useOrderDraftGuard(editing !== undefined && __formDraftDirty, mutation.isPending)
  async function close() { if (!mutation.isPending && (!__formDraftDirty || (await confirmPortal('Discard the unsaved kit offering?')))) setEditing(undefined) }
  const profiles = configuration.assemblyProfiles.filter(profile => profile.isActive && !profile.isSynthetic && profile.maximumFileSizeBytes > 0 && profile.maximumTotalSizeBytes > 0)
  const partners = (organizations.data ?? []).filter((organization) => organization.kind === 'Partner')
  function open(item: ReagentOffering | null) {
    mutation.reset(); setEditing(item)
    form.reset(item ? { includedAssemblyProfileId: item.includedAssemblyProfileId ?? '', partnerOrganizationId: item.partnerOrganizationId, qboCatalogItemId: item.qboCatalogItemId, negotiatedUnitPrice: item.negotiatedUnitPrice, currency: item.currency, sellingUnit: item.sellingUnit, orderIncrement: item.orderIncrement, minimumQuantity: item.minimumQuantity, maximumQuantity: item.maximumQuantity ?? '', shippingRestrictionsJson: item.shippingRestrictionsJson, effectiveFrom: item.effectiveFrom.slice(0, 10), effectiveUntil: item.effectiveUntil?.slice(0, 10) ?? '', isActive: item.isActive } : empty)
  }
  return <><Card className="gap-0 py-0">
    <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3">
      <CardTitle className="min-w-0"><CustomerSourceText source={"Partner PSeq Kit pricing"} /></CardTitle>
      <Button className="col-start-2 row-start-1 justify-self-end" type="button" onClick={() => open(null)}><Plus data-icon="inline-start" /><CustomerSourceText source={"Add offering"} /></Button>
      <CardDescription className="col-span-full"><CustomerSourceText source={"Each kit unit includes one assembly case. The negotiated bundle price, profile and quantity rules are frozen at purchase."} /></CardDescription>
    </CardHeader>
    <CardContent className="p-4"><div className="divide-y">{configuration.reagentOfferings.map((item) => <button type="button" key={item.id} onClick={() => open(item)} className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><div><span className="font-medium">{item.itemName}</span><span className="mt-1 block text-xs text-muted-foreground">{item.currency} {item.negotiatedUnitPrice.toFixed(2)} / {item.sellingUnit} <CustomerSourceText source={"· Partner"} /> {item.partnerOrganizationId}</span></div><Badge variant={item.isActive ? 'secondary' : 'outline'}>{item.isActive ? <CustomerSourceText source={"Active"} /> : <CustomerSourceText source={"Inactive"} />}</Badge></button>)}</div>{!configuration.reagentOfferings.length ? <p className="py-8 text-center text-sm text-muted-foreground"><CustomerSourceText source={"No Partner offerings configured."} /></p> : null}</CardContent></Card>
    <Dialog open={editing !== undefined} onOpenChange={(openState) => { if (!openState) close() }}><DialogContent showCloseButton={!mutation.isPending} aria-busy={mutation.isPending}><DialogHeader><DialogTitle>{editing ? <CustomerSourceText source={"Edit PSeq Kit offering"} /> : <CustomerSourceText source={"Add PSeq Kit offering"} />}</DialogTitle><DialogDescription><CustomerSourceText source={"Price changes apply to newly placed orders only; placed orders retain their frozen commercial snapshot."} /></DialogDescription></DialogHeader>{mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Offering was not saved"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Review the pricing rules and try again.')} />}</AlertDescription></Alert> : null}<form id="reagent-config-form" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))} ><fieldset disabled={mutation.isPending} className="grid gap-4 px-1 sm:grid-cols-2"><PortalField><Label htmlFor="reagentPartner"><RequiredFieldName><CustomerSourceText source={"Partner organization"} /></RequiredFieldName></Label><NativeSelect id="reagentPartner" {...form.register('partnerOrganizationId')} disabled={Boolean(editing)} className="w-full"><option value=""><CustomerSourceText source={"Select Partner"} /></option>{partners.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</NativeSelect>{form.formState.errors.partnerOrganizationId ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.partnerOrganizationId.message} />}</FieldError> : null}</PortalField><PortalField><Label htmlFor="reagentItem"><RequiredFieldName><CustomerSourceText source={"Commercial catalog item"} /></RequiredFieldName></Label><NativeSelect id="reagentItem" {...form.register('qboCatalogItemId')} disabled={Boolean(editing)} className="w-full"><option value=""><CustomerSourceText source={"Select item"} /></option>{configuration.catalogItems.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect>{form.formState.errors.qboCatalogItemId ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.qboCatalogItemId.message} />}</FieldError> : null}</PortalField><PortalField><Label htmlFor="reagentPrice"><RequiredFieldName><CustomerSourceText source={"Negotiated unit price"} /></RequiredFieldName></Label><Input id="reagentPrice" type="number" step="0.01"  {...form.register('negotiatedUnitPrice')} />{form.formState.errors.negotiatedUnitPrice ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.negotiatedUnitPrice.message} />}</FieldError> : null}</PortalField><PortalField><Label htmlFor="reagentCurrency"><RequiredFieldName><CustomerSourceText source={"Currency"} /></RequiredFieldName></Label><Input id="reagentCurrency" className="uppercase" maxLength={3} {...form.register('currency')} />{form.formState.errors.currency ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.currency.message} />}</FieldError> : null}</PortalField><PortalField><Label htmlFor="reagentUnit"><RequiredFieldName><CustomerSourceText source={"Selling unit"} /></RequiredFieldName></Label><Input id="reagentUnit"  {...form.register('sellingUnit')} />{form.formState.errors.sellingUnit ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.sellingUnit.message} />}</FieldError> : null}</PortalField><PortalField><Label htmlFor="reagentIncrement"><RequiredFieldName><CustomerSourceText source={"Order increment"} /></RequiredFieldName></Label><Input id="reagentIncrement" type="number" step="1"  {...form.register('orderIncrement')} />{form.formState.errors.orderIncrement ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.orderIncrement.message} />}</FieldError> : null}</PortalField><PortalField><Label htmlFor="reagentMinimum"><RequiredFieldName><CustomerSourceText source={"Minimum quantity"} /></RequiredFieldName></Label><Input id="reagentMinimum" type="number" step="1"  {...form.register('minimumQuantity')} />{form.formState.errors.minimumQuantity ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.minimumQuantity.message} />}</FieldError> : null}</PortalField><PortalField><Label htmlFor="reagentMaximum"><CustomerSourceText source={"Maximum quantity"} /></Label><Input id="reagentMaximum" type="number" step="1"  {...form.register('maximumQuantity')} />{form.formState.errors.maximumQuantity ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.maximumQuantity.message} />}</FieldError> : null}</PortalField><PortalField><Label htmlFor="reagentFrom"><RequiredFieldName><CustomerSourceText source={"Effective from"} /></RequiredFieldName></Label><Input id="reagentFrom" type="date"  {...form.register('effectiveFrom')} />{form.formState.errors.effectiveFrom ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.effectiveFrom.message} />}</FieldError> : null}</PortalField><PortalField><Label htmlFor="reagentUntil"><CustomerSourceText source={"Effective until"} /></Label><Input id="reagentUntil" type="date"  {...form.register('effectiveUntil')} />{form.formState.errors.effectiveUntil ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.effectiveUntil.message} />}</FieldError> : null}</PortalField><div className="sm:col-span-2"><Label htmlFor="reagentRestrictions"><RequiredFieldName><CustomerSourceText source={"Shipping restrictions (JSON)"} /></RequiredFieldName></Label><textarea id="reagentRestrictions" {...form.register('shippingRestrictionsJson')} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm" />{form.formState.errors.shippingRestrictionsJson ? <p role="alert" className="mt-1 text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.shippingRestrictionsJson.message} />}</p> : null}</div><PortalField className="sm:col-span-2"><Label htmlFor="includedAssemblyProfileId"><RequiredFieldName><CustomerSourceText source={"Included assembly profile"} />{form.watch('isActive') ? '' : <CustomerSourceText source={" (required when active)"} />}</RequiredFieldName></Label><p className="mt-1 text-sm text-muted-foreground"><CustomerSourceText source={"Each kit unit includes one case using this profile version. Existing purchased kits retain their frozen profile."} /></p><NativeSelect id="includedAssemblyProfileId" disabled={mutation.isPending} {...form.register('includedAssemblyProfileId')} className="w-full"><option value=""><CustomerSourceText source={"Select included profile"} /></option>{editing?.includedAssemblyProfileId && !profiles.some(profile => profile.id === editing.includedAssemblyProfileId) ? <option value={editing.includedAssemblyProfileId} disabled>{editing.includedAssemblyProfileName ?? "Previously selected profile"} <CustomerSourceText source={"(unavailable for new purchases)"} /></option> : null}{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name} <CustomerSourceText source={"· version"} /> {profile.profileVersion}</option>)}</NativeSelect>{form.formState.errors.includedAssemblyProfileId ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.includedAssemblyProfileId.message} />}</FieldError> : null}</PortalField><div className="flex items-center gap-2 sm:col-span-2"><Checkbox id="reagentActive" checked={form.watch('isActive')} onCheckedChange={(value) => form.setValue('isActive', value === true, { shouldDirty: true })} /><Label htmlFor="reagentActive" className="cursor-pointer font-normal"><CustomerSourceText source={"Active for Partner orders"} /></Label></div></fieldset></form><DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}><CustomerSourceText source={"Cancel"} /></Button><Button type="submit" form="reagent-config-form" disabled={mutation.isPending}>{mutation.isPending ? <CustomerSourceText source={"Saving…"} /> : <CustomerSourceText source={"Save offering"} />}</Button></DialogFooter></DialogContent></Dialog></>
}

function isJson(value: string) { try { JSON.parse(value); return true } catch { return false } }
