import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createCustomerDeliveryLocation, updateCustomerDeliveryLocation, type CustomerDeliveryLocation, type DeliveryLocationScope } from '#/api/customer-delivery-locations'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '#/features/orders/use-order-draft-guard'

const required = (name: string, max = 255) => z.string().trim().min(1, `Enter ${name}.`).max(max, `Use ${max} characters or fewer.`)
export const deliveryLocationSchema = z.object({
  label: required('a location name', 100), recipient: required('the recipient'), line1: required('the street address'), line2: z.string().trim().max(255),
  city: required('the city'), region: required('the state, province, or region'), postalCode: required('the postal code', 50),
  countryCode: z.string().trim().regex(/^[a-zA-Z]{2}$/, 'Enter the two-letter country code, such as US.').transform(value => value.toUpperCase()),
  phone: z.string().trim().max(100), deliveryInstructions: z.string().trim().max(4000), isDefault: z.boolean(),
})
type Values = z.infer<typeof deliveryLocationSchema>

export function DeliveryLocationEditor({ scope, source, initialDefault = false, departmentName, onClose, onSaved }: {
  scope: DeliveryLocationScope; source: CustomerDeliveryLocation | null; initialDefault?: boolean; departmentName: string
  onClose: () => void; onSaved: (location: CustomerDeliveryLocation) => void | Promise<void>
}) {
  const form = useForm<Values>({ resolver: zodResolver(deliveryLocationSchema), defaultValues: {
    label: source?.label ?? '', recipient: source?.recipient ?? '', line1: source?.line1 ?? '', line2: source?.line2 ?? '', city: source?.city ?? '', region: source?.region ?? '', postalCode: source?.postalCode ?? '', countryCode: source?.countryCode ?? '', phone: source?.phone ?? '', deliveryInstructions: source?.deliveryInstructions ?? '', isDefault: source?.isDefault ?? initialDefault,
  } })
  const mutation = useMutation({ mutationFn: (values: Values) => {
    const input = { ...scope, ...values, line2: values.line2 || null, phone: values.phone || null, deliveryInstructions: values.deliveryInstructions || null }
    return source ? updateCustomerDeliveryLocation(source.id, { ...input, version: source.version }) : createCustomerDeliveryLocation(input)
  }, onSuccess: async location => { form.reset(form.getValues()); allowNavigation(); await onSaved(location) } })
  const dirty = form.formState.isDirty
  const allowNavigation = useOrderDraftGuard(dirty, mutation.isPending)
  const errors = form.formState.errors
  function close() { if (!mutation.isPending && (!dirty || window.confirm('Discard the unsaved delivery-location changes?'))) onClose() }
  function input(name: Exclude<keyof Values, 'isDefault' | 'deliveryInstructions'>, label: string, isRequired = true, help?: string) {
    return <LocationField id={`delivery-${name}`} label={label} required={isRequired} help={help} error={errors[name]?.message}><Input id={`delivery-${name}`} disabled={mutation.isPending} aria-invalid={Boolean(errors[name])} aria-describedby={[help ? `delivery-${name}-help` : '', errors[name] ? `delivery-${name}-error` : ''].filter(Boolean).join(' ') || undefined} {...form.register(name)} /></LocationField>
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{source ? 'Edit delivery location' : 'Add delivery location'}</DialogTitle><DialogDescription>Where transportation kits are delivered for {departmentName}. Existing kit requests keep their saved delivery address.</DialogDescription></DialogHeader>
      {mutation.error ? <Alert variant="destructive"><AlertTitle>Delivery location was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the details and try again.')}</AlertDescription></Alert> : null}
    <form id="delivery-location-form" className="space-y-4" onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
      {input('label', 'Location name', true, 'For example, Main laboratory or Receiving desk.')}
      {input('recipient', 'Recipient')}{input('line1', 'Street address')}{input('line2', 'Suite, floor, or building', false)}
      <div className="grid gap-4 sm:grid-cols-2">{input('city', 'City')}{input('region', 'State, province, or region')}{input('postalCode', 'Postal code')}{input('countryCode', 'Country code')}</div>
      {input('phone', 'Delivery phone', false)}
      <LocationField id="delivery-deliveryInstructions" label="Delivery instructions" error={errors.deliveryInstructions?.message}><Textarea id="delivery-deliveryInstructions" rows={3} disabled={mutation.isPending} aria-invalid={Boolean(errors.deliveryInstructions)} aria-describedby={errors.deliveryInstructions ? 'delivery-deliveryInstructions-error' : undefined} {...form.register('deliveryInstructions')} /></LocationField>
      <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm"><input type="checkbox" className="mt-0.5 accent-primary" disabled={mutation.isPending} {...form.register('isDefault')} /><span><span className="font-medium">Default for this department</span><span className="mt-1 block text-muted-foreground">Preselect this location for future kit requests.</span></span></label>
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="delivery-location-form" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : source ? 'Save changes' : 'Add delivery location'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

function LocationField({ id, label, required = false, help, error, children }: { id: string; label: string; required?: boolean; help?: string; error?: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-2"><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>{help ? <p id={`${id}-help`} className="text-xs text-muted-foreground">{help}</p> : null}{children}{error ? <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p> : null}</div>
}
