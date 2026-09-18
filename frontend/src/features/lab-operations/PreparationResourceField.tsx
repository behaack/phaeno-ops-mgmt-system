import type { UseFormReturn } from 'react-hook-form'
import type { PreparationMember } from '#/api/lab-preparation'
import { Input } from '#/components/ui/input'
import { PreparationField, prepSelectClass } from './preparation-ui'
import { materialLotMatches } from './preparation-resource-fields'
import type { ResourceCatalog, ResourceField } from './preparation-resource-fields'

export type StepEntryValues = { values: Record<string, string>; covered: string[]; outcome: 'recorded' | 'skipped'; operator: boolean; resources: boolean }
export function PreparationResourceField({ field, form, catalog, member, count, defaults = false, correction = false, previous }: {
  field: ResourceField; form: UseFormReturn<StepEntryValues>; catalog: ResourceCatalog; member?: PreparationMember; count: number; defaults?: boolean; correction?: boolean; previous?: unknown
}) {
  const prefix = `${member?.id ?? 'shared'}_${field.key}`
  const values = form.watch('values')
  if (correction) return <div className="space-y-1 text-sm"><p className="font-medium">{field.label}</p><p>{previous ? String(previous) : 'Previously recorded resource use is retained.'}</p></div>
  if (field.type === 'output' && member?.output) return <div className="text-sm"><p className="font-medium">{field.label}</p><p>Existing output: {member.output.barcode} · {member.output.quantity} {member.output.quantityUnit}</p></div>
  const material = field.material
  const lots = catalog.materialLots.filter(l => materialLotMatches(field, l))
  const exception = field.type === 'material' && field.scope === 'shared' && Boolean(member)
  const lot = lots.find(l => l.id === values[`${exception ? 'shared_' + field.key : prefix}_resource`])
  const quantityUnit = field.type === 'material' ? field.unit?.trim() || lot?.quantityUnit : undefined
  const fixedUnit = Boolean(quantityUnit) || field.type === 'material' && field.includeTracking
  const quantityLabel = field.type === 'material' && ['batch', 'shared'].includes(field.scope ?? '') && !member && field.quantityBasis !== 'total' ? 'Quantity per sample' : 'Quantity'
  const input = (part: string, label: string, required = field.required && !defaults, type = 'text', maxLength = 160) => <PreparationField id={`${prefix}_${part}`} label={label} required={required} error={form.formState.errors.values?.[`${prefix}_${part}`]?.message}>
    <Input id={`${prefix}_${part}`} type={type} step={type === 'number' ? 'any' : undefined} maxLength={maxLength} placeholder={field.type === 'output' && member ? `Use batch entry${values[`shared_${field.key}_${part}`] ? `: ${values[`shared_${field.key}_${part}`]}` : ''}` : undefined} {...form.register(`values.${prefix}_${part}`)} />
  </PreparationField>
  if (exception) return <fieldset className="min-w-0 space-y-3 rounded-md border p-4"><legend className="px-1 text-sm font-medium">{field.label}</legend>
    <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={values[`${prefix}_exception`] === 'yes'} onChange={e => {
      form.setValue(`values.${prefix}_exception`, e.target.checked ? 'yes' : '')
      if (!e.target.checked) for (const part of ['quantity', 'unknown', 'reason', 'disposition']) { form.setValue(`values.${prefix}_${part}`, ''); form.clearErrors(`values.${prefix}_${part}`) }
    }} />Record a different amount for this sample</label>
    {values[`${prefix}_exception`] === 'yes' ? <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Uses the batch material, lot and unit. This entry replaces this sample’s share of the batch amount.</p>
      <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={values[`${prefix}_unknown`] === 'yes'} onChange={e => {
        form.setValue(`values.${prefix}_unknown`, e.target.checked ? 'yes' : '')
        if (e.target.checked) { form.setValue(`values.${prefix}_quantity`, ''); if (values[`${prefix}_disposition`] === 'continue') form.setValue(`values.${prefix}_disposition`, '') }
      }} />Amount unknown</label>
      {values[`${prefix}_unknown`] !== 'yes' ? input('quantity', `Actual quantity${quantityUnit ? ` (${quantityUnit})` : ''}`, true, 'number') : <p className="text-xs text-muted-foreground">Record no guessed amount. Hold or fail this tube.{field.includeTracking ? ' The lot will be unavailable until its remaining quantity is reconciled.' : ''}</p>}
      <PreparationField id={`${prefix}_reason`} label="Material exception reason" required error={form.formState.errors.values?.[`${prefix}_reason`]?.message}><textarea id={`${prefix}_reason`} maxLength={2000} className={`${prepSelectClass} min-h-20 py-2`} {...form.register(`values.${prefix}_reason`)} /></PreparationField>
      <PreparationField id={`${prefix}_disposition`} label="Tube outcome" required error={form.formState.errors.values?.[`${prefix}_disposition`]?.message}><select id={`${prefix}_disposition`} className={prepSelectClass} {...form.register(`values.${prefix}_disposition`)}><option value="">Choose…</option>{values[`${prefix}_unknown`] !== 'yes' ? <option value="continue">Continue — permitted variation</option> : null}<option value="hold">Hold for review</option><option value="fail">Close attempt as failed</option></select></PreparationField>
      <p className="text-xs text-muted-foreground">Saving the step retains material use and applies this outcome. If several materials have exceptions, failure takes precedence over hold.</p>
    </div> : null}
  </fieldset>
  return <fieldset className="min-w-0 rounded-md border p-4"><legend className="px-1 text-sm font-medium">{field.label}{defaults ? ' · Common output values (optional)' : ''}</legend>
    <div className="grid gap-4">
    {field.type === 'material' ? <div className="space-y-1 text-sm leading-relaxed"><p className="font-medium">{material?.name || field.label}</p>{material?.vendor ? <p>Vendor: {material.vendor}</p> : null}{material?.productNumber ? <p>Product: {material.productNumber}</p> : null}</div> : null}
    {field.type === 'equipment' || field.includeTracking ? <PreparationField id={`${prefix}_resource`} label={field.type === 'material' ? 'Lot number' : 'Equipment used'} required={field.type === 'equipment' || field.required} error={form.formState.errors.values?.[`${prefix}_resource`]?.message}>
      <select id={`${prefix}_resource`} className={prepSelectClass} {...form.register(`values.${prefix}_resource`)}><option value="">Choose…</option>{field.type === 'material' ? lots.map(l => <option key={l.id} value={l.id}>{l.name} · {l.lotNumber} · {l.availableQuantity} {l.quantityUnit}</option>) : catalog.equipment.map(e => <option key={e.id} value={e.id}>{e.name} · {e.assetCode}</option>)}</select>
      {field.type === 'material' ? <p className="text-xs text-muted-foreground">{lots.length ? 'Only matching, released lots with available stock are offered. Saving records stock use.' : 'No matching eligible lots are available. Check Materials for product assignment, matching units, QC, expiry and available stock.'}</p> : null}
    </PreparationField> : null}
    {field.type === 'equipment' ? input('run', 'Run reference (optional)', false, 'text', 1000) : <>
      <div className={`grid gap-3 ${fixedUnit ? '' : 'sm:grid-cols-2'}`}>{input('quantity', quantityUnit ? `${quantityLabel} (${quantityUnit})` : quantityLabel, field.required && !defaults, 'number')}{!fixedUnit ? input('unit', 'Quantity unit', field.required && !defaults, 'text', 50) : null}</div>
      {field.type === 'output' ? input('location', 'Storage location', field.required && !defaults, 'text', 255) : ['batch', 'shared'].includes(field.scope ?? '') && !member && field.quantityBasis !== 'total' && Number(values[`${prefix}_quantity`]) > 0 ? <p className="text-xs text-muted-foreground">{values[`${prefix}_quantity`]} × {count} {count === 1 ? 'sample' : 'samples'}{field.scope === 'shared' ? ' using the batch amount' : ''} = {Number(values[`${prefix}_quantity`]) * count} {quantityUnit || values[`${prefix}_unit`]}{field.scope === 'shared' ? ' subtotal; sample exceptions are additional.' : ' total'}</p> : null}
    </>}
    </div>
  </fieldset>
}
