import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage } from '#/api/order-management'
import type { SampleShippingConfiguration } from '#/api/sample-shipping'
import { useSupplierCatalog } from '#/api/supplier-catalog'
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
const selectClass = 'h-9 w-full min-w-0 cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
const catalogKey = (value: string) => value.trim().toUpperCase()
export const shippingContainerSchema = z.object({
  sku: z.string().trim().min(1, 'Enter the SKU number.').max(100),
  commonName: z.string().trim().min(1, 'Enter the common name.').max(255),
  tubeCapacity: z.coerce.number().int('Capacity must be a whole number of tubes.').positive('Enter a usable capacity greater than zero.'),
  ruleIds: z.array(z.string().uuid()).min(1, 'Select at least one sample and destination assignment.'),
  supplierName: z.string().trim().max(255),
  supplierProductNumber: z.string().trim().max(100),
  packingInstructions: z.string().trim().max(4000),
  packingDetails: z.record(z.string(), z.object({ temperatureControlInstructions: z.string().trim().max(2000), packingInstructions: z.string().trim().max(4000) })).default({}),
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
  const catalog = useSupplierCatalog()
  const suppliers = (catalog.data ?? []).filter(item => item.isActive)
  const [productDetailsOpen, setProductDetailsOpen] = useState(Boolean(source?.supplierName || source?.supplierProductNumber || source?.packingInstructions))
  const form = useForm<z.input<typeof shippingContainerSchema>, unknown, Values>({
    resolver: zodResolver(shippingContainerSchema.superRefine((values, context) => {
      const supplier = suppliers.find(item => catalogKey(item.name) === catalogKey(values.supplierName))
      const sameSupplier = values.supplierName === (source?.supplierName ?? '')
      const sameProduct = sameSupplier && values.supplierProductNumber === (source?.supplierProductNumber ?? '')
      if (values.supplierName && !sameSupplier && (catalog.isPending || catalog.isError || !supplier)) {
        context.addIssue({ code: 'custom', path: ['supplierName'], message: 'Choose an active supplier from the catalog.' })
      }
      if (values.supplierProductNumber && !sameProduct && (catalog.isPending || catalog.isError || !supplier?.products.some(item =>
        item.isActive && item.productTypeIsActive && item.kind === 'ShippingContainer' && catalogKey(item.productNumber) === catalogKey(values.supplierProductNumber)))) {
        context.addIssue({ code: 'custom', path: ['supplierProductNumber'], message: 'Choose an active shipping-container product from this supplier.' })
      }
      if (!values.isActive) return
      for (const id of values.ruleIds) {
        if (!configuration.instructionRules.find(rule => rule.id === id)?.shippingProcedureId) continue
        for (const field of ['temperatureControlInstructions', 'packingInstructions'] as const) {
          if (!values.packingDetails[id]?.[field]) context.addIssue({ code: 'custom', path: ['packingDetails', id, field], message: field === 'temperatureControlInstructions' ? 'Enter the approved temperature control, including when no cooling is needed.' : 'Enter the approved packing steps for this combination.' })
        }
      }
    })),
    defaultValues: {
      sku: source?.sku ?? '', commonName: source?.commonName ?? '', tubeCapacity: source?.tubeCapacity ?? '',
      ruleIds: source?.compatibilities.map(value => value.instructionRuleId) ?? [],
      packingDetails: Object.fromEntries((source?.compatibilities ?? []).map(value => [value.instructionRuleId, { temperatureControlInstructions: value.temperatureControlInstructions ?? '', packingInstructions: value.packingInstructions ?? '' }])),
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
          if (!rule) throw new Error('A selected shipping assignment is no longer available. Reload the configuration before saving.')
          const details = values.packingDetails[id]
          return { sampleTypeDefinitionId: rule.sampleTypeDefinitionId, instructionRuleId: rule.id, temperatureControlInstructions: details?.temperatureControlInstructions || null, packingInstructions: details?.packingInstructions || null }
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
  const supplierName = form.watch('supplierName')
  const productNumber = form.watch('supplierProductNumber')
  const supplier = suppliers.find(item => catalogKey(item.name) === catalogKey(supplierName))
  const products = supplier?.products.filter(item => item.isActive && item.productTypeIsActive && item.kind === 'ShippingContainer') ?? []
  const retainedSupplier = Boolean(supplierName && !supplier)
  const retainedProduct = Boolean(productNumber && !products.some(item => catalogKey(item.productNumber) === catalogKey(productNumber)))
  const catalogUnavailable = catalog.isPending || catalog.isError
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
  function input(name: 'sku' | 'commonName' | 'tubeCapacity' | 'displayOrder' | 'effectiveFrom' | 'effectiveTo', label: string, type = 'text', required = false, help?: string) {
    return <ContainerField id={`container-${name}`} label={label} required={required} error={errors[name]?.message} help={help} alignWithAdjacentField helpBelow={name === 'sku' || name === 'commonName'}>
      <Input id={`container-${name}`} type={type} disabled={mutation.isPending || name === 'sku' && Boolean(source)}
        min={name === 'tubeCapacity' ? 1 : name === 'displayOrder' ? 0 : undefined}
        step={type === 'number' ? 1 : undefined} aria-invalid={Boolean(errors[name])}
        aria-describedby={fieldHelpIds(`container-${name}`, help, errors[name]?.message)} {...form.register(name)} />
    </ContainerField>
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-2xl">
    <DialogHeader><DialogTitle>{source ? `Revise ${source.commonName}` : 'Add container size'}</DialogTitle>
      <DialogDescription>{source ? `Create revision ${source.revision + 1}. SKU ${source.sku} and existing shipment records stay unchanged.` : 'Set the approved capacity and shipping assignments. New sizes start as drafts.'}</DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Container size was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the values and try again.')}</AlertDescription></Alert> : null}
    <form id="shipping-container-editor" className="space-y-4" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {input('sku', 'SKU number', 'text', true, 'Keep leading zeros and separators. Fixed across revisions.')}
        {input('commonName', 'Common name', 'text', true)}
        {input('tubeCapacity', 'Usable tube capacity', 'number', true, 'Approved capacity with packing materials in place.')}
        {input('displayOrder', 'Display order', 'number', true, 'Lower numbers appear first.')}
      </div>
      <fieldset aria-describedby={fieldHelpIds('container-rules', 'Choose exact controlled rules.', errors.ruleIds?.message)}>
        <legend className="text-sm font-medium"><RequiredFieldName>Sample and destination assignments</RequiredFieldName></legend>
        <p id="container-rules-help" className="mt-1 text-xs text-muted-foreground">Select the sample and destination assignments this container can support. Complete their packing instructions below.</p>
        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
          {rules.map(rule => <label key={rule.id} className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={ruleIds.includes(rule.id)} disabled={mutation.isPending}
              onChange={event => form.setValue('ruleIds', event.target.checked ? [...ruleIds, rule.id] : ruleIds.filter(id => id !== rule.id), { shouldDirty: true, shouldValidate: true })} />
            <span className="min-w-0 wrap-anywhere">{rule.sampleTypeName} · {rule.destinationName}<span className="block text-xs text-muted-foreground">{rule.compatibilityGroup} · revision {rule.revision}{rule.isActive ? '' : ' · inactive'}</span></span>
          </label>)}
          {!rules.length ? <p className="text-sm text-muted-foreground">Create a <Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'instructions' }}>shipping assignment</Link> before approving this container.</p> : null}
        </div>
        <ContainerFieldError id="container-rules-error" message={errors.ruleIds?.message} />
      </fieldset>
      {rules.filter(rule => ruleIds.includes(rule.id)).map(rule => <section key={rule.id} className="space-y-3 rounded-lg border p-4" aria-labelledby={`packing-${rule.id}`}>
        <h3 id={`packing-${rule.id}`} className="text-sm font-semibold">{rule.sampleTypeName} · {rule.destinationName}</h3>
        <ContainerField id={`cooling-${rule.id}`} label="Temperature control for this container" required={Boolean(rule.shippingProcedureId) && form.watch('isActive')} help="State the method, amount, units and preparation for one complete container: regular ice, dry ice, cold packs, another method, or no cooling. Samples sharing a container must use the same approved instruction; amounts are not added per sample." error={errors.packingDetails?.[rule.id]?.temperatureControlInstructions?.message}>
          <Textarea id={`cooling-${rule.id}`} rows={3} disabled={mutation.isPending} aria-invalid={Boolean(errors.packingDetails?.[rule.id]?.temperatureControlInstructions)} aria-describedby={fieldHelpIds(`cooling-${rule.id}`, 'Cooling guidance', errors.packingDetails?.[rule.id]?.temperatureControlInstructions?.message)} {...form.register(`packingDetails.${rule.id}.temperatureControlInstructions`)} />
        </ContainerField>
        <ContainerField id={`steps-${rule.id}`} label="Packing steps for this combination" required={Boolean(rule.shippingProcedureId) && form.watch('isActive')} help="Add the steps specific to this sample and container. Common shipping steps come from the assigned procedure." error={errors.packingDetails?.[rule.id]?.packingInstructions?.message}>
          <Textarea id={`steps-${rule.id}`} rows={3} disabled={mutation.isPending} aria-invalid={Boolean(errors.packingDetails?.[rule.id]?.packingInstructions)} aria-describedby={fieldHelpIds(`steps-${rule.id}`, 'Packing guidance', errors.packingDetails?.[rule.id]?.packingInstructions?.message)} {...form.register(`packingDetails.${rule.id}.packingInstructions`)} />
        </ContainerField>
      </section>)}
      <details open={productDetailsOpen || hasProductDetailsError} onToggle={event => setProductDetailsOpen(event.currentTarget.open)} className="rounded-md border px-3 py-2.5">
        <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Supplier details <span className="ml-1 text-xs font-normal text-muted-foreground">Optional</span></summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Choose a supplier, then its shipping-container product. Manage the available choices in <Link className="underline" to="/lab-operations" search={{ section: 'suppliers' }}>Suppliers &amp; products</Link>.</p>
          {catalog.isPending ? <p role="status" className="text-sm">Loading suppliers and products…</p> : null}
          {catalog.isError ? <Alert variant="destructive"><AlertTitle>Supplier catalog unavailable</AlertTitle><AlertDescription><p>{getOrderErrorMessage(catalog.error, 'Try loading the supplier catalog again.')}</p><Button type="button" variant="outline" disabled={catalog.isFetching || mutation.isPending} onClick={() => void catalog.refetch()}>Retry supplier catalog</Button></AlertDescription></Alert> : null}
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <ContainerField id="container-supplierName" label="Supplier" error={errors.supplierName?.message}>
              <select id="container-supplierName" className={selectClass} disabled={mutation.isPending || catalogUnavailable}
                aria-invalid={Boolean(errors.supplierName)} aria-describedby={errors.supplierName ? 'container-supplierName-error' : undefined}
                {...form.register('supplierName')} value={supplierName} onChange={event => {
                  form.setValue('supplierName', event.target.value, { shouldDirty: true, shouldValidate: true })
                  form.setValue('supplierProductNumber', '', { shouldDirty: true, shouldValidate: true })
                }}>
                <option value="">Not specified</option>
                {retainedSupplier ? <option value={supplierName} disabled>{supplierName} (saved reference)</option> : null}
                {suppliers.map(item => <option key={item.id} value={catalogKey(item.name) === catalogKey(supplierName) ? supplierName : item.name}>{item.name}</option>)}
              </select>
            </ContainerField>
            <ContainerField id="container-supplierProductNumber" label="Supplier product number" error={errors.supplierProductNumber?.message}>
              <select id="container-supplierProductNumber" className={selectClass} disabled={mutation.isPending || catalogUnavailable || ((!supplier || !products.length) && !productNumber)}
                aria-invalid={Boolean(errors.supplierProductNumber)} aria-describedby={errors.supplierProductNumber ? 'container-supplierProductNumber-error' : undefined}
                {...form.register('supplierProductNumber')} value={productNumber}>
                <option value="">{!supplier && !productNumber ? 'Select a supplier first' : !products.length && !productNumber ? 'No active shipping-container products' : 'Not specified'}</option>
                {retainedProduct ? <option value={productNumber} disabled>{productNumber} (saved reference)</option> : null}
                {products.map(item => <option key={item.id} value={catalogKey(item.productNumber) === catalogKey(productNumber) ? productNumber : item.productNumber}>{item.productNumber} — {item.description}</option>)}
              </select>
            </ContainerField>
          </div>
          {!catalogUnavailable && !suppliers.length ? <p className="text-sm text-muted-foreground">No active suppliers are configured. Add or activate one in Suppliers &amp; products to select it here.</p> : null}
          {!catalogUnavailable && (retainedSupplier || retainedProduct) ? <p className="text-xs text-muted-foreground">The saved reference is not an active catalog choice. Keep it unchanged for this revision, or clear it and select a replacement.</p> : null}
          {source?.packingInstructions ? <ContainerField id="container-packingInstructions" label="Earlier container notes" error={errors.packingInstructions?.message}>
            <Textarea id="container-packingInstructions" rows={2} disabled={mutation.isPending} aria-invalid={Boolean(errors.packingInstructions)} aria-describedby={errors.packingInstructions ? 'container-packingInstructions-error' : undefined} {...form.register('packingInstructions')} /><p className="mt-1 text-xs text-muted-foreground">Retained from the earlier container setup. Review these notes with the combination instructions and clear them if they repeat the approved steps.</p>
          </ContainerField> : null}
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

export function ContainerField({ id, label, required, error, help, children, alignWithAdjacentField = false, helpBelow = false }: { id: string; label: string; required?: boolean; error?: string; help?: string; children: ReactNode; alignWithAdjacentField?: boolean; helpBelow?: boolean }) {
  if (alignWithAdjacentField && helpBelow) return <div className="grid gap-y-1.5 sm:row-span-2 sm:grid-rows-subgrid">
    <Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>
    <div>{children}{help ? <p id={`${id}-help`} className="mt-[2px] text-xs text-muted-foreground">{help}</p> : null}<ContainerFieldError id={`${id}-error`} message={error} /></div>
  </div>
  if (alignWithAdjacentField) return <div className="grid gap-y-1.5 sm:row-span-3 sm:grid-rows-subgrid">
    <Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>
    {help ? <p id={`${id}-help`} className="text-xs text-muted-foreground">{help}</p> : <span className="hidden sm:block" aria-hidden="true" />}
    <div>{children}<ContainerFieldError id={`${id}-error`} message={error} /></div>
  </div>
  return <div><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>{help ? <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">{help}</p> : null}<div className="mt-2">{children}</div><ContainerFieldError id={`${id}-error`} message={error} /></div>
}
export function ContainerFieldError({ id, message }: { id: string; message?: string }) { return message ? <p id={id} role="alert" className="mt-1 text-sm text-destructive">{message}</p> : null }
function fieldHelpIds(id: string, help?: string, error?: string) { return [help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined }
