import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useId, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { addLabSample, getLabOrder, getOrderErrorMessage, type LabServiceOrder } from '#/api/order-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { normalizeBiologicalSource } from './sample-source-capacity'

const blankRow = () => ({ customerSampleId: '', tubeCount: '1', sequencingRunCount: '1' })
const schema = z.object({ rows: z.array(z.object({ customerSampleId: z.string().trim().max(255), tubeCount: z.string(), sequencingRunCount: z.string() })) })
type Values = z.infer<typeof schema>
const hasDraft = (row: Partial<Values['rows'][number]> | undefined) => Boolean(row?.customerSampleId || (row?.tubeCount !== undefined && row.tubeCount !== '1') || (row?.sequencingRunCount !== undefined && row.sequencingRunCount !== '1'))
const normalizedId = (value: string) => value.trim().toUpperCase()

export function SampleIdentificationRows({ order, source, expectedCount, savedCount, disabled, onDirtyChange, onBusyChange, onSaved }: {
  order: LabServiceOrder
  source: string
  expectedCount: number
  savedCount: number
  disabled: boolean
  onDirtyChange: (dirty: boolean) => void
  onBusyChange: (busy: boolean) => void
  onSaved: (order: LabServiceOrder) => Promise<void>
}) {
  const __customerText = useCustomerText()

  const { authProvider } = usePhaenoSession()
  const oneRunPerSample = (order.requestedSequencingRunCount ?? order.requestedSpecimenCount) === order.requestedSpecimenCount
  const remaining = Math.max(0, expectedCount - savedCount)
  const capacity = Math.min(remaining, Math.max(0, order.requestedSpecimenCount - order.samples.length))
  const busy = useRef(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { rows: Array.from({ length: remaining }, blankRow) } })
  const drafts = useWatch({ control: form.control, name: 'rows' }) ?? []
  const lastEnteredIndex = drafts.reduce((last, row, index) => hasDraft(row) ? index : last, -1)
  const rowCount = Math.max(remaining, lastEnteredIndex + 1)
  const entered = drafts.filter(row => row?.customerSampleId?.trim()).length
  const prefix = useId()
  const save = useMutation({
    mutationFn: async (values: Values) => {
      let current = order
      let failure: unknown
      const savedIndexes = new Set<number>()
      const knownSamples = new Set(order.samples.map(sample => sample.id))
      try {
        for (const [index, row] of values.rows.entries()) {
          if (!row.customerSampleId) continue
          current = await addLabSample(order.id, { customerSampleId: row.customerSampleId, biologicalSource: source,
            tubeCount: Number(row.tubeCount), sequencingRunCount: oneRunPerSample ? 1 : Number(row.sequencingRunCount), orderVersion: current.version })
          savedIndexes.add(index)
        }
      } catch (error) {
        failure = error
        // A lost response may still have saved a sample. Reconcile before offering a retry.
        try { current = await getLabOrder(order.id) } catch { /* Retain confirmed saves and all unconfirmed entries. */ }
        values.rows.forEach((row, index) => {
          if (current.samples.some(sample => !knownSamples.has(sample.id)
            && normalizedId(sample.customerSampleId) === normalizedId(row.customerSampleId)
            && normalizeBiologicalSource(sample.biologicalSource) === normalizeBiologicalSource(source)
            && sample.quantity === Number(row.tubeCount) && (sample.sequencingRunCount ?? 1) === Number(row.sequencingRunCount))) savedIndexes.add(index)
        })
      }
      const retained = values.rows.filter((row, index) => !savedIndexes.has(index) && hasDraft(row))
      const currentSource = current.sourceGroups.find(group => normalizeBiologicalSource(group.biologicalSource) === normalizeBiologicalSource(source))
      const slots = Math.max(0, (currentSource?.specimenCount ?? expectedCount)
        - current.samples.filter(sample => normalizeBiologicalSource(sample.biologicalSource) === normalizeBiologicalSource(source)).length)
      form.reset({ rows: [...retained, ...Array.from({ length: Math.max(0, slots - retained.length) }, blankRow)] })
      onDirtyChange(retained.length > 0)
      await onSaved(current)
      if (failure) throw failure
    },
    onSettled: () => { busy.current = false; onBusyChange(false) },
  })
  function submit(values: Values) {
    if (busy.current || disabled || authProvider === 'mock' || !order.canEditSamples) return
    const ids = new Set(order.samples.map(sample => normalizedId(sample.customerSampleId)))
    let invalid = false
    let firstError: `rows.${number}.customerSampleId` | `rows.${number}.tubeCount` | `rows.${number}.sequencingRunCount` | undefined
    for (const [index, row] of values.rows.entries()) {
      if (!row.customerSampleId) continue
      const duplicate = ids.has(normalizedId(row.customerSampleId))
      ids.add(normalizedId(row.customerSampleId))
      const invalidTubes = !/^\d+$/.test(row.tubeCount) || !Number.isSafeInteger(Number(row.tubeCount)) || Number(row.tubeCount) < 1
      const invalidRuns = !/^\d+$/.test(row.sequencingRunCount) || Number(row.sequencingRunCount) < 1 || Number(row.sequencingRunCount) > 10000
      if (invalidRuns) {
        const key = `rows.${index}.sequencingRunCount` as const
        form.setError(key, { message: 'Enter a whole number from 1 to 10,000.' }); firstError ??= key; invalid = true
      }
      if (duplicate || invalidTubes) {
        const field = `rows.${index}.${duplicate ? 'customerSampleId' : 'tubeCount'}` as const
        form.setError(field, { message: duplicate ? 'Use a unique sample ID within this Job.' : 'Enter a whole number of at least one tube.' })
        firstError ??= field
        invalid = true
      }
    }
    if (firstError) form.setFocus(firstError)
    if (invalid || !entered || entered > capacity) return
    busy.current = true
    onBusyChange(true)
    save.mutate(values)
  }
  if (!rowCount) return null
  return <form aria-label={__customerText('m_43fa3442e6ec', { p0: String(source) })} noValidate className="space-y-3 px-3 py-3"
    onChange={() => onDirtyChange(form.getValues('rows').some(hasDraft))} onSubmit={form.handleSubmit(submit)}>
    <p className="text-xs text-muted-foreground"><CustomerText message="m_eacf8bd3561b" />{oneRunPerSample ? <CustomerSourceText source={"Accepted pricing includes one sequencing run per sample; this count is fixed."} /> : __customerText('m_4b7076c9e11c')} <CustomerText message="m_e2ec07a945ff" /></p>
    {Array.from({ length: rowCount }, (_, index) => {
      const idError = form.formState.errors.rows?.[index]?.customerSampleId?.message
      const tubeError = form.formState.errors.rows?.[index]?.tubeCount?.message
      const runError = form.formState.errors.rows?.[index]?.sequencingRunCount?.message
      const id = `${prefix}-${index}`
      return <div key={index} className="grid grid-cols-[2rem_minmax(0,1fr)] sm:grid-cols-[2rem_minmax(0,1fr)_5rem_6rem] items-start gap-3 border-b pb-3 last:border-0">
        <span className="pt-7 text-sm text-muted-foreground" aria-label={__customerText('m_bfa208f40cee', { p0: String(savedCount + index + 1) })}>{savedCount + index + 1}</span>
        <PortalField ><Label htmlFor={`${id}-sample`}><RequiredFieldName><CustomerText message="m_1860caa4e4b3" /></RequiredFieldName></Label>
          <Input id={`${id}-sample`} aria-label={__customerText('m_4c2ba4cbae1f', { p0: String(savedCount + index + 1), p1: String(source) })} maxLength={255} defaultValue="" aria-required="true"
            disabled={disabled || save.isPending} aria-invalid={Boolean(idError)} aria-describedby={idError ? `${id}-error` : undefined}
            {...form.register(`rows.${index}.customerSampleId`)} />
          {idError ? <p id={`${id}-error`} className="text-xs text-destructive">{idError}</p> : null}</PortalField>
        <PortalField ><Label htmlFor={`${id}-tubes`}><RequiredFieldName><CustomerText message="m_9896e020cb56" /></RequiredFieldName></Label>
          <Input id={`${id}-tubes`} aria-label={__customerText('m_c7fa813872d1', { p0: String(savedCount + index + 1), p1: String(source) })} type="number" min={1} step={1} defaultValue="1" aria-required="true"
            disabled={disabled || save.isPending} aria-invalid={Boolean(tubeError)} aria-describedby={tubeError ? `${id}-tube-error` : undefined}
            {...form.register(`rows.${index}.tubeCount`)} />
          {tubeError ? <p id={`${id}-tube-error`} className="text-xs text-destructive">{tubeError}</p> : null}</PortalField>
        {oneRunPerSample ? <div className="space-y-1"><Label htmlFor={`${id}-runs`}><CustomerText message="m_848f54e89660" /></Label>
          <output id={`${id}-runs`} aria-label={__customerText('m_59baa6992064', { p0: String(savedCount + index + 1), p1: String(source) })} className="block py-2 text-sm">1</output>
        </div> : <PortalField ><Label htmlFor={`${id}-runs`}><RequiredFieldName><CustomerText message="m_848f54e89660" /></RequiredFieldName></Label>
          <Input id={`${id}-runs`} aria-label={__customerText('m_59baa6992064', { p0: String(savedCount + index + 1), p1: String(source) })} type="number" min={1} max={10000} step={1} defaultValue="1" aria-required="true"
            disabled={disabled || save.isPending} aria-invalid={Boolean(runError)} aria-describedby={runError ? `${id}-run-error` : undefined} {...form.register(`rows.${index}.sequencingRunCount`)} />
          {runError ? <p id={`${id}-run-error`} className="text-xs text-destructive">{runError}</p> : null}</PortalField>}
      </div>
    })}
    {entered > capacity ? <p role="alert" className="text-sm text-destructive"><CustomerText message="m_62bde862e229" />{capacity} <CustomerText message="m_823465a77ee4" /></p> : null}
    {save.error ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(save.error, 'Some sample IDs could not be saved. Saved rows are retained; review the remaining entries and try again.')} />}</AlertDescription></Alert> : null}
    <div className="flex flex-wrap items-center justify-between gap-3"><RequiredLegend /><div className="flex flex-wrap gap-2">
      {lastEnteredIndex >= 0 ? <Button type="button" variant="outline" disabled={disabled || save.isPending} onClick={() => {
        form.reset({ rows: Array.from({ length: remaining }, blankRow) }); onDirtyChange(false); save.reset()
      }}><CustomerText message="m_cdbf3158063c" /></Button> : null}
      <Button type="submit" disabled={disabled || save.isPending || !entered || entered > capacity || authProvider === 'mock'}>
        {save.isPending ? <CustomerSourceText source={"Saving samples…"} /> : __customerText('m_476e38b21b33')}
      </Button>
    </div></div>
    <p className="text-xs text-muted-foreground">{entered} of {remaining} <CustomerText message="m_13c5f3cd8c1f" /></p>
  </form>
}
