import type { UseFormReturn } from 'react-hook-form'
import type { PreparationMember } from '#/api/lab-preparation'
import { Input } from '#/components/ui/input'
import { PreparationField, prepSelectClass } from './preparation-ui'
import { materialLotMatches } from './preparation-resource-fields'
import type { ResourceCatalog, ResourceField } from './preparation-resource-fields'
import type { StepTimingValues } from './step-performance'
import { exceedsDecimalQuantity, isPositiveDecimalQuantity, remainingDecimalQuantity } from './decimal-quantity'

export type StepEntryValues = { values: Record<string, string>; covered: string[]; outcome: 'recorded' | 'skipped'; operator: boolean; resources: boolean; timing: StepTimingValues }
export function PreparationResourceField({ field, form, catalog, member, count, defaults = false, correction = false, previous }: {
  field: ResourceField; form: UseFormReturn<StepEntryValues>; catalog: ResourceCatalog; member?: PreparationMember; count: number; defaults?: boolean; correction?: boolean; previous?: unknown
}) {
  const prefix = `${member?.id ?? 'shared'}_${field.key}`
  const values = form.watch('values')
  if (correction) return <div className="space-y-1 text-sm"><p className="font-medium">{field.label}</p><p>{previous ? String(previous) : 'Previously recorded resource use is retained.'}</p></div>
  if (field.type === 'biologicalMaterial') {
    const source = member?.sourceMaterial
    const destination = member?.libraryTube
    const unit = field.unit?.trim() || source?.quantityUnit?.trim()
    const amount = (values[`${prefix}_quantity`] ?? '').trim()
    const exhausted = values[`${prefix}_exhausted`] === 'yes'
    const additional = values[`${prefix}_additional`] === 'yes'
    const recordTransfer = !destination?.transferId || additional && !member?.output
    const required = field.required || additional
    const knownRemaining = source?.quantity !== null && source?.quantity !== undefined ? source.quantityText ?? String(source.quantity) : null
    const remaining = knownRemaining !== null && isPositiveDecimalQuantity(amount) && !exceedsDecimalQuantity(amount, knownRemaining)
      ? remainingDecimalQuantity(knownRemaining, amount) : null
    return <fieldset className="min-w-0 space-y-3 rounded-md border p-4"><legend className="px-1 text-sm font-medium">{field.label}</legend>
      <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Accessioned source tube</dt><dd className="break-all">{source?.barcode ?? member?.barcode ?? 'Unavailable'}</dd></div><div><dt className="text-muted-foreground">Library tube in {member?.position}</dt><dd className="break-all">{destination?.barcode ?? 'Not assigned'}</dd></div><div><dt className="text-muted-foreground">Source material remaining</dt><dd>{source?.status === 'Consumed' ? 'Exhausted' : knownRemaining === null ? 'Unknown' : `${knownRemaining} ${source?.quantityUnit ?? ''}`}</dd></div><div><dt className="text-muted-foreground">Preparation attempt</dt><dd>{member?.sequence}</dd></div></dl>
      {destination?.transferId ? <><p className="text-sm">A transfer into this library tube is already recorded. Saving again retains that transfer unless you record another physical withdrawal.</p>{!member?.output ? <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer" checked={additional} onChange={event => {
        form.setValue(`values.${prefix}_additional`, event.target.checked ? 'yes' : '', { shouldDirty: true })
        if (!event.target.checked) for (const part of ['sourceBarcode', 'barcode', 'quantity', 'unit', 'exhausted']) { form.setValue(`values.${prefix}_${part}`, ''); form.clearErrors(`values.${prefix}_${part}`) }
      }} />Record an additional physical transfer</label> : <p className="text-xs text-muted-foreground">Prepared yield has been recorded. Source material cannot be added to this library tube.</p>}</> : null}
      {recordTransfer ? <>
        {!destination ? <p role="status" className="text-sm">Close this step, select the tray position, and choose Assign library tube. Print a POMS label from the assigned tube’s detail page when needed.</p> : null}
        <PreparationField id={`${prefix}_sourceBarcode`} label="Scan accessioned source tube barcode" required={required} error={form.formState.errors.values?.[`${prefix}_sourceBarcode`]?.message}><Input id={`${prefix}_sourceBarcode`} autoComplete="off" spellCheck={false} maxLength={255} {...form.register(`values.${prefix}_sourceBarcode`)} /></PreparationField>
        <PreparationField id={`${prefix}_barcode`} label="Scan library tube barcode" required={required} error={form.formState.errors.values?.[`${prefix}_barcode`]?.message}><Input id={`${prefix}_barcode`} autoComplete="off" spellCheck={false} maxLength={255} {...form.register(`values.${prefix}_barcode`)} /></PreparationField>
        <div className={`grid gap-3 ${unit ? '' : 'sm:grid-cols-2'}`}><PreparationField id={`${prefix}_quantity`} label={`Actual amount transferred${unit ? ` (${unit})` : ''}`} required={required} error={form.formState.errors.values?.[`${prefix}_quantity`]?.message}><Input id={`${prefix}_quantity`} type="text" inputMode="decimal" maxLength={40} {...form.register(`values.${prefix}_quantity`)} /></PreparationField>{!unit ? <PreparationField id={`${prefix}_unit`} label="Quantity unit" required={required} error={form.formState.errors.values?.[`${prefix}_unit`]?.message}><Input id={`${prefix}_unit`} maxLength={50} {...form.register(`values.${prefix}_unit`)} /></PreparationField> : form.formState.errors.values?.[`${prefix}_unit`]?.message ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.values[`${prefix}_unit`]?.message}</p> : null}</div>
        <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer" checked={exhausted} aria-describedby={`${prefix}_exhausted_help`} onChange={event => form.setValue(`values.${prefix}_exhausted`, event.target.checked ? 'yes' : '', { shouldDirty: true })} />Material exhausted (optional override)</label>
        <p id={`${prefix}_exhausted_help`} className="text-xs text-muted-foreground">Mark this when no usable source material remains, even if the recorded balance would be positive. The actual amount transferred is retained.</p>
        {exhausted ? <p className="text-sm">Source after transfer: exhausted.</p> : remaining !== null ? <p className="text-sm">Source after transfer: {remaining} {unit}.</p> : knownRemaining === null ? <p className="text-xs text-muted-foreground">The starting amount is unknown. Its numeric remainder will stay unknown.</p> : null}
      </> : null}
    </fieldset>
  }
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
      {field.type === 'material' && field.includeTracking ? <div className="space-y-1"><label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer" checked={values[`${prefix}_exhausted`] === 'yes'} aria-describedby={`${prefix}_lot_exhausted_help`} onChange={event => form.setValue(`values.${prefix}_exhausted`, event.target.checked ? 'yes' : '', { shouldDirty: true })} />Material exhausted (optional override)</label><p id={`${prefix}_lot_exhausted_help`} className="text-xs text-muted-foreground">Confirm that no usable material remains in this lot after all amounts recorded in this step. The actual amounts used stay unchanged; any remaining balance is recorded as an adjustment.</p>{form.formState.errors.values?.[`${prefix}_exhausted`]?.message ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.values[`${prefix}_exhausted`]?.message}</p> : null}</div> : null}
    </>}
    </div>
  </fieldset>
}
