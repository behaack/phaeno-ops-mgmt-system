import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage } from '#/api/order-management'
import type { SampleShippingConfiguration } from '#/api/sample-shipping'
import { createShippingContainerDefinition, reviseShippingContainerDefinition, type ShippingContainerDefinition } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '../use-order-draft-guard'
import { localContainerDateTime } from './shipping-container-utils'

const effectiveDate = z.string().min(1, 'Choose an effective date and time.').refine(value => Number.isFinite(new Date(value).getTime()), 'Choose a valid date and time.')
export const shippingContainerSchema = z.object({
  sku: z.string().trim().min(1, 'Enter the SKU number.').max(100),
  commonName: z.string().trim().min(1, 'Enter the common name.').max(255),
  tubeCapacity: z.coerce.number().int('Capacity must be a whole number of tubes.').positive('Enter a usable capacity greater than zero.'),
  ruleIds: z.array(z.string().uuid()).min(1, 'Select at least one compatible sample and handling rule.'),
  supplierName: z.string().trim().max(255),
  supplierProductNumber: z.string().trim().max(100),
  packingInstructions: z.string().trim().max(4000),
  effectiveFrom: effectiveDate,
  effectiveTo: z.union([z.literal(''), effectiveDate]),
  displayOrder: z.coerce.number().int('Display order must be a whole number.').min(0, 'Use zero or a positive display order.'),
  isActive: z.boolean(),
}).superRefine((values, context) => {
  if (values.effectiveTo && new Date(values.effectiveTo) <= new Date(values.effectiveFrom)) {
    context.addIssue({ code: 'custom', path: ['effectiveTo'], message: 'The end must be after the effective start.' })
  }
})
type Values = z.output<typeof shippingContainerSchema>

export function ShippingContainerEditor({ source, configuration, onClose, onSaved }: {
  source: ShippingContainerDefinition | null
  configuration: SampleShippingConfiguration
  onClose: () => void
  onSaved: (value: ShippingContainerDefinition) => void | Promise<void>
}) {
  const [productDetailsOpen, setProductDetailsOpen] = useState(Boolean(source?.supplierName || source?.supplierProductNumber || source?.packingInstructions))
  const form = useForm<z.input<typeof shippingContainerSchema>, unknown, Values>({
    resolver: zodResolver(shippingContainerSchema),
    defaultValues: {
      sku: source?.sku ?? '', commonName: source?.commonName ?? '', tubeCapacity: source?.tubeCapacity ?? '',
      ruleIds: source?.compatibilities.map(value => value.instructionRuleId) ?? [],
      supplierName: source?.supplierName ?? '', supplierProductNumber: source?.supplierProductNumber ?? '',
      packingInstructions: source?.packingInstructions ?? '', effectiveFrom: localContainerDateTime(),
      effectiveTo: '', displayOrder: source?.displayOrder ?? 0, isActive: source?.isActive ?? false,
    },
  })
  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const input = {
        commonName: values.commonName, tubeCapacity: values.tubeCapacity,
        supplierName: values.supplierName || null, supplierProductNumber: values.supplierProductNumber || null,
        packingInstructions: values.packingInstructions || null,
        effectiveFrom: new Date(values.effectiveFrom).toISOString(),
        effectiveTo: values.effectiveTo ? new Date(values.effectiveTo).toISOString() : null,
        displayOrder: values.displayOrder, isActive: values.isActive,
        compatibilities: values.ruleIds.map(id => {
          const rule = configuration.instructionRules.find(value => value.id === id)
          if (!rule) throw new Error('A selected handling rule is no longer available. Reload the configuration before saving.')
          return { sampleTypeDefinitionId: rule.sampleTypeDefinitionId, instructionRuleId: rule.id }
        }),
      }
      return source ? reviseShippingContainerDefinition(source.id, { ...input, version: source.version })
        : createShippingContainerDefinition({ ...input, sku: values.sku })
    },
    onSuccess: async value => { form.reset(form.getValues()); allowSavedNavigation(); await onSaved(value) },
  })
  const isDirty = form.formState.isDirty
  const allowSavedNavigation = useOrderDraftGuard(isDirty, mutation.isPending)
  const ruleIds = form.watch('ruleIds')
  const latestRuleIds = new Map<string, { id: string; revision: number }>()
  for (const rule of configuration.instructionRules) {
    const current = latestRuleIds.get(rule.definitionKey)
    if (!current || rule.revision > current.revision) latestRuleIds.set(rule.definitionKey, rule)
  }
  const rules = configuration.instructionRules.filter(rule => latestRuleIds.get(rule.definitionKey)?.id === rule.id || ruleIds.includes(rule.id))
  const errors = form.formState.errors
  const hasProductDetailsError = Boolean(errors.supplierName || errors.supplierProductNumber || errors.packingInstructions)
  function close() {
    if (mutation.isPending || isDirty && !window.confirm('Discard the unsaved container-size changes?')) return
    onClose()
  }
  function input(name: 'sku' | 'commonName' | 'supplierName' | 'supplierProductNumber' | 'tubeCapacity' | 'displayOrder' | 'effectiveFrom' | 'effectiveTo', label: string, type = 'text', required = false, help?: string) {
    return <ContainerField id={`container-${name}`} label={label} required={required} error={errors[name]?.message} help={help} alignWithAdjacentField>
      <Input id={`container-${name}`} type={type} disabled={mutation.isPending || name === 'sku' && Boolean(source)}
        min={name === 'tubeCapacity' ? 1 : name === 'displayOrder' ? 0 : undefined}
        step={type === 'number' ? 1 : undefined} aria-invalid={Boolean(errors[name])}
        aria-describedby={fieldHelpIds(`container-${name}`, help, errors[name]?.message)} {...form.register(name)} />
    </ContainerField>
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-2xl">
    <DialogHeader><DialogTitle>{source ? `Revise ${source.commonName}` : 'Add container size'}</DialogTitle>
      <DialogDescription>{source ? `Create revision ${source.revision + 1}. SKU ${source.sku} and existing shipment records stay unchanged.` : 'Set the approved capacity and handling rules. New sizes start as drafts.'}</DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Container size was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the values and try again.')}</AlertDescription></Alert> : null}
    <form id="shipping-container-editor" className="space-y-4" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {input('sku', 'SKU number', 'text', true, 'Keep leading zeros and separators. Fixed across revisions.')}
        {input('commonName', 'Common name', 'text', true)}
        {input('tubeCapacity', 'Usable tube capacity', 'number', true, 'Approved capacity with packing materials in place.')}
        {input('displayOrder', 'Display order', 'number', true, 'Lower numbers appear first.')}
      </div>
      <fieldset aria-describedby={fieldHelpIds('container-rules', 'Choose exact controlled rules.', errors.ruleIds?.message)}>
        <legend className="text-sm font-medium"><RequiredFieldName>Compatible sample and handling rules</RequiredFieldName></legend>
        <p id="container-rules-help" className="mt-1 text-xs text-muted-foreground">Select the approved sample and destination combinations.</p>
        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
          {rules.map(rule => <label key={rule.id} className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={ruleIds.includes(rule.id)} disabled={mutation.isPending}
              onChange={event => form.setValue('ruleIds', event.target.checked ? [...ruleIds, rule.id] : ruleIds.filter(id => id !== rule.id), { shouldDirty: true, shouldValidate: true })} />
            <span className="min-w-0 wrap-anywhere">{rule.sampleTypeName} · {rule.destinationName}<span className="block text-xs text-muted-foreground">{rule.compatibilityGroup} · revision {rule.revision}{rule.isActive ? '' : ' · inactive'}</span></span>
          </label>)}
          {!rules.length ? <p className="text-sm text-muted-foreground">Add sample types and instruction rules in Sample shipping before defining compatibility.</p> : null}
        </div>
        <ContainerFieldError id="container-rules-error" message={errors.ruleIds?.message} />
      </fieldset>
      <details open={productDetailsOpen || hasProductDetailsError} onToggle={event => setProductDetailsOpen(event.currentTarget.open)} className="rounded-md border px-3 py-2.5">
        <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Supplier and packing <span className="ml-1 text-xs font-normal text-muted-foreground">Optional</span></summary>
        <div className="mt-3 space-y-3">
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{input('supplierName', 'Supplier')}{input('supplierProductNumber', 'Supplier product number')}</div>
          <ContainerField id="container-packingInstructions" label="Packing instructions" error={errors.packingInstructions?.message}>
            <Textarea id="container-packingInstructions" rows={2} disabled={mutation.isPending} aria-invalid={Boolean(errors.packingInstructions)} aria-describedby={errors.packingInstructions ? 'container-packingInstructions-error' : undefined} {...form.register('packingInstructions')} />
          </ContainerField>
        </div>
      </details>
      <section aria-labelledby="container-availability-heading" className="space-y-3 border-t pt-4">
        <h3 id="container-availability-heading" className="text-sm font-medium">Availability</h3>
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{input('effectiveFrom', 'Effective from', 'datetime-local', true)}{input('effectiveTo', 'Effective through', 'datetime-local')}</div>
        <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-1" disabled={mutation.isPending} {...form.register('isActive')} /><span>Activate this revision for new packing plans<span className="block text-xs text-muted-foreground">Leave unchecked for a draft. The current active revision remains available.</span></span></label>
      </section>
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="shipping-container-editor" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : source ? 'Save revision' : 'Save container size'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

export function ContainerField({ id, label, required, error, help, children, alignWithAdjacentField = false }: { id: string; label: string; required?: boolean; error?: string; help?: string; children: ReactNode; alignWithAdjacentField?: boolean }) {
  if (alignWithAdjacentField) return <div className="grid gap-y-1.5 sm:row-span-3 sm:grid-rows-subgrid">
    <Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>
    {help ? <p id={`${id}-help`} className="text-xs text-muted-foreground">{help}</p> : <span className="hidden sm:block" aria-hidden="true" />}
    <div>{children}<ContainerFieldError id={`${id}-error`} message={error} /></div>
  </div>
  return <div><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>{help ? <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">{help}</p> : null}<div className="mt-2">{children}</div><ContainerFieldError id={`${id}-error`} message={error} /></div>
}
export function ContainerFieldError({ id, message }: { id: string; message?: string }) { return message ? <p id={id} role="alert" className="mt-1 text-sm text-destructive">{message}</p> : null }
function fieldHelpIds(id: string, help?: string, error?: string) { return [help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined }
