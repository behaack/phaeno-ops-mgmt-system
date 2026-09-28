import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage } from '#/api/order-management'
import type { SampleShippingConfiguration } from '#/api/sample-shipping'
import { shippingContainerProductTypeId, useSupplierCatalog } from '#/api/supplier-catalog'
import { getKitAssemblyWorkflows, kitAssemblyWorkflowsKey } from '#/api/lab-kit-assembly'
import { createShippingContainerDefinition, reviseShippingContainerDefinition, updateShippingContainerDraft, type ShippingContainerDefinition } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '../use-order-draft-guard'
import { containerEffectiveState, localContainerDateTime } from './shipping-container-utils'
import { linkableSampleTypes } from './linkable-sample-types'

const effectiveDate = z.string().min(1, 'Choose an effective date and time.').refine(value => Number.isFinite(new Date(value).getTime()), 'Choose a valid date and time.')
export const shippingContainerSchema = z.object({
  shippingContainerProductId: z.union([z.string().uuid(), z.literal('')]),
  assemblyWorkflowId: z.union([z.string().uuid(), z.literal('')]),
  sampleTypeDefinitionId: z.union([z.string().uuid(), z.literal('')]),
  sku: z.string().trim().min(1, 'Enter the SKU number.').max(100),
  commonName: z.string().trim().min(1, 'Enter the kit specification name.').max(255),
  tubeCapacity: z.coerce.number().int('Capacity must be a whole number of tubes.').min(0, 'Use zero or a positive capacity while drafting.'),
  temperatureControlInstructions: z.string().trim().max(2000),
  dryIceQuantity: z.string().trim().refine(value => !value || Number.isFinite(Number(value)) && Number(value) > 0, 'Enter a dry-ice amount greater than zero.'),
  dryIceUnit: z.string().trim().max(30),
  effectiveFrom: effectiveDate,
  effectiveTo: z.union([z.literal(''), effectiveDate]),
  displayOrder: z.coerce.number().int('Display order must be a whole number.').min(0, 'Use zero or a positive display order.'),
  isActive: z.boolean(),
  kitContents: z.array(z.object({ supplierProductId: z.string().uuid('Choose a component product.'), quantity: z.coerce.number().int('Use a whole-number quantity.').min(1, 'Use a positive quantity.') })),
}).superRefine((values, context) => {
  if (values.effectiveTo && new Date(values.effectiveTo) <= new Date(values.effectiveFrom)) {
    context.addIssue({ code: 'custom', path: ['effectiveTo'], message: 'The end must be after the effective start.' })
  }
  if (Boolean(values.dryIceQuantity) !== Boolean(values.dryIceUnit))
    context.addIssue({ code: 'custom', path: ['dryIceUnit'], message: 'Enter both a dry-ice amount and unit, or leave both empty.' })
  if (new Set(values.kitContents.map(item => item.supplierProductId)).size !== values.kitContents.length)
    context.addIssue({ code: 'custom', path: ['kitContents'], message: 'List each component product once and set its quantity.' })
})
type Values = z.output<typeof shippingContainerSchema>

export function ShippingContainerEditor({ source, configuration, existingDefinitions = [], initialSampleTypeDefinitionKey, onClose, onSaved }: {
  source: ShippingContainerDefinition | null
  configuration: SampleShippingConfiguration
  existingDefinitions?: ShippingContainerDefinition[]
  initialSampleTypeDefinitionKey?: string
  onClose: () => void
  onSaved: (value: ShippingContainerDefinition) => void | Promise<void>
}) {
  const catalog = useSupplierCatalog()
  const kitWorkflows = useQuery({ queryKey: kitAssemblyWorkflowsKey, queryFn: getKitAssemblyWorkflows })
  const suppliers = (catalog.data ?? []).filter(item => item.isActive)
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [contentSuppliers, setContentSuppliers] = useState<Record<string, string>>({})
  const isSelectableKitProduct = (product: (typeof suppliers)[number]['products'][number]) => product.isActive && product.productTypeIsActive && product.productTypeId === shippingContainerProductTypeId
  const finishedProducts = suppliers.flatMap(item => item.products.filter(isSelectableKitProduct))
  const productSuppliers = suppliers.filter(item => !item.isInternalProducer && item.products.some(isSelectableKitProduct))
  const selectedSupplier = suppliers.find(item => item.id === (supplierId ?? (catalog.data ?? []).find(value => value.products.some(product => product.id === source?.shippingContainerProductId))?.id))
  const supplierProducts = selectedSupplier?.products.filter(isSelectableKitProduct) ?? []
  const sampleTypeChoices = linkableSampleTypes(configuration.sampleTypes)
  const sourceSampleType = configuration.sampleTypes.find(item => item.id === source?.sampleTypeAnchorId)
  const initialSampleType = sampleTypeChoices.find(item => item.definitionKey === (sourceSampleType?.definitionKey ?? initialSampleTypeDefinitionKey))
  const pendingByFamily = new Map<string, number>()
  for (const item of configuration.sampleTypes) if (item.lifecycle === 'Draft') {
    pendingByFamily.set(item.definitionKey, Math.max(pendingByFamily.get(item.definitionKey) ?? 0, item.revision))
  }
  const form = useForm<z.input<typeof shippingContainerSchema>, unknown, Values>({
    resolver: zodResolver(shippingContainerSchema.superRefine((values, context) => {
      if (!finishedProducts.some(product => product.id === values.shippingContainerProductId && !suppliers.find(supplier => supplier.id === product.supplierId)?.isInternalProducer))
        context.addIssue({ code: 'custom', path: ['shippingContainerProductId'], message: 'Choose an active purchased Shipping Container from the selected supplier.' })
    })),
    defaultValues: {
      shippingContainerProductId: source?.shippingContainerProductId ?? '', assemblyWorkflowId: source?.assemblyWorkflowId ?? '',
      sampleTypeDefinitionId: initialSampleType?.id ?? source?.sampleTypeAnchorId ?? '',
      sku: source?.sku ?? '', commonName: source?.commonName ?? '', tubeCapacity: source?.tubeCapacity ?? '',
      effectiveFrom: source?.lifecycle === 'Draft' ? localContainerDateTime(new Date(source.effectiveFrom)) : localContainerDateTime(new Date(Math.max(Date.now(), source ? Date.parse(source.effectiveFrom) + 60_000 : Date.now()))),
      temperatureControlInstructions: source?.temperatureControlInstructions ?? '',
      dryIceQuantity: source?.dryIceQuantity?.toString() ?? '', dryIceUnit: source?.dryIceUnit ?? '',
      effectiveTo: source?.lifecycle === 'Draft' && source.effectiveTo ? localContainerDateTime(new Date(source.effectiveTo)) : '', displayOrder: source?.displayOrder ?? 0, isActive: false,
      kitContents: source?.kitContents?.map(item => ({ supplierProductId: item.supplierProductId, quantity: item.quantity })) ?? [],
    },
  })
  const contents = useFieldArray({ control: form.control, name: 'kitContents' })
  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const input = {
        commonName: values.commonName, tubeCapacity: values.tubeCapacity,
        temperatureControlInstructions: values.temperatureControlInstructions || null,
        dryIceQuantity: values.dryIceQuantity ? Number(values.dryIceQuantity) : null,
        dryIceUnit: values.dryIceUnit || null,
        effectiveFrom: new Date(values.effectiveFrom).toISOString(),
        effectiveTo: values.effectiveTo ? new Date(values.effectiveTo).toISOString() : null,
        displayOrder: values.displayOrder, isActive: false, sampleTypeDefinitionId: values.sampleTypeDefinitionId || null,
        kitContents: values.kitContents, shippingContainerProductId: values.shippingContainerProductId || null, assemblyWorkflowId: values.assemblyWorkflowId || null,
      }
      return source?.lifecycle === 'Draft' ? updateShippingContainerDraft(source.id, source.version, input)
        : source ? reviseShippingContainerDefinition(source.id, { ...input, version: source.version })
        : createShippingContainerDefinition({ ...input, sku: values.sku, shippingContainerProductId: values.shippingContainerProductId })
    },
    onSuccess: async value => { form.reset(form.getValues()); allowSavedNavigation(); await onSaved(value) },
  })
  const isDirty = form.formState.isDirty
  const allowSavedNavigation = useOrderDraftGuard(isDirty, mutation.isPending)
  const selectedSku = form.watch('sku').trim().toUpperCase()
  const matchingSkuSpecifications = new Map<string, ShippingContainerDefinition>()
  if (!source && selectedSku) for (const item of existingDefinitions) {
    if (item.sku.trim().toUpperCase() !== selectedSku) continue
    const previous = matchingSkuSpecifications.get(item.definitionKey)
    const priority = (definition: ShippingContainerDefinition) => {
      const state = containerEffectiveState(definition)
      return state === 'Active now' ? 3 : state === 'Scheduled' ? 2 : state === 'Discarded' ? 0 : 1
    }
    if (!previous || priority(item) > priority(previous) || (priority(item) === priority(previous) && item.revision > previous.revision))
      matchingSkuSpecifications.set(item.definitionKey, item)
  }
  const skuUses = [...matchingSkuSpecifications.values()].sort((a, b) =>
    a.commonName.localeCompare(b.commonName) || a.revision - b.revision)
  const componentSuppliers = suppliers.filter(item => !item.isInternalProducer)
    .map(item => ({ ...item, products: item.products.filter(product => product.isActive && product.productTypeIsActive) }))
    .filter(item => item.products.length > 0)
  const usableTubeCapacity = Number(form.watch('tubeCapacity'))
  const configuredShipperAvailable = componentSuppliers.some(item => item.products.some(product =>
    product.kind === 'ShippingContainer' && (product.tubeCapacity ?? 0) >= usableTubeCapacity))
  const approvedRevision = kitWorkflows.data?.find(item => item.id === form.watch('assemblyWorkflowId'))
    ?.revisions.filter(revision => revision.status === 'Approved').sort((a, b) => b.revision - a.revision)[0]
  const catalogUnavailable = catalog.isPending || catalog.isError
  const errors = form.formState.errors
  function close() {
    if (mutation.isPending || isDirty && !window.confirm('Discard the unsaved shipping specification changes?')) return
    onClose()
  }
  function input(name: 'sku' | 'tubeCapacity' | 'displayOrder' | 'effectiveFrom' | 'effectiveTo', label: string, type = 'text', required = false, help?: string) {
    return <ContainerField id={`container-${name}`} label={label} required={required} error={errors[name]?.message} help={help} alignWithAdjacentField={name !== 'effectiveFrom' && name !== 'effectiveTo'} helpBelow={name === 'sku'}>
      <Input id={`container-${name}`} type={type} disabled={mutation.isPending || name === 'sku' && Boolean(source)}
        min={name === 'tubeCapacity' || name === 'displayOrder' ? 0 : undefined}
        step={type === 'number' ? 1 : undefined} aria-invalid={Boolean(errors[name])}
        aria-describedby={fieldHelpIds(`container-${name}`, help, errors[name]?.message)} {...form.register(name)} />
    </ContainerField>
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-3xl">
    <DialogHeader><DialogTitle>{source?.lifecycle === 'Draft' ? `Edit Draft revision ${source.revision}` : source ? `Create ${source.commonName} revision ${source.revision + 1}` : 'Add kit shipping specification'}</DialogTitle>
       <DialogDescription>Save an incomplete Draft and finish it later. Select this revision's Sample type and required contents here. Activation can precede Sample type and assembly-workflow approval once the contents are complete.</DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Kit specification was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the values and try again.')}</AlertDescription></Alert> : null}
    <form id="shipping-container-editor" className="space-y-4" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}>
      <ContainerField id="container-commonName" label="Kit specification name" required error={errors.commonName?.message} help="Name this specification as staff should recognize it. Revisions may update the name without changing the product SKU."><Input id="container-commonName" maxLength={255} disabled={mutation.isPending} aria-invalid={Boolean(errors.commonName)} aria-describedby={`container-commonName-help${errors.commonName ? ' container-commonName-error' : ''}`} {...form.register('commonName')} /></ContainerField>
      {input('sku', 'Kit SKU', 'text', true, 'Identifies this complete kit specification. Fixed across revisions.')}
      <>
        <ContainerField id="kit-supplier" label="Container supplier" required><select id="kit-supplier" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" disabled={mutation.isPending || catalogUnavailable} value={selectedSupplier?.id ?? ''} onChange={event => { setSupplierId(event.target.value); form.setValue('shippingContainerProductId', '', { shouldDirty: true, shouldValidate: true }) }}><option value="">Select a supplier</option>{productSuppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></ContainerField>
        <ContainerField id="kit-container-product" label="Shipping Container" required error={errors.shippingContainerProductId?.message} help="The purchased outer container for one assembled kit. Its capacity must accommodate the usable tube count."><select id="kit-container-product" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" disabled={mutation.isPending || catalogUnavailable || !selectedSupplier} {...form.register('shippingContainerProductId')} onChange={event => {
          const product = supplierProducts.find(item => item.id === event.target.value)
          form.setValue('shippingContainerProductId', event.target.value, { shouldDirty: true, shouldValidate: true })
          const otherContents = form.getValues('kitContents').filter(item => !suppliers.some(supplier => supplier.products.some(value => value.id === item.supplierProductId && value.kind === 'ShippingContainer')))
          form.setValue('kitContents', product ? [...otherContents, { supplierProductId: product.id, quantity: 1 }] : otherContents, { shouldDirty: true, shouldValidate: true })
          if (product && !form.getValues('tubeCapacity') && product.tubeCapacity) form.setValue('tubeCapacity', product.tubeCapacity, { shouldDirty: true })
        }}><option value="">Select a Shipping Container</option>{supplierProducts.map(product => <option key={product.id} value={product.id}>{product.productNumber} · {product.description}</option>)}</select></ContainerField>
      </>
      {skuUses.length ? <Alert><AlertTitle>Kit SKU already used</AlertTitle><AlertDescription>This kit SKU appears in another specification family. Review the existing specification before creating a separate family.</AlertDescription></Alert> : null}
      <ContainerField id="kit-sample-type" label="Sample type" error={errors.sampleTypeDefinitionId?.message} help="Optional while saving a Draft; required for activation. This kit can be activated while its selected Sample type is Draft. New Orders wait until that Sample type and its Shipping procedure are Active. Changing the choice leaves earlier specifications and physical kits unchanged."><select id="kit-sample-type" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" disabled={mutation.isPending} {...form.register('sampleTypeDefinitionId')}><option value="">Choose a Sample type…</option>{sampleTypeChoices.map(item => <option key={item.id} value={item.id}>{item.name} — {item.lifecycle === 'Draft' ? `Draft revision ${item.revision}` : pendingByFamily.has(item.definitionKey) ? `Active; Draft revision ${pendingByFamily.get(item.definitionKey)} in progress` : 'Active'}</option>)}{source?.sampleTypeAnchorId && !initialSampleType ? <option value={source.sampleTypeAnchorId}>Previously selected Sample type (unavailable for activation)</option> : null}</select></ContainerField>
      <ContainerField id="kit-assembly-method" label="Assembly workflow" help="Choose a reusable method from Lab settings. Activation may precede approval; preparing a physical kit requires an approved version."><select id="kit-assembly-method" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" disabled={mutation.isPending || kitWorkflows.isPending || kitWorkflows.isError} {...form.register('assemblyWorkflowId')}><option value="">Choose later</option>{kitWorkflows.data?.map(workflow => <option key={workflow.id} value={workflow.id}>{workflow.name}{workflow.revisions.some(revision => revision.status === 'Approved') ? '' : ' (approval pending)'}</option>)}</select>{kitWorkflows.isError ? <p role="alert" className="mt-1 text-sm text-destructive">Assembly workflows could not be loaded.</p> : <p className="mt-1 text-xs text-muted-foreground">{approvedRevision ? 'New physical kits will use approved version ' + approvedRevision.revision + '.' : 'New physical kits wait until an assembly workflow is selected and approved.'}</p>}</ContainerField>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {input('tubeCapacity', 'Usable tube capacity', 'number', true, 'Approved capacity with packing materials in place.')}
        {input('displayOrder', 'Display order', 'number', true, 'Lower numbers appear first.')}
      </div>
      <section aria-labelledby="kit-contents-heading" aria-describedby="kit-contents-help" className="rounded-md border bg-muted/20 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 id="kit-contents-heading" className="text-sm font-medium">Required contents for one kit</h3>
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => contents.append({ supplierProductId: '', quantity: 1 })}>Add product</Button>
        </div>
        <p id="kit-contents-help" className="mt-1 text-xs text-muted-foreground">Choose one tube product with a quantity equal to usable tube capacity, one Shipping Container product with quantity one and enough tube slots, and any other required purchased products. The selected Shipping Container must be included once with quantity one. You can finish this list while the revision is a Draft; activation requires a complete list.</p>
        {usableTubeCapacity > 0 && !catalog.isPending && !catalog.isError && !configuredShipperAvailable ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">No available Shipping Container product has a configured capacity of at least {usableTubeCapacity} tubes. Add or update one in Suppliers &amp; products.</p> : null}
        {contents.fields.length > 0 || errors.kitContents?.message ? <div className="mt-3 space-y-1.5">
        {contents.fields.length > 0 ? <div aria-hidden="true" className="hidden gap-2 text-xs text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_5rem_5rem]">
          <span>Supplier</span><span><RequiredFieldName>Product</RequiredFieldName></span><span><RequiredFieldName>Quantity</RequiredFieldName></span><span />
        </div> : null}
        {contents.fields.map((field, index) => {
          const selectedId = form.watch(`kitContents.${index}.supplierProductId`)
          const previousContent = source?.kitContents?.find(item => item.supplierProductId === selectedId)
          const selectedSupplierId = contentSuppliers[field.id] ?? componentSuppliers.find(item => item.products.some(product => product.id === selectedId))?.id ?? previousContent?.supplierId ?? ''
          const selectedSupplier = componentSuppliers.find(item => item.id === selectedSupplierId)
          const selectedComponent = selectedSupplier?.products.find(product => product.id === selectedId)
          const unavailableProduct = Boolean(selectedId && !selectedSupplier?.products.some(product => product.id === selectedId))
          const unitWarning = selectedComponent?.kind === 'Tube' || selectedComponent?.kind === 'ShippingContainer'
            ? selectedComponent.defaultQuantityUnit?.trim().toLowerCase() !== 'each' : false
          const capacityWarning = selectedComponent?.kind === 'ShippingContainer'
            && (selectedComponent.tubeCapacity ?? 0) < usableTubeCapacity
          const productError = errors.kitContents?.[index]?.supplierProductId?.message
          const quantityError = errors.kitContents?.[index]?.quantity?.message
          return <div key={field.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_5rem_5rem] sm:items-start">
            <div><Label htmlFor={`spec-content-supplier-${field.id}`} className="mb-1 block text-xs sm:sr-only">Supplier</Label><select id={`spec-content-supplier-${field.id}`} className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm" value={selectedSupplierId} disabled={mutation.isPending} onChange={event => { setContentSuppliers(current => ({ ...current, [field.id]: event.target.value })); form.setValue(`kitContents.${index}.supplierProductId`, '', { shouldDirty: true, shouldValidate: true }) }}><option value="">Select supplier</option>{previousContent && !componentSuppliers.some(item => item.id === selectedSupplierId) ? <option value={previousContent.supplierId}>{previousContent.supplierName} (unavailable)</option> : null}{componentSuppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <div><Label htmlFor={`spec-content-product-${field.id}`} className="mb-1 block text-xs sm:sr-only"><RequiredFieldName>Product</RequiredFieldName></Label><select id={`spec-content-product-${field.id}`} className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm" disabled={!selectedSupplierId || mutation.isPending} aria-invalid={Boolean(productError)} {...form.register(`kitContents.${index}.supplierProductId`)} onChange={event => form.setValue(`kitContents.${index}.supplierProductId`, event.target.value, { shouldDirty: true, shouldValidate: true })}><option value="">Select product</option>{unavailableProduct && previousContent ? <option value={selectedId}>{previousContent.productNumber} · {previousContent.productDescription} (unavailable)</option> : null}{selectedSupplier?.products.map(product => <option key={product.id} value={product.id}>{product.productNumber} · {product.description} ({product.productTypeName}{product.kind === 'ShippingContainer' ? ` · ${product.tubeCapacity ?? 'capacity unset'} tubes` : ''})</option>)}</select>{productError ? <p role="alert" className="text-xs text-destructive">{productError}</p> : unavailableProduct ? <p className="text-xs text-amber-700 dark:text-amber-400">Replace this unavailable product before activation.</p> : unitWarning ? <p className="text-xs text-amber-700 dark:text-amber-400">Set this product's inventory unit to each in Suppliers &amp; products before activation.</p> : capacityWarning ? <p className="text-xs text-amber-700 dark:text-amber-400">Set this container's tube capacity to at least {usableTubeCapacity} in Suppliers &amp; products before activation.</p> : null}</div>
            <div><Label htmlFor={`spec-content-quantity-${field.id}`} className="mb-1 block text-xs sm:sr-only"><RequiredFieldName>Quantity</RequiredFieldName></Label><Input id={`spec-content-quantity-${field.id}`} type="number" min={1} step={1} disabled={mutation.isPending} aria-invalid={Boolean(quantityError)} {...form.register(`kitContents.${index}.quantity`)} onChange={event => form.setValue(`kitContents.${index}.quantity`, event.target.value, { shouldDirty: true, shouldValidate: true })} />{quantityError ? <p role="alert" className="text-xs text-destructive">{quantityError}</p> : null}</div>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => contents.remove(index)} aria-label={`Remove component ${index + 1}`}>Remove</Button>
          </div>
        })}
        {errors.kitContents?.message ? <p role="alert" className="text-sm text-destructive">{errors.kitContents.message}</p> : null}
        </div> : null}
      </section>
      {catalog.isPending ? <p role="status">Loading suppliers and products…</p> : null}
      {catalog.isError ? <Alert variant="destructive"><AlertTitle>Supplier catalog unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(catalog.error, 'Try loading the supplier catalog again.')}<Button type="button" variant="outline" disabled={catalog.isFetching || mutation.isPending} onClick={() => void catalog.refetch()}>Retry supplier catalog</Button></AlertDescription></Alert> : null}
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
      <section aria-labelledby="container-availability-heading" className="space-y-3 border-t pt-4">
        <h3 id="container-availability-heading" className="text-sm font-medium">Availability</h3>
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{input('effectiveFrom', 'Effective from', 'datetime-local', true)}{input('effectiveTo', 'Effective through', 'datetime-local')}</div>
        <p className="text-sm text-muted-foreground">Saving keeps this revision as a Draft. Use Actions to activate when required details and dependencies are ready.</p>
      </section>
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="shipping-container-editor" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : source?.lifecycle === 'Draft' ? 'Save Draft' : 'Create Draft'}</Button></RequiredDialogFooter>
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
