import { usePreparedMaterialDefinitions } from '#/api/lab-materials'
import { useQuery } from '@tanstack/react-query'
import type { UseFormReturn } from 'react-hook-form'
import { api } from '#/api/client'
import type { CatalogSupplier } from '#/api/supplier-catalog'
import { listMasterMixWorkflows, masterMixWorkflowsKey } from '#/api/lab-master-mix'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { PreparationField } from './preparation-ui'
import type { ProtocolDefinitionFormValues } from './protocol-definition'

export function MaterialConfigurationField({ form, index, captureIndex }: { form: UseFormReturn<ProtocolDefinitionFormValues>; index: number; captureIndex: number }) {
  const catalog = useQuery({ queryKey: ['lab-step-material-products'], queryFn: async () => (await api.get<{ data: CatalogSupplier[] }>('/platform/lab-operations/steps/material-products')).data.data })
  const definitions = usePreparedMaterialDefinitions()
  const masterMix = form.watch(`steps.${index}.processType`) === 'masterMix'
  const suppliers = (catalog.data ?? []).map(supplier => ({ ...supplier, products: supplier.products.filter(product => !masterMix || product.isActive && product.productTypeIsActive && product.productTypeId === '90000000-0000-4000-8000-000000000003') })).filter(supplier => supplier.products.length)
  const path = `steps.${index}.captures.${captureIndex}.material` as const
  const material = form.watch(path)
  const error = form.formState.errors.steps?.[index]?.captures?.[captureIndex]?.material
  const products = suppliers.flatMap(s => s.products.map(p => ({ ...p, vendor: s.name })))
  const id = `material-${index}-${captureIndex}`
  return <div className="space-y-3 rounded-md border p-3">
    <PreparationField id={id} label={masterMix ? "Configured reagent" : "Configured material"} required error={error?.message}>
      <NativeSelect id={id} value={material?.masterMixWorkflowId ? `mix:${material.masterMixWorkflowId}:${material.masterMixWorkflowRevision}` : material?.productId ?? material?.materialDefinitionId ?? (material ? 'manual' : '')} onChange={e => {
        const product = products.find(p => p.id === e.target.value)
        const definition = definitions.data?.find(d => d.id === e.target.value)
        form.setValue(path, product ? { productId: product.id, supplierId: product.supplierId, name: product.description, vendor: product.vendor, productNumber: product.productNumber } : definition ? { materialDefinitionId: definition.id, name: definition.name } : e.target.value === 'manual' ? { name: '', vendor: '' } : undefined, { shouldDirty: true, shouldValidate: true })
        if (masterMix && product?.defaultQuantityUnit) form.setValue(`steps.${index}.captures.${captureIndex}.unit`, product.defaultQuantityUnit, { shouldDirty: true, shouldValidate: true })
      }}><option value="">{masterMix ? 'Choose reagent…' : 'Choose product or prepared reagent…'}</option>{material?.productId && !products.some(p => p.id === material.productId) ? <option disabled={masterMix} value={material.productId}>{material.vendor} · {material.name} · {material.productNumber} (saved selection)</option> : null}{suppliers.map(s => <optgroup key={s.id} label={s.name}>{s.products.map(p => <option key={p.id} value={p.id}>{p.description} · {p.productNumber}</option>)}</optgroup>)}{material?.materialDefinitionId && !definitions.data?.some(d => d.id === material.materialDefinitionId) ? <option value={material.materialDefinitionId}>{material.name} (saved prepared reagent)</option> : null}<optgroup label="Internally prepared reagents">{definitions.data?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup>{!masterMix ? <option value="manual">Define material manually</option> : null}</NativeSelect>
    </PreparationField>
    {catalog.isPending ? <p role="status" className="text-xs text-muted-foreground">Loading products…</p> : null}
    {catalog.isError ? <p role="alert" className="text-sm text-destructive">The product catalog could not be loaded. Refresh and try again.</p> : null}
    {definitions.isPending ? <p role="status" className="text-xs text-muted-foreground">Loading prepared reagents…</p> : definitions.isError ? <p role="alert" className="text-sm text-destructive">Prepared-reagent definitions could not be loaded.</p> : null}
    {material?.materialDefinitionId ? <p className="text-sm">Prepared reagent: {material.name}</p> : material?.productId ? <p className="text-sm">{material.vendor} · {material.name} · {material.productNumber}</p> : material && !masterMix ? <div className="grid gap-3 sm:grid-cols-2">
      <PreparationField id={`${id}-name`} label="Material name" required error={error?.name?.message}><Input id={`${id}-name`} maxLength={1000} {...form.register(`${path}.name`)} /></PreparationField>
      <PreparationField id={`${id}-vendor`} label="Vendor (optional)" error={error?.vendor?.message}><Input id={`${id}-vendor`} maxLength={255} {...form.register(`${path}.vendor`)} /></PreparationField>
    </div> : null}
    <p className="text-xs text-muted-foreground">{masterMix ? 'The step fixes the reagent and planned amount. Every preparation requires its actual lot number and amount used.' : 'This material is fixed by the configuration. The operator records its actual quantity and matching lot when lot tracking is enabled. Manual materials do not support lot tracking.'}</p>
  </div>
}

export function MasterMixConfigurationField({ form, index, captureIndex }: { form: UseFormReturn<ProtocolDefinitionFormValues>; index: number; captureIndex: number }) {
  const mixes = useQuery({ queryKey: masterMixWorkflowsKey, queryFn: listMasterMixWorkflows })
  const path = `steps.${index}.captures.${captureIndex}.material` as const
  const material = form.watch(path)
  const error = form.formState.errors.steps?.[index]?.captures?.[captureIndex]?.material
  const choices = (mixes.data ?? []).filter(workflow => workflow.status !== 'Retired').flatMap(workflow => workflow.revisions.filter(revision => revision.status === 'Approved').map(revision => ({ id: workflow.id, ...revision })))
  const selected = material?.masterMixWorkflowId ? `mix:${material.masterMixWorkflowId}:${material.masterMixWorkflowRevision}` : ''
  const id = `master-mix-${index}-${captureIndex}`
  return <div className="space-y-3 rounded-md border p-3">
    <PreparationField id={id} label="Approved master mix" required error={error?.message}>
      <NativeSelect id={id} value={selected} onChange={event => {
        const mix = choices.find(item => `mix:${item.id}:${item.revision}` === event.target.value)
        form.setValue(path, mix ? { masterMixWorkflowId: mix.id, masterMixWorkflowRevision: mix.revision, name: mix.name } : undefined, { shouldDirty: true, shouldValidate: true })
        form.setValue(`steps.${index}.captures.${captureIndex}.unit`, mix?.quantityUnit ?? '', { shouldDirty: true, shouldValidate: true })
        form.setValue(`steps.${index}.captures.${captureIndex}.includeTracking`, false, { shouldDirty: true, shouldValidate: true })
      }}>
        <option value="">Choose an approved master-mix revision…</option>
        {selected && !choices.some(item => `mix:${item.id}:${item.revision}` === selected) ? <option value={selected} disabled>{material?.name} · revision {material?.masterMixWorkflowRevision} (saved selection)</option> : null}
        {choices.map(mix => <option key={`${mix.id}:${mix.revision}`} value={`mix:${mix.id}:${mix.revision}`}>{mix.name} · revision {mix.revision} · {mix.quantityUnit}</option>)}
      </NativeSelect>
    </PreparationField>
    {mixes.isPending ? <p role="status" className="text-xs text-muted-foreground">Loading master-mix workflows…</p> : mixes.isError ? <p role="alert" className="text-sm text-destructive">Master-mix workflows could not be loaded. Refresh and try again.</p> : !choices.length ? <p className="text-sm text-muted-foreground">Approve a workflow in Lab settings → Workflows → Master mix before selecting it here.</p> : null}
    <p className="text-xs text-muted-foreground">During library preparation, select a matching Ready mix, scan its container barcode and record the actual amount added. POMS links the specimen's library tray to that preparation and deducts the amount used from its shared balance.</p>
  </div>
}
