import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { sequencingServiceProductTypeId, saveSupplierShipmentAddress, supplierCatalogKey, type CatalogSupplier, type SupplierShipmentAddress } from '#/api/supplier-catalog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { DialogReturnFocus } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { CatalogActions, CatalogStatusConfirmation } from './CatalogActions'
import { CatalogEditor } from './SupplierCatalogDialogs'
import { PreparationField } from './preparation-ui'

const schema = z.object({
  label: z.string().trim().min(1, 'Enter an address label.').max(100),
  recipient: z.string().trim().max(200),
  addressLine1: z.string().trim().min(1, 'Enter the street address.').max(200),
  addressLine2: z.string().trim().max(200),
  city: z.string().trim().min(1, 'Enter the city.').max(150),
  region: z.string().trim().max(150), postalCode: z.string().trim().max(40),
  countryCode: z.string().trim().regex(/^[a-zA-Z]{2}$/, 'Use a two-letter country code, for example US.'),
  phone: z.string().trim().max(50), instructions: z.string().trim().max(500),
})
type Values = z.infer<typeof schema>
const fields = [
  ['label', 'Address label', true, 100, ''], ['recipient', 'Recipient or receiving team (optional)', false, 200, 'name'],
  ['addressLine1', 'Street address', true, 200, 'address-line1'], ['addressLine2', 'Suite or address line 2 (optional)', false, 200, 'address-line2'],
  ['city', 'City', true, 150, 'address-level2'], ['region', 'State, province or region (optional)', false, 150, 'address-level1'],
  ['postalCode', 'Postal code (optional)', false, 40, 'postal-code'], ['countryCode', 'Country code', true, 2, 'country'],
  ['phone', 'Receiving phone (optional)', false, 50, 'tel'],
] as const

export function SupplierShipmentAddresses({ supplier }: { supplier: CatalogSupplier }) {
  const [editor, setEditor] = useState<SupplierShipmentAddress | 'new' | null>(null)
  const [status, setStatus] = useState<SupplierShipmentAddress | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const addresses = supplier.shipmentAddresses.filter(address => showInactive || address.isActive)
  const lastAddressRequired = supplier.isActive && supplier.products.some(product => product.isActive && product.productTypeId === sequencingServiceProductTypeId) && supplier.shipmentAddresses.filter(address => address.isActive).length === 1
  return <>
    <Card className="gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-muted/50 p-4">
      <CardTitle>Shipment addresses</CardTitle><CardDescription>Name each vendor destination, such as a receiving laboratory. Prepared shipments retain a copy of the selected address.</CardDescription>
      <CardAction><Button id={`supplier-address-new-${supplier.id}`} disabled={!supplier.isActive} onClick={() => setEditor('new')}><Plus data-icon="inline-start" />New address</Button></CardAction>
      <label className="col-span-full mt-3 flex cursor-pointer items-center gap-2 text-sm"><input id={`supplier-address-inactive-${supplier.id}`} type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} />Show inactive addresses</label>
    </CardHeader><CardContent className="p-4">
      {addresses.length ? <ul className="divide-y" aria-label="Shipment addresses">{addresses.map(address => <li key={address.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
        <div className="min-w-0 flex-1 basis-48"><p className="font-medium break-words">{address.label}</p><p className="mt-1 whitespace-pre-line break-words text-sm">{address.destination}</p><Badge className="mt-2" variant="secondary">{address.isActive ? 'Active' : 'Inactive'}</Badge></div>
        <CatalogActions id={`supplier-address-actions-${address.id}`} name={address.label} isActive={address.isActive} onEdit={() => setEditor(address)} onStatus={() => setStatus(address)} statusDisabled={address.isActive && lastAddressRequired} statusReason="Add another active address or deactivate this vendor’s sequencing services first." />
      </li>)}</ul> : <p className="text-sm text-muted-foreground">{supplier.shipmentAddresses.length ? 'No active shipment addresses. Show inactive addresses to review them.' : 'Add at least one shipment address before activating a Sequencing service product.'}</p>}
    </CardContent></Card>
    {editor ? <ShipmentAddressDialog supplier={supplier} address={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} /> : null}
    {status ? <CatalogStatusConfirmation name={status.label} isActive={status.isActive} description={status.isActive ? `This address for ${supplier.name} will be unavailable for new shipment selections. Saved shipments retain their address. An active sequencing vendor must keep at least one active address.` : `This address for ${supplier.name} will be available for shipment selection when the vendor and service are active.`} actionId={`supplier-address-actions-${status.id}`} fallbackId={`supplier-address-inactive-${supplier.id}`} onClose={() => setStatus(null)} onSave={() => saveSupplierShipmentAddress(supplier.id, { ...status, isActive: !status.isActive }, status.id)} /> : null}
  </>
}

export function ShipmentAddressDialog({ supplier, address, onClose }: { supplier: CatalogSupplier; address?: SupplierShipmentAddress; onClose: () => void }) {
  const id = useId()
  const cache = useQueryClient()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    label: address?.label ?? '', recipient: address?.recipient ?? '', addressLine1: address?.addressLine1 ?? '', addressLine2: address?.addressLine2 ?? '',
    city: address?.city ?? '', region: address?.region ?? '', postalCode: address?.postalCode ?? '', countryCode: address?.countryCode ?? '', phone: address?.phone ?? '', instructions: address?.instructions ?? '',
  } })
  const save = useMutation({ mutationFn: (values: Values) => saveSupplierShipmentAddress(supplier.id, { ...values, countryCode: values.countryCode.toUpperCase(), isActive: address?.isActive ?? true, version: address?.version }, address?.id), onSuccess: async () => {
    form.reset(form.getValues())
    await Promise.all([cache.invalidateQueries({ queryKey: supplierCatalogKey }), cache.invalidateQueries({ queryKey: ['lab-sequencing-vendors'] })])
    onClose()
  } })
  return <DialogReturnFocus target={null} fallbackId={address ? `supplier-address-actions-${address.id}` : `supplier-address-new-${supplier.id}`}><CatalogEditor title={address ? 'Edit shipment address' : 'New shipment address'} description={`${supplier.name}. Address changes apply to future selections. Saved shipments keep their reviewed address.`} formId={id} dirty={form.formState.isDirty} busy={save.isPending} error={save.error} onClose={onClose}>
    <form id={id} noValidate className="space-y-4" onSubmit={form.handleSubmit(values => { if (!save.isPending) save.mutate(values) })}>
      {fields.map(([key, label, required, maxLength, autoComplete]) => <PreparationField key={key} id={`${id}-${key}`} label={label} required={required} error={form.formState.errors[key]?.message}><Input id={`${id}-${key}`} maxLength={maxLength} autoComplete={autoComplete || 'off'} disabled={save.isPending} {...form.register(key)} />{key === 'label' ? <p className="text-xs text-muted-foreground">For example, Boston sequencing laboratory.</p> : key === 'countryCode' ? <p className="text-xs text-muted-foreground">Two-letter country code, for example US or GB.</p> : null}</PreparationField>)}
      <PreparationField id={`${id}-instructions`} label="Delivery instructions (optional)" error={form.formState.errors.instructions?.message}><Textarea id={`${id}-instructions`} maxLength={500} disabled={save.isPending} {...form.register('instructions')} /></PreparationField>
    </form>
  </CatalogEditor></DialogReturnFocus>
}
