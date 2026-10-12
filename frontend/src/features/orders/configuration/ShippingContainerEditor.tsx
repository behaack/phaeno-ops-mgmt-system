import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage } from '#/api/order-management'
import type { SampleShippingConfiguration } from '#/api/sample-shipping'
import { shippingContainerProductTypeId, sequencingServiceProductTypeId, useSupplierCatalog } from '#/api/supplier-catalog'
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
  const __customerText = useCustomerText()

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
  const { isDirty: __formDraftDirty } = form.formState

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
  const isDirty = __formDraftDirty
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
    .map(item => ({ ...item, products: item.products.filter(product => product.isActive && product.productTypeIsActive && product.productTypeId !== sequencingServiceProductTypeId) }))
    .filter(item => item.products.length > 0)
  const usableTubeCapacity = Number(form.watch('tubeCapacity'))
  const configuredShipperAvailable = componentSuppliers.some(item => item.products.some(product =>
    product.kind === 'ShippingContainer' && (product.tubeCapacity ?? 0) >= usableTubeCapacity))
  const approvedRevision = kitWorkflows.data?.find(item => item.id === form.watch('assemblyWorkflowId'))
    ?.revisions.filter(revision => revision.status === 'Approved').sort((a, b) => b.revision - a.revision)[0]
  const catalogUnavailable = catalog.isPending || catalog.isError
  const errors = form.formState.errors
  async function close() {
    if (mutation.isPending || isDirty && !(await confirmPortal('Discard the unsaved shipping specification changes?'))) return
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
    <DialogHeader><DialogTitle>{source?.lifecycle === 'Draft' ? __customerText('m_fed098d586d6', { p0: String(source.revision) }) : source ? __customerText('m_d69d66c3f4fa', { p0: String(source.commonName), p1: String(source.revision + 1) }) : __customerText('m_f73ad245ceb0')}</DialogTitle>
       <DialogDescription><CustomerText message="m_fcf6551b0918" /></DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_7ea501d4eac5" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Review the values and try again.')} />}</AlertDescription></Alert> : null}
    <form id="shipping-container-editor" className="space-y-4" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}>
      <ContainerField id="container-commonName" label={__customerText('m_76eb714698bd')} required error={errors.commonName?.message} help="Name this specification as staff should recognize it. Revisions may update the name without changing the product SKU."><Input id="container-commonName" maxLength={255} disabled={mutation.isPending} aria-invalid={Boolean(errors.commonName)} aria-describedby={`container-commonName-help${errors.commonName ? ' container-commonName-error' : ''}`} {...form.register('commonName')} /></ContainerField>
      {input('sku', 'Kit SKU', 'text', true, 'Identifies this complete kit specification. Fixed across revisions.')}
      <>
        <ContainerField id="kit-supplier" label={__customerText('m_b41214ee5da9')} required><NativeSelect id="kit-supplier" className="w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" disabled={mutation.isPending || catalogUnavailable} value={selectedSupplier?.id ?? ''} onChange={event => { setSupplierId(event.target.value); form.setValue('shippingContainerProductId', '', { shouldDirty: true, shouldValidate: true }) }}><option value=""><CustomerText message="m_8c59dadf7b42" /></option>{productSuppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></ContainerField>
        <ContainerField id="kit-container-product" label={__customerText('m_2f81122e0ded')} required error={errors.shippingContainerProductId?.message} help="The purchased outer container for one assembled kit. Its capacity must accommodate the usable tube count."><NativeSelect id="kit-container-product" className="w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" disabled={mutation.isPending || catalogUnavailable || !selectedSupplier} {...form.register('shippingContainerProductId')} onChange={event => {
          const product = supplierProducts.find(item => item.id === event.target.value)
          form.setValue('shippingContainerProductId', event.target.value, { shouldDirty: true, shouldValidate: true })
          const otherContents = form.getValues('kitContents').filter(item => !suppliers.some(supplier => supplier.products.some(value => value.id === item.supplierProductId && value.kind === 'ShippingContainer')))
          form.setValue('kitContents', product ? [...otherContents, { supplierProductId: product.id, quantity: 1 }] : otherContents, { shouldDirty: true, shouldValidate: true })
          if (product && !form.getValues('tubeCapacity') && product.tubeCapacity) form.setValue('tubeCapacity', product.tubeCapacity, { shouldDirty: true })
        }}><option value=""><CustomerText message="m_ad72c250ff94" /></option>{supplierProducts.map(product => <option key={product.id} value={product.id}>{product.productNumber} · {product.description}</option>)}</NativeSelect></ContainerField>
      </>
      {skuUses.length ? <Alert><AlertTitle><CustomerText message="m_a09441893c9b" /></AlertTitle><AlertDescription><CustomerText message="m_ed6f822c7037" /></AlertDescription></Alert> : null}
      <ContainerField id="kit-sample-type" label={__customerText('m_1e3f2e3f87c9')} error={errors.sampleTypeDefinitionId?.message} help="Optional while saving a Draft; required for activation. This kit can be activated while its selected Sample type is Draft. New Orders wait until that Sample type and its Shipping procedure are Active. Changing the choice leaves earlier specifications and physical kits unchanged."><NativeSelect id="kit-sample-type" className="w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" disabled={mutation.isPending} {...form.register('sampleTypeDefinitionId')}><option value=""><CustomerText message="m_823d33011757" /></option>{sampleTypeChoices.map(item => <option key={item.id} value={item.id}>{item.name} — {item.lifecycle === 'Draft' ? __customerText('m_cb1dd158b6d0', { p0: String(item.revision) }) : pendingByFamily.has(item.definitionKey) ? __customerText('m_cea7713ce42a', { p0: String(pendingByFamily.get(item.definitionKey)) }) : __customerText('m_92340695899b')}</option>)}{source?.sampleTypeAnchorId && !initialSampleType ? <option value={source.sampleTypeAnchorId}><CustomerText message="m_5f15b3a2a9d3" /></option> : null}</NativeSelect></ContainerField>
      <ContainerField id="kit-assembly-method" label={__customerText('m_95a88f82a843')} help="Choose a reusable method from Lab settings. Activation may precede approval; preparing a physical kit requires an approved version."><NativeSelect id="kit-assembly-method" className="w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" disabled={mutation.isPending || kitWorkflows.isPending || kitWorkflows.isError} {...form.register('assemblyWorkflowId')}><option value=""><CustomerText message="m_64f99c1ca6b5" /></option>{kitWorkflows.data?.map(workflow => <option key={workflow.id} value={workflow.id}>{workflow.name}{workflow.revisions.some(revision => revision.status === 'Approved') ? '' : __customerText('m_7c79ce14fbcc')}</option>)}</NativeSelect>{kitWorkflows.isError ? <p role="alert" className="mt-1 text-sm text-destructive"><CustomerText message="m_91d3acebe66f" /></p> : <p className="mt-1 text-xs text-muted-foreground">{approvedRevision ? 'New physical kits will use approved version ' + approvedRevision.revision + '.' : __customerText('m_6f8aada278d4')}</p>}</ContainerField>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {input('tubeCapacity', 'Usable tube capacity', 'number', true, 'Approved capacity with packing materials in place.')}
        {input('displayOrder', 'Display order', 'number', true, 'Lower numbers appear first.')}
      </div>
      <section aria-labelledby="kit-contents-heading" aria-describedby="kit-contents-help" className="rounded-md border bg-muted/20 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 id="kit-contents-heading" className="text-sm font-medium"><CustomerText message="m_0d4a0be8b9d1" /></h3>
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => contents.append({ supplierProductId: '', quantity: 1 })}><CustomerText message="m_61c2739652de" /></Button>
        </div>
        <p id="kit-contents-help" className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_3c905e940ee0" /></p>
        {usableTubeCapacity > 0 && !catalog.isPending && !catalog.isError && !configuredShipperAvailable ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-400"><CustomerText message="m_fe62e5680e29" />{usableTubeCapacity} <CustomerText message="m_366a02b5754c" /></p> : null}
        {contents.fields.length > 0 || errors.kitContents?.message ? <div className="mt-3 space-y-1.5">
        {contents.fields.length > 0 ? <div aria-hidden="true" className="hidden gap-2 text-xs text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_5rem_5rem]">
          <span><CustomerText message="m_72e2f03367f7" /></span><span><RequiredFieldName><CustomerText message="m_fb9ef894175c" /></RequiredFieldName></span><span><RequiredFieldName><CustomerText message="m_822bab8d41bc" /></RequiredFieldName></span><span />
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
            <div><Label htmlFor={`spec-content-supplier-${field.id}`} className="mb-1 block text-xs sm:sr-only"><CustomerText message="m_72e2f03367f7" /></Label><NativeSelect id={`spec-content-supplier-${field.id}`} className="w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm" value={selectedSupplierId} disabled={mutation.isPending} onChange={event => { setContentSuppliers(current => ({ ...current, [field.id]: event.target.value })); form.setValue(`kitContents.${index}.supplierProductId`, '', { shouldDirty: true, shouldValidate: true }) }}><option value=""><CustomerText message="m_4cd620ae8ed9" /></option>{previousContent && !componentSuppliers.some(item => item.id === selectedSupplierId) ? <option value={previousContent.supplierId}>{previousContent.supplierName} <CustomerText message="m_334558585eea" /></option> : null}{componentSuppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></div>
            <div><Label htmlFor={`spec-content-product-${field.id}`} className="mb-1 block text-xs sm:sr-only"><RequiredFieldName><CustomerText message="m_fb9ef894175c" /></RequiredFieldName></Label><NativeSelect id={`spec-content-product-${field.id}`} className="w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm" disabled={!selectedSupplierId || mutation.isPending} aria-invalid={Boolean(productError)} {...form.register(`kitContents.${index}.supplierProductId`)} onChange={event => form.setValue(`kitContents.${index}.supplierProductId`, event.target.value, { shouldDirty: true, shouldValidate: true })}><option value=""><CustomerText message="m_563f8e6fa1a3" /></option>{unavailableProduct && previousContent ? <option value={selectedId}>{previousContent.productNumber} · {previousContent.productDescription} <CustomerText message="m_334558585eea" /></option> : null}{selectedSupplier?.products.map(product => <option key={product.id} value={product.id}>{product.productNumber} · {product.description} ({product.productTypeName}{product.kind === 'ShippingContainer' ? __customerText('m_c08eb4c538fc', { p0: String(product.tubeCapacity ?? 'capacity unset') }) : ''})</option>)}</NativeSelect>{productError ? <p role="alert" className="text-xs text-destructive">{productError}</p> : unavailableProduct ? <p className="text-xs text-amber-700 dark:text-amber-400"><CustomerText message="m_a3696f7957df" /></p> : unitWarning ? <p className="text-xs text-amber-700 dark:text-amber-400"><CustomerText message="m_6dc624e5d1c3" /></p> : capacityWarning ? <p className="text-xs text-amber-700 dark:text-amber-400"><CustomerText message="m_fd6c1b5d9f48" />{usableTubeCapacity} <CustomerText message="m_715a6eb4b3f3" /></p> : null}</div>
            <div><Label htmlFor={`spec-content-quantity-${field.id}`} className="mb-1 block text-xs sm:sr-only"><RequiredFieldName><CustomerText message="m_822bab8d41bc" /></RequiredFieldName></Label><Input id={`spec-content-quantity-${field.id}`} type="number" min={1} step={1} disabled={mutation.isPending} aria-invalid={Boolean(quantityError)} {...form.register(`kitContents.${index}.quantity`)} onChange={event => form.setValue(`kitContents.${index}.quantity`, event.target.value, { shouldDirty: true, shouldValidate: true })} />{quantityError ? <p role="alert" className="text-xs text-destructive">{quantityError}</p> : null}</div>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => contents.remove(index)} aria-label={__customerText('m_e818d37a4f08', { p0: String(index + 1) })}><CustomerText message="m_c3812fc4acb8" /></Button>
          </div>
        })}
        {errors.kitContents?.message ? <p role="alert" className="text-sm text-destructive">{<CustomerSourceText source={errors.kitContents.message} />}</p> : null}
        </div> : null}
      </section>
      {catalog.isPending ? <p role="status"><CustomerText message="m_843f09474237" /></p> : null}
      {catalog.isError ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_029e69472c1c" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(catalog.error, 'Try loading the supplier catalog again.')} />}<Button type="button" variant="outline" disabled={catalog.isFetching || mutation.isPending} onClick={() => void catalog.refetch()}><CustomerText message="m_9bdd1d300f9e" /></Button></AlertDescription></Alert> : null}
      <ContainerField id="kit-temperature-control" label={__customerText('m_4ab06269eb93')} error={errors.temperatureControlInstructions?.message} help="Describe the approved cooling method for one complete kit, including when no cooling is needed.">
        <Textarea id="kit-temperature-control" rows={3} disabled={mutation.isPending} {...form.register('temperatureControlInstructions')} />
      </ContainerField>
      <div className="grid gap-3 sm:grid-cols-2">
        <ContainerField id="kit-dry-ice-quantity" label={__customerText('m_7d93e011228c')} error={errors.dryIceQuantity?.message} help="Leave empty when this kit does not use dry ice." alignWithAdjacentField helpBelow>
          <Input id="kit-dry-ice-quantity" type="number" min="0" step="any" disabled={mutation.isPending} aria-invalid={Boolean(errors.dryIceQuantity)} aria-describedby={fieldHelpIds('kit-dry-ice-quantity', 'Leave empty when this kit does not use dry ice.', errors.dryIceQuantity?.message)} {...form.register('dryIceQuantity')} />
        </ContainerField>
        <ContainerField id="kit-dry-ice-unit" label={__customerText('m_4d1dfabd5b36')} error={errors.dryIceUnit?.message} alignWithAdjacentField helpBelow>
          <Input id="kit-dry-ice-unit" placeholder="e.g. kg" disabled={mutation.isPending} aria-invalid={Boolean(errors.dryIceUnit)} aria-describedby={fieldHelpIds('kit-dry-ice-unit', undefined, errors.dryIceUnit?.message)} {...form.register('dryIceUnit')} />
        </ContainerField>
      </div>
      <section aria-labelledby="container-availability-heading" className="space-y-3 border-t pt-4">
        <h3 id="container-availability-heading" className="text-sm font-medium"><CustomerText message="m_12f67f8539c4" /></h3>
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{input('effectiveFrom', 'Effective from', 'datetime-local', true)}{input('effectiveTo', 'Effective through', 'datetime-local')}</div>
        <p className="text-sm text-muted-foreground"><CustomerText message="m_025fcc72d190" /></p>
      </section>
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="submit" form="shipping-container-editor" disabled={mutation.isPending}>{mutation.isPending ? <CustomerSourceText source={"Saving…"} /> : source?.lifecycle === 'Draft' ? "Save Draft" : __customerText('m_0f3960b0d6d6')}</Button></RequiredDialogFooter>
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
