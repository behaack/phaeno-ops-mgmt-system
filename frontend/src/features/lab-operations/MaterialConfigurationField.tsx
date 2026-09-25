import { usePreparedMaterialDefinitions } from '#/api/lab-materials'
import { useQuery } from '@tanstack/react-query'
import type { UseFormReturn } from 'react-hook-form'
import { api } from '#/api/client'
import type { CatalogSupplier } from '#/api/supplier-catalog'
import { listMasterMixWorkflows, masterMixWorkflowsKey } from '#/api/lab-master-mix'
import { Input } from '#/components/ui/input'
import { PreparationField, prepSelectClass } from './preparation-ui'
import type { ProtocolDefinitionFormValues } from './protocol-definition'

export function MaterialConfigurationField({ form, index, captureIndex }: { form: UseFormReturn<ProtocolDefinitionFormValues>; index: number; captureIndex: number }) {
  const catalog = useQuery({ queryKey: ['lab-step-material-products'], queryFn: async () => (await api.get<{ data: CatalogSupplier[] }>('/platform/lab-operations/steps/material-products')).data.data })
  const definitions = usePreparedMaterialDefinitions()
  const mixes = useQuery({ queryKey: masterMixWorkflowsKey, queryFn: listMasterMixWorkflows })
  const path = `steps.${index}.captures.${captureIndex}.material` as const
  const material = form.watch(path)
  const error = form.formState.errors.steps?.[index]?.captures?.[captureIndex]?.material
  const products = (catalog.data ?? []).flatMap(s => s.products.map(p => ({ ...p, vendor: s.name })))
  const id = `material-${index}-${captureIndex}`
  return <div className="space-y-3 rounded-md border p-3">
    <PreparationField id={id} label="Configured material" required error={error?.message}>
      <select id={id} className={prepSelectClass} value={material?.masterMixWorkflowId ? `mix:${material.masterMixWorkflowId}:${material.masterMixWorkflowRevision}` : material?.productId ?? material?.materialDefinitionId ?? (material ? 'manual' : '')} onChange={e => {
        const product = products.find(p => p.id === e.target.value)
        const definition = definitions.data?.find(d => d.id === e.target.value)
        const mix = mixes.data?.find(item => `mix:${item.id}:${item.revision}` === e.target.value && item.status === 'Approved')
        form.setValue(path, mix ? { masterMixWorkflowId: mix.id, masterMixWorkflowRevision: mix.revision, name: mix.name } : product ? { productId: product.id, supplierId: product.supplierId, name: product.description, vendor: product.vendor, productNumber: product.productNumber } : definition ? { materialDefinitionId: definition.id, name: definition.name } : e.target.value === 'manual' ? { name: '', vendor: '' } : undefined, { shouldDirty: true, shouldValidate: true })
        if (mix) {
          form.setValue(`steps.${index}.captures.${captureIndex}.unit`, mix.quantityUnit, { shouldDirty: true, shouldValidate: true })
          form.setValue(`steps.${index}.captures.${captureIndex}.includeTracking`, false, { shouldDirty: true, shouldValidate: true })
        }
      }}><option value="">Choose product, prepared reagent, or master mix…</option>{material?.productId && !products.some(p => p.id === material.productId) ? <option value={material.productId}>{material.vendor} · {material.name} · {material.productNumber} (saved selection)</option> : null}{(catalog.data ?? []).map(s => <optgroup key={s.id} label={s.name}>{s.products.map(p => <option key={p.id} value={p.id}>{p.description} · {p.productNumber}</option>)}</optgroup>)}{material?.materialDefinitionId && !definitions.data?.some(d => d.id === material.materialDefinitionId) ? <option value={material.materialDefinitionId}>{material.name} (saved prepared reagent)</option> : null}<optgroup label="Internally prepared reagents">{definitions.data?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup>{material?.masterMixWorkflowId && !mixes.data?.some(item => item.id === material.masterMixWorkflowId && item.revision === material.masterMixWorkflowRevision && item.status === 'Approved') ? <option value={`mix:${material.masterMixWorkflowId}:${material.masterMixWorkflowRevision}`}>{material.name} · revision {material.masterMixWorkflowRevision} (saved selection)</option> : null}<optgroup label="Single-use master mixes">{mixes.data?.filter(item => item.status === 'Approved').map(item => <option key={item.id} value={`mix:${item.id}:${item.revision}`}>{item.name} · revision {item.revision} · {item.quantityUnit}</option>)}</optgroup><option value="manual">Define material manually (no shared preparation)</option></select>
    </PreparationField>
    {catalog.isPending ? <p role="status" className="text-xs text-muted-foreground">Loading products…</p> : null}
    {catalog.isError ? <p role="alert" className="text-sm text-destructive">The product catalog could not be loaded. Refresh after the application is updated, or define the material manually.</p> : null}
    {definitions.isPending ? <p role="status" className="text-xs text-muted-foreground">Loading prepared reagents…</p> : definitions.isError ? <p role="alert" className="text-sm text-destructive">Prepared-reagent definitions could not be loaded.</p> : null}
    {mixes.isPending ? <p role="status" className="text-xs text-muted-foreground">Loading master-mix workflows…</p> : mixes.isError ? <p role="alert" className="text-sm text-destructive">Master-mix workflows could not be loaded.</p> : null}
    {material?.masterMixWorkflowId ? <p className="text-sm">Master mix: {material.name}, approved workflow revision {material.masterMixWorkflowRevision}. Operators select one prepared mix shared across trays; no inventory lot is created.</p> : material?.materialDefinitionId ? <p className="text-sm">Prepared reagent: {material.name}</p> : material?.productId ? <p className="text-sm">{material.vendor} · {material.name} · {material.productNumber}</p> : material ? <div className="grid gap-3 sm:grid-cols-2">
      <PreparationField id={`${id}-name`} label="Material name" required error={error?.name?.message}><Input id={`${id}-name`} maxLength={1000} {...form.register(`${path}.name`)} /></PreparationField>
      <PreparationField id={`${id}-vendor`} label="Vendor (optional)" error={error?.vendor?.message}><Input id={`${id}-vendor`} maxLength={255} {...form.register(`${path}.vendor`)} /></PreparationField>
    </div> : null}
    <p className="text-xs text-muted-foreground">This material is fixed by the configuration. The operator records the quantity and selects its matching lot or shared master-mix preparation when configured. Manual materials do not support lot tracking.</p>
  </div>
}
