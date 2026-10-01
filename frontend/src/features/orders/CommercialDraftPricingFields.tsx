import type { UseFormReturn } from 'react-hook-form'
import { Checkbox } from '#/components/ui/checkbox'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { phaseTotals, type CommercialDraftForm } from './commercial-draft'

export function CommercialDraftPricingFields({ index, form, phased }: { index: number; form: UseFormReturn<CommercialDraftForm>; phased: boolean }) {
  const phase = form.watch(`phases.${index}`)
  const totals = phaseTotals(phase)
  const errors = form.formState.errors.phases?.[index]
  const numberOrNull = (value: string | number | null | undefined) => value == null || value === '' ? null : Number(value)
  return <div className="space-y-3 rounded-md border p-3">
    <label className="flex cursor-pointer items-center gap-2"><Checkbox checked={phase.proposePrice} onCheckedChange={checked => {
      form.setValue(`phases.${index}.proposePrice`, checked === true, { shouldDirty: true })
      if (checked !== true) {
        form.setValue(`phases.${index}.proposedUnitPrice`, null, { shouldDirty: true })
        form.setValue(`phases.${index}.proposedAdditionalRunPrice`, null, { shouldDirty: true })
        form.setValue(`phases.${index}.pricingNote`, '', { shouldDirty: true })
      }
    }} /><span>Propose a price{phased ? ' for this phase' : ''}</span></label>
    {phase.proposePrice ? <>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Field><Label htmlFor={`draft-price-${index}`}><RequiredFieldName>Proposed price per sample (USD)</RequiredFieldName></Label>
          <Input id={`draft-price-${index}`} type="number" min={0.01} step="0.01" {...form.register(`phases.${index}.proposedUnitPrice`, { setValueAs: numberOrNull })} aria-invalid={Boolean(errors?.proposedUnitPrice)} aria-describedby={`draft-price-${index}-help draft-price-${index}-error`} />
          <p id={`draft-price-${index}-help`} className="text-xs text-muted-foreground">Includes one library preparation, one sequencing run and data assembly.</p>
          <FieldError id={`draft-price-${index}-error`}>{errors?.proposedUnitPrice?.message}</FieldError>
        </Field>
        {totals.additionalRuns > 0 ? <Field><Label htmlFor={`draft-extra-price-${index}`}><RequiredFieldName>Proposed price per additional run (USD)</RequiredFieldName></Label>
          <Input id={`draft-extra-price-${index}`} type="number" min={0.01} step="0.01" {...form.register(`phases.${index}.proposedAdditionalRunPrice`, { setValueAs: numberOrNull })} aria-invalid={Boolean(errors?.proposedAdditionalRunPrice)} aria-describedby={`draft-extra-price-${index}-help draft-extra-price-${index}-error`} />
          <p id={`draft-extra-price-${index}-help`} className="text-xs text-muted-foreground">Uses the existing prepared library; no additional library preparation.</p>
          <FieldError id={`draft-extra-price-${index}-error`}>{errors?.proposedAdditionalRunPrice?.message}</FieldError>
        </Field> : null}
      </div>
      <div aria-live="polite" className="text-sm"><p>{totals.samples} standard sample services{totals.standardSubtotal === null ? '' : ` · ${money(totals.standardSubtotal)}`}</p>
        {totals.additionalRuns > 0 ? <p>{totals.additionalRuns} additional runs{totals.additionalSubtotal === null ? '' : ` · ${money(totals.additionalSubtotal)}`}</p> : null}
        <p className="mt-1 font-semibold">Proposed subtotal: {totals.proposed === null ? 'Complete the prices and run count' : money(totals.proposed)}</p>
      </div>
      <Field><Label htmlFor={`draft-price-note-${index}`}>Pricing note (optional)</Label><Textarea id={`draft-price-note-${index}`} {...form.register(`phases.${index}.pricingNote`)} aria-invalid={Boolean(errors?.pricingNote)} aria-describedby={`draft-price-note-${index}-error`} /><FieldError id={`draft-price-note-${index}-error`}>{errors?.pricingNote?.message}</FieldError></Field>
    </> : null}
    <p className="text-xs text-muted-foreground">A proposed price is reviewed before Phaeno issues the Customer quote. Additional runs depend on remaining prepared-library material.</p>
  </div>
}
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
