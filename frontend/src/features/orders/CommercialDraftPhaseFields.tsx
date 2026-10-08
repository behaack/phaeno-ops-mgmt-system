import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { CommercialDraftPricingFields } from './CommercialDraftPricingFields'
import { Field, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { RequiredFieldName } from '#/components/ui/required-field'
import { Label } from '#/components/ui/label'
import { phaseTotals, type CommercialDraftForm } from './commercial-draft'

export function CommercialDraftPhaseFields({ index, form, phased, actions }: { index: number; form: UseFormReturn<CommercialDraftForm>; phased: boolean; actions: ReactNode }) {
  const sources = useFieldArray({ control: form.control, name: `phases.${index}.sources` })
  const phase = form.watch(`phases.${index}`)
  const totals = phaseTotals(phase)
  const numberOrNull = (value: string | number | null | undefined) => value == null || value === '' ? null : Number(value)
  return <Card role="group" aria-labelledby={`draft-phase-heading-${index}`}><CardHeader className="flex flex-row items-start justify-between gap-3"><CardTitle id={`draft-phase-heading-${index}`}>{phased ? `Phase ${index + 1}` : 'Samples and pricing'}</CardTitle>{actions}</CardHeader><CardContent className="space-y-4">
    {phased ? <div><Label htmlFor={`draft-phase-${index}-name`}><RequiredFieldName>Phase name</RequiredFieldName> · required for pricing</Label><Input id={`draft-phase-${index}-name`} aria-invalid={Boolean(form.formState.errors.phases?.[index]?.name)} aria-describedby={`draft-phase-${index}-name-error`} className="mt-2" {...form.register(`phases.${index}.name`)} /><FieldError id={`draft-phase-${index}-name-error`}>{form.formState.errors.phases?.[index]?.name?.message}</FieldError></div> : null}
    <fieldset aria-labelledby={`draft-sources-heading-${index}`} className="min-w-0 space-y-3">
      <legend className="flex w-full items-center justify-between gap-3 text-sm font-medium"><span id={`draft-sources-heading-${index}`}>Biological-source composition</span><Button type="button" variant="outline" size="sm" disabled={sources.fields.length >= 100} onClick={() => sources.append({ biologicalSource: '', specimenCount: 1 })}>Add source</Button></legend>
      <div className="grid grid-cols-[minmax(0,1fr)_5rem_2rem] gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_8rem_2rem]">
        <Label id={`draft-source-column-${index}`} htmlFor={`draft-source-${index}-0`}><RequiredFieldName>Biological source</RequiredFieldName></Label>
        <Label id={`draft-count-column-${index}`} htmlFor={`draft-count-${index}-0`}><RequiredFieldName>Samples</RequiredFieldName></Label>
        <span aria-hidden="true" />
        {sources.fields.map((source, sourceIndex) => <div key={source.id} className="col-span-full grid grid-cols-subgrid items-start gap-x-3">
          <Field><Input id={`draft-source-${index}-${sourceIndex}`} aria-labelledby={`draft-source-column-${index}`} aria-required="true" aria-invalid={Boolean(form.formState.errors.phases?.[index]?.sources?.[sourceIndex]?.biologicalSource)} aria-describedby={`draft-source-${index}-${sourceIndex}-error`} {...form.register(`phases.${index}.sources.${sourceIndex}.biologicalSource`)} placeholder="Human PBMCs, mouse liver…" /><FieldError id={`draft-source-${index}-${sourceIndex}-error`}>{form.formState.errors.phases?.[index]?.sources?.[sourceIndex]?.biologicalSource?.message}</FieldError></Field>
          <Field><Input id={`draft-count-${index}-${sourceIndex}`} aria-labelledby={`draft-count-column-${index}`} aria-required="true" aria-invalid={Boolean(form.formState.errors.phases?.[index]?.sources?.[sourceIndex]?.specimenCount)} aria-describedby={`draft-count-${index}-${sourceIndex}-error`} type="number" min={0} max={10000} {...form.register(`phases.${index}.sources.${sourceIndex}.specimenCount`, { setValueAs: value => Number(value) || 0 })} /><FieldError id={`draft-count-${index}-${sourceIndex}-error`}>{form.formState.errors.phases?.[index]?.sources?.[sourceIndex]?.specimenCount?.message}</FieldError></Field>
          <Button type="button" variant="outline" size="icon" disabled={sources.fields.length === 1} onClick={() => sources.remove(sourceIndex)} aria-label={`Remove biological source ${sourceIndex + 1} from ${phased ? `Phase ${index + 1}` : 'order'}`} title={`Remove biological source ${sourceIndex + 1}`}><Trash2 aria-hidden="true" /></Button>
        </div>)}
      </div>
    </fieldset>
    <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor={`draft-runs-${index}`}><RequiredFieldName>Sequencing runs per sample</RequiredFieldName> · required for pricing</Label><Input id={`draft-runs-${index}`} aria-invalid={Boolean(form.formState.errors.phases?.[index]?.runsPerSample)} aria-describedby={`draft-runs-${index}-error`} type="number" min={1} max={10000} className="mt-2" {...form.register(`phases.${index}.runsPerSample`, { setValueAs: numberOrNull })} /><FieldError id={`draft-runs-${index}-error`}>{form.formState.errors.phases?.[index]?.runsPerSample?.message}</FieldError></div><div><Label htmlFor={`draft-tat-${index}`}>Turnaround expectation (business days, optional)</Label><Input id={`draft-tat-${index}`} aria-invalid={Boolean(form.formState.errors.phases?.[index]?.turnaroundBusinessDays)} aria-describedby={`draft-tat-${index}-error`} type="number" min={1} max={365} className="mt-2" {...form.register(`phases.${index}.turnaroundBusinessDays`, { setValueAs: numberOrNull })} /><FieldError id={`draft-tat-${index}-error`}>{form.formState.errors.phases?.[index]?.turnaroundBusinessDays?.message}</FieldError></div></div>
    <p className="text-sm">{totals.samples} samples × {phase.runsPerSample ?? '—'} runs per sample = {totals.runs} sequencing runs</p>
    <CommercialDraftPricingFields index={index} form={form} phased={phased} />
  </CardContent></Card>
}
