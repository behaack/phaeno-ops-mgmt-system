import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage } from '#/api/order-management'
import type { SampleShippingConfiguration } from '#/api/sample-shipping'
import { transportationKitProductTypeId, useSupplierCatalog } from '#/api/supplier-catalog'
import { getKitAssemblyWorkflows, kitAssemblyWorkflowsKey } from '#/api/lab-kit-assembly'
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
import { ShippingKitContentFields } from './ShippingKitContentFields'

const effectiveDate = z.string().min(1, 'Choose an effective date and time.').refine(value => Number.isFinite(new Date(value).getTime()), 'Choose a valid date and time.')
export const shippingContainerSchema = z.object({
  finishedKitProductId: z.union([z.string().uuid(), z.literal('')]),
  assemblyWorkflowRevisionId: z.union([z.string().uuid(), z.literal('')]),
  sku: z.string().trim().min(1, 'Enter the SKU number.').max(100),
  commonName: z.string().trim().min(1, 'Enter the common name.').max(255),
  tubeCapacity: z.coerce.number().int('Capacity must be a whole number of tubes.').positive('Enter a usable capacity greater than zero.'),
  supplierName: z.string().trim().max(255),
  supplierProductNumber: z.string().trim().max(100),
  kitContents: z.array(z.object({ supplierId: z.string().uuid('Choose a supplier.'), supplierProductId: z.string().uuid('Choose a product.'), quantity: z.coerce.number().int('Use a whole-number quantity.').min(1, 'Enter a quantity of at least one.').max(2147483647) })).default([]),
  packingInstructions: z.string().trim().max(4000),
  temperatureControlInstructions: z.string().trim().max(2000),
  dryIceQuantity: z.string().trim().refine(value => !value || Number.isFinite(Number(value)) && Number(value) > 0, 'Enter a dry-ice amount greater than zero.'),
  dryIceUnit: z.string().trim().max(30),
  effectiveFrom: effectiveDate,
  effectiveTo: z.union([z.literal(''), effectiveDate]),
  displayOrder: z.coerce.number().int('Display order must be a whole number.').min(0, 'Use zero or a positive display order.'),
  isActive: z.boolean(),
}).superRefine((values, context) => {
  if (values.isActive && !values.kitContents.length) context.addIssue({ code: 'custom', path: ['kitContents'], message: 'Add at least one product before activating this revision.' })
  const seen = new Set<string>()
  values.kitContents.forEach((item, index) => {
    if (seen.has(item.supplierProductId)) context.addIssue({ code: 'custom', path: ['kitContents', index, 'supplierProductId'], message: 'List each product once and adjust its quantity.' })
    seen.add(item.supplierProductId)
  })
  if (values.effectiveTo && new Date(values.effectiveTo) <= new Date(values.effectiveFrom)) {
    context.addIssue({ code: 'custom', path: ['effectiveTo'], message: 'The end must be after the effective start.' })
  }
  if (Boolean(values.dryIceQuantity) !== Boolean(values.dryIceUnit))
    context.addIssue({ code: 'custom', path: ['dryIceUnit'], message: 'Enter both a dry-ice amount and unit, or leave both empty.' })
})
type Values = z.output<typeof shippingContainerSchema>
export type ShippingContainerForm = UseFormReturn<z.input<typeof shippingContainerSchema>, unknown, Values>

export function ShippingContainerEditor({ source, onClose, onSaved }: {
  source: ShippingContainerDefinition | null
  configuration: SampleShippingConfiguration
  initialSampleTypeDefinitionKey?: string
  onClose: () => void
  onSaved: (value: ShippingContainerDefinition) => void | Promise<void>
}) {
  const catalog = useSupplierCatalog()
  const kitWorkflows = useQuery({ queryKey: kitAssemblyWorkflowsKey, queryFn: getKitAssemblyWorkflows })
  const suppliers = (catalog.data ?? []).filter(item => item.isActive)
  const finishedProducts = suppliers.filter(item => item.isInternalProducer).flatMap(item => item.products.filter(product => product.isActive && product.productTypeId === transportationKitProductTypeId))
  const form = useForm<z.input<typeof shippingContainerSchema>, unknown, Values>({
    resolver: zodResolver(shippingContainerSchema.superRefine((values, context) => {
      if (!source && !finishedProducts.some(product => product.id === values.finishedKitProductId))
        context.addIssue({ code: 'custom', path: ['finishedKitProductId'], message: 'Choose a Phaeno transportation kit product.' })
      if (source && !source.finishedKitProductId && values.isActive)
        context.addIssue({ code: 'custom', path: ['isActive'], message: 'Add a new named Transportation kit for new work. Historical containers cannot be activated.' })
      if (values.isActive && (source?.finishedKitProductId || values.finishedKitProductId) && !values.assemblyWorkflowRevisionId)
        context.addIssue({ code: 'custom', path: ['assemblyWorkflowRevisionId'], message: 'Select an approved kit assembly workflow revision before activation.' })
      values.kitContents.forEach((item, index) => {
        const supplier = suppliers.find(value => value.id === item.supplierId)
        if (catalog.isPending || catalog.isError || !supplier) {
          context.addIssue({ code: 'custom', path: ['kitContents', index, 'supplierId'], message: 'Choose an active supplier from the catalog.' })
        }
        if (!supplier?.products.some(value => value.id === item.supplierProductId && value.isActive && value.productTypeIsActive)) {
          context.addIssue({ code: 'custom', path: ['kitContents', index, 'supplierProductId'], message: 'Choose an active product from this supplier.' })
        }
      })
    })),
    defaultValues: {
      finishedKitProductId: source?.finishedKitProductId ?? '',
      assemblyWorkflowRevisionId: source?.assemblyWorkflowRevisionId ?? '',
      sku: source?.sku ?? '', commonName: source?.commonName ?? '', tubeCapacity: source?.tubeCapacity ?? '',
      supplierName: source?.supplierName ?? '', supplierProductNumber: source?.supplierProductNumber ?? '',
      kitContents: source?.kitContents?.length ? source.kitContents.map(item => ({ supplierId: item.supplierId, supplierProductId: item.supplierProductId, quantity: item.quantity })) : [],
      packingInstructions: source?.packingInstructions ?? '', effectiveFrom: localContainerDateTime(),
      temperatureControlInstructions: source?.temperatureControlInstructions ?? '',
      dryIceQuantity: source?.dryIceQuantity?.toString() ?? '', dryIceUnit: source?.dryIceUnit ?? '',
      effectiveTo: '', displayOrder: source?.displayOrder ?? 0, isActive: source?.finishedKitProductId ? source.isActive : false,
    },
  })
  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const input = {
        commonName: values.commonName, tubeCapacity: values.tubeCapacity,
        assemblyWorkflowRevisionId: values.assemblyWorkflowRevisionId || null,
        kitContents: values.kitContents.map(({ supplierProductId, quantity }) => ({ supplierProductId, quantity })),
        supplierName: values.supplierName || null, supplierProductNumber: values.supplierProductNumber || null,
        packingInstructions: values.packingInstructions || null,
        temperatureControlInstructions: values.temperatureControlInstructions || null,
        dryIceQuantity: values.dryIceQuantity ? Number(values.dryIceQuantity) : null,
        dryIceUnit: values.dryIceUnit || null,
        effectiveFrom: new Date(values.effectiveFrom).toISOString(),
        effectiveTo: values.effectiveTo ? new Date(values.effectiveTo).toISOString() : null,
        displayOrder: values.displayOrder, isActive: source ? values.isActive : false,
      }
      return source ? reviseShippingContainerDefinition(source.id, { ...input, version: source.version })
        : createShippingContainerDefinition({ ...input, sku: values.sku, finishedKitProductId: values.finishedKitProductId })
    },
    onSuccess: async value => { form.reset(form.getValues()); allowSavedNavigation(); await onSaved(value) },
  })
  const isDirty = form.formState.isDirty
  const allowSavedNavigation = useOrderDraftGuard(isDirty, mutation.isPending)
  const selectedProductId = form.watch('finishedKitProductId') || source?.finishedKitProductId
  const approvedRevisions = (kitWorkflows.data ?? []).filter(item => item.finishedKitProductId === selectedProductId).flatMap(item => item.revisions.filter(revision => revision.status === 'Approved').sort((a, b) => b.revision - a.revision).slice(0, 1))
  const catalogUnavailable = catalog.isPending || catalog.isError
  const errors = form.formState.errors
  function close() {
    if (mutation.isPending || isDirty && !window.confirm('Discard the unsaved shipping specification changes?')) return
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
    <DialogHeader><DialogTitle>{source ? `Revise ${source.commonName}` : 'Add kit shipping specification'}</DialogTitle>
      <DialogDescription>{source ? `Create revision ${source.revision + 1}. SKU ${source.sku} and existing shipment records stay unchanged.` : 'Set the kit capacity, preparation, and bill of materials. A new kit starts as a draft and can be linked to one Sample type from its Actions menu.'}</DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Kit specification was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the values and try again.')}</AlertDescription></Alert> : null}
    <form id="shipping-container-editor" className="space-y-4" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}>
      {!source ? <ContainerField id="kit-finished-product" label="Phaeno transportation kit product" required error={errors.finishedKitProductId?.message} help="Create the named finished product under Suppliers & products → Phaeno first. The product supplies this specification's stable SKU and name."><select id="kit-finished-product" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" disabled={mutation.isPending || catalogUnavailable} {...form.register('finishedKitProductId')} onChange={event => { const product = finishedProducts.find(item => item.id === event.target.value); form.setValue('finishedKitProductId', event.target.value, { shouldDirty: true, shouldValidate: true }); if (product) { form.setValue('sku', product.productNumber, { shouldDirty: true, shouldValidate: true }); form.setValue('commonName', product.description, { shouldDirty: true, shouldValidate: true }) } }}><option value="">Select a product</option>{finishedProducts.map(product => <option key={product.id} value={product.id}>{product.productNumber} · {product.description}</option>)}</select></ContainerField> : source.finishedKitProductId ? <p className="rounded-md border bg-muted/30 p-3 text-sm">Shipping specification for Phaeno kit product · SKU {source.sku}</p> : <Alert><AlertTitle>Historical container</AlertTitle><AlertDescription>This specification has no named Phaeno Transportation kit product. Its history remains available, but a new kit must be added for new Orders.</AlertDescription></Alert>}
      {selectedProductId ? <ContainerField id="kit-assembly-revision" label="Approved assembly workflow revision" required={form.watch('isActive')} error={errors.assemblyWorkflowRevisionId?.message} help="The shipping specification and workflow must have identical component products, quantities, and tube count."><select id="kit-assembly-revision" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" disabled={mutation.isPending || kitWorkflows.isPending} {...form.register('assemblyWorkflowRevisionId')} onChange={event => { form.setValue('assemblyWorkflowRevisionId', event.target.value, { shouldDirty: true, shouldValidate: true }); const revision = approvedRevisions.find(item => item.id === event.target.value); if (revision) { form.setValue('kitContents', revision.components.map(item => ({ supplierId: catalog.data?.find(supplier => supplier.products.some(product => product.id === item.supplierProductId))?.id ?? '', supplierProductId: item.supplierProductId, quantity: item.quantity })), { shouldDirty: true, shouldValidate: true }); const tubes = revision.components.find(item => item.kind === 'Tube'); if (tubes) form.setValue('tubeCapacity', tubes.quantity, { shouldDirty: true, shouldValidate: true }) } }}><option value="">Select approved revision</option>{approvedRevisions.map(revision => <option key={revision.id} value={revision.id}>Revision {revision.revision} · {revision.components.length} components</option>)}</select></ContainerField> : null}
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {source?.finishedKitProductId || !source ? <><input type="hidden" {...form.register('sku')} /><input type="hidden" {...form.register('commonName')} /></> : <>{input('sku', 'SKU number', 'text', true, 'Keep leading zeros and separators. Fixed across revisions.')}{input('commonName', 'Common name', 'text', true)}</>}
        {input('tubeCapacity', 'Usable tube capacity', 'number', true, 'Approved capacity with packing materials in place.')}
        {input('displayOrder', 'Display order', 'number', true, 'Lower numbers appear first.')}
      </div>
      {catalog.isPending ? <p role="status">Loading suppliers and products…</p> : null}
      {catalog.isError ? <Alert variant="destructive"><AlertTitle>Supplier catalog unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(catalog.error, 'Try loading the supplier catalog again.')}<Button type="button" variant="outline" disabled={catalog.isFetching || mutation.isPending} onClick={() => void catalog.refetch()}>Retry supplier catalog</Button></AlertDescription></Alert> : null}
      <ShippingKitContentFields form={form} suppliers={suppliers} source={source} disabled={mutation.isPending || catalogUnavailable} />
      <ContainerField id="kit-temperature-control" label="Temperature-control instructions" error={errors.temperatureControlInstructions?.message} help="Describe the approved cooling method for one complete kit, including when no cooling is needed.">
        <Textarea id="kit-temperature-control" rows={3} disabled={mutation.isPending} {...form.register('temperatureControlInstructions')} />
      </ContainerField>
      <div className="grid gap-3 sm:grid-cols-2">
        <ContainerField id="kit-dry-ice-quantity" label="Dry ice amount" error={errors.dryIceQuantity?.message} help="Leave empty when this kit does not use dry ice." alignWithAdjacentField helpBelow>
          <Input id="kit-dry-ice-quantity" type="number" min="0" step="any" disabled={mutation.isPending} aria-invalid={Boolean(errors.dryIceQuantity)} aria-describedby={fieldHelpIds('kit-dry-ice-quantity', 'Leave empty when this kit does not use dry ice.', errors.dryIceQuantity?.message)} {...form.register('dryIceQuantity')} />
        </ContainerField>
        <ContainerField id="kit-dry-ice-unit" label="Dry ice unit" error={errors.dryIceUnit?.message} alignWithAdjacentField helpBelow>
          <Input id="kit-dry-ice-unit" placeholder="e.g. kg" disabled={mutation.isPending} aria-invalid={Boolean(errors.dryIceUnit)} aria-describedby={fieldHelpIds('kit-dry-ice-unit', undefined, errors.dryIceUnit?.message)} {...form.register('dryIceUnit')} />
        </ContainerField>
      </div>
      {source?.supplierName && !source.kitContents?.length ? <p className="text-xs text-muted-foreground">Earlier container reference: {source.supplierName}{source.supplierProductNumber ? ` · ${source.supplierProductNumber}` : ''}. Select the products and quantities above to record this revision's full contents.</p> : null}
      {source?.packingInstructions ? <ContainerField id="container-packingInstructions" label="Earlier container notes" error={errors.packingInstructions?.message}>
        <Textarea id="container-packingInstructions" rows={2} disabled={mutation.isPending} aria-invalid={Boolean(errors.packingInstructions)} aria-describedby={errors.packingInstructions ? 'container-packingInstructions-error' : undefined} {...form.register('packingInstructions')} /><p className="mt-1 text-xs text-muted-foreground">Retained from the earlier setup. Review these notes and clear any repeated instructions.</p>
      </ContainerField> : null}
      <section aria-labelledby="container-availability-heading" className="space-y-3 border-t pt-4">
        <h3 id="container-availability-heading" className="text-sm font-medium">Availability</h3>
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{input('effectiveFrom', 'Effective from', 'datetime-local', true)}{input('effectiveTo', 'Effective through', 'datetime-local')}</div>
        {source?.finishedKitProductId ? <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-1" disabled={mutation.isPending} {...form.register('isActive')} /><span>Activate this revision for new packing plans<span className="block text-xs text-muted-foreground">Leave unchecked for a draft. The current active revision remains available.</span></span></label> : source ? <p className="text-sm text-muted-foreground">Historical container revisions stay inactive. Add a new named Transportation kit for new Orders.</p> : <p className="text-sm text-muted-foreground">A new kit is saved as a draft. Link its Sample type from Actions, then activate a revision when its preparation is approved.</p>}
      </section>
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="shipping-container-editor" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : source ? 'Save revision' : 'Save shipping specification'}</Button></RequiredDialogFooter>
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
