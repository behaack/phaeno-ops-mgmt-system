import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { TrialConfiguration, TrialDetail } from '#/api/trials'
import { apiErrorMessage } from '#/api/organization-management'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { SearchableSelect } from '#/components/ui/searchable-select'
import { Textarea } from '#/components/ui/textarea'
import { allRequiredTrialInputs, requiredTrialInputs, trialChoices, trialLabel } from './trial-presentation'

const required = z.string().trim().min(1, 'Required')
const rowSchema = z.object({ reference: required, biologicalSource: required, tubeCount: required, quantity: required, concentration: z.string(), storageRequirements: required, safetyDeclaration: required, inputs: z.record(z.string(), z.string()), replacementAuthorizationId: z.string() })
const blankRow = () => ({ reference: '', biologicalSource: '', tubeCount: '1', quantity: '', concentration: '', storageRequirements: '', safetyDeclaration: '', inputs: {}, replacementAuthorizationId: '' })
export function trialSampleSchema(trial: TrialDetail, configuration: TrialConfiguration) {
  return z.object({ destinationId: required, sampleTypeId: required, confirmed: z.boolean().refine(value => value, 'Confirm research use only and no PHI.'), samples: z.array(rowSchema).min(1).max(100) }).superRefine((values, context) => {
    const sampleType = configuration.sampleTypes.find(value => value.id === values.sampleTypeId)
    if (!sampleType) context.addIssue({ code: 'custom', path: ['sampleTypeId'], message: 'Choose a current extracted RNA sample type.' })
    if (!configuration.destinations.some(value => value.id === values.destinationId)) context.addIssue({ code: 'custom', path: ['destinationId'], message: 'Choose a current shipping destination.' })
    if (values.samples.filter(value => !value.replacementAuthorizationId).length > trial.originalSamplesRemaining) context.addIssue({ code: 'custom', path: ['samples'], message: `Only ${trial.originalSamplesRemaining} original sample slots remain. Remove extra originals or select an approved replacement.` })
    const references = new Set<string>(); const replacements = new Set<string>()
    values.samples.forEach((sample, index) => {
      const error = (name: string, message: string) => context.addIssue({ code: 'custom', path: ['samples', index, ...name.split('.')], message })
      const ref = sample.reference.toLowerCase()
      if (!/^[a-zA-Z0-9_.-]+$/.test(sample.reference)) error('reference', 'Use a coded reference with letters, numbers, dots, hyphens, or underscores.')
      if (references.has(ref) || trial.samples.some(value => value.reference.toLowerCase() === ref)) error('reference', 'Each sample needs a unique coded reference.')
      references.add(ref)
      if (!Number.isInteger(Number(sample.tubeCount)) || Number(sample.tubeCount) < 1) error('tubeCount', 'Enter a whole number of at least 1.')
      if (!Number.isFinite(Number(sample.quantity)) || Number(sample.quantity) <= 0 || sampleType?.minimumQuantity != null && Number(sample.quantity) < sampleType.minimumQuantity || sampleType?.maximumQuantity != null && Number(sample.quantity) > sampleType.maximumQuantity) error('quantity', `Enter a positive quantity${sampleType?.minimumQuantity != null ? ` of at least ${sampleType.minimumQuantity}` : ''}${sampleType?.maximumQuantity != null ? ` and no greater than ${sampleType.maximumQuantity}` : ''} ${sampleType?.quantityUnit ?? ''}.`)
      if (allRequiredTrialInputs(trial.scope).some(name => name.toLowerCase() === 'concentration') && !sample.concentration.trim()) error('concentration', 'Concentration is required by the approved analysis.')
      if (sample.concentration && (!Number.isFinite(Number(sample.concentration)) || Number(sample.concentration) <= 0)) error('concentration', 'Enter a positive concentration.')
      for (const input of requiredTrialInputs(trial.scope)) if (!sample.inputs[input]?.trim()) error(`inputs.${input}`, `${trialLabel(input)} is required.`)
      if (sample.replacementAuthorizationId) {
        if (replacements.has(sample.replacementAuthorizationId) || !trial.replacements.some(value => value.id === sample.replacementAuthorizationId && !value.usedBySampleId)) error('replacementAuthorizationId', 'Choose an unused replacement authorization once per batch.')
        replacements.add(sample.replacementAuthorizationId)
      }
    })
  })
}
type Values = z.infer<ReturnType<typeof trialSampleSchema>>
export function trialSamplePayload(values: Values, trial: TrialDetail, configuration: TrialConfiguration) {
  return { version: trial.version, destinationId: values.destinationId, sampleTypeId: values.sampleTypeId, ruoNoPhiConfirmed: values.confirmed, samples: values.samples.map(sample => {
    const replacement = trial.replacements.find(value => value.id === sample.replacementAuthorizationId)
    return { ...sample, tubeCount: Number(sample.tubeCount), quantity: Number(sample.quantity), quantityUnit: configuration.sampleTypes.find(value => value.id === values.sampleTypeId)!.quantityUnit, concentration: sample.concentration ? Number(sample.concentration) : null,
      inputs: Object.fromEntries(requiredTrialInputs(trial.scope).map(name => [name, sample.inputs[name]])), replacesSampleId: replacement?.originalSampleId ?? null, replacementAuthorizationId: replacement?.id ?? null }
  }) }
}
export function TrialSampleDialog({ trial: initial, configuration: initialConfiguration, onReload, onSubmit, onClose }: {
  trial: TrialDetail; configuration: TrialConfiguration; onReload: () => Promise<{ trial: TrialDetail; configuration: TrialConfiguration }>; onSubmit: (payload: ReturnType<typeof trialSamplePayload>, key: string) => Promise<unknown>; onClose: () => void
}) {
  const [trial, setTrial] = useState(initial); const [configuration, setConfiguration] = useState(initialConfiguration)
  const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null)
  const [isReloading, setIsReloading] = useState(false); const reloadPending = useRef(false)
  const [opener] = useState(() => document.activeElement as HTMLElement | null); const key = useRef(crypto.randomUUID())
  const form = useForm<Values>({ resolver: zodResolver(trialSampleSchema(trial, configuration)), defaultValues: { destinationId: configuration.destinations.length === 1 ? configuration.destinations[0].id : '', sampleTypeId: configuration.sampleTypes.length === 1 ? configuration.sampleTypes[0].id : '', confirmed: false, samples: [blankRow()] } })
  const { isDirty } = form.formState
  const busy = form.formState.isSubmitting || isReloading
  useBlocker({ shouldBlockFn: () => reloadPending.current, enableBeforeUnload: () => reloadPending.current, disabled: !isReloading })
  const rows = useFieldArray({ control: form.control, name: 'samples' }); const typeId = useWatch({ control: form.control, name: 'sampleTypeId' })
  const sampleType = configuration.sampleTypes.find(value => value.id === typeId)
  const extras = requiredTrialInputs(trial.scope); const concentrationRequired = allRequiredTrialInputs(trial.scope).some(name => name.toLowerCase() === 'concentration')
  function close() { if (!reloadPending.current && !form.formState.isSubmitting && (!isDirty || window.confirm('Discard the unsaved Trial sample roster?'))) onClose() }
  async function reload() {
    if (reloadPending.current || form.formState.isSubmitting) return
    reloadPending.current = true; setIsReloading(true); setNotice(null)
    try {
      const latest = await onReload(); const changed = latest.trial.scope?.revision !== trial.scope?.revision || latest.trial.scope?.termsVersion !== trial.scope?.termsVersion
      setTrial(latest.trial); setConfiguration(latest.configuration); key.current = crypto.randomUUID()
      if (changed) form.setValue('confirmed', false)
      if (!latest.configuration.sampleTypes.some(value => value.id === form.getValues('sampleTypeId'))) form.setValue('sampleTypeId', '')
      if (!latest.configuration.destinations.some(value => value.id === form.getValues('destinationId'))) form.setValue('destinationId', '')
      form.getValues('samples').forEach((sample, index) => { if (sample.replacementAuthorizationId && !latest.trial.replacements.some(value => value.id === sample.replacementAuthorizationId && !value.usedBySampleId)) form.setValue(`samples.${index}.replacementAuthorizationId`, '') })
      form.clearErrors(); setError(null); setNotice(changed ? 'The approved scope changed. Your sample entries are preserved. Review the current requirements and confirm again; acceptance may be required before submission.' : 'The current Trial and sample requirements were reloaded. Your entries are preserved; review the roster before submitting again.')
    } catch (failure) { setError(apiErrorMessage(failure)) }
    finally { reloadPending.current = false; setIsReloading(false) }
  }
  async function submit(values: Values) { if (reloadPending.current || !trial.canSubmit) return; setError(null); try { await onSubmit(trialSamplePayload(values, trial, configuration), key.current); onClose() } catch (failure) { setError(apiErrorMessage(failure)); setNotice(null) } }
  const errorFor = (name: string) => { const state = form.getFieldState(name as Parameters<typeof form.getFieldState>[0]); return state.error ? <p id={`sample-${name}-error`} role="alert" className="text-sm text-destructive">{state.error.message}</p> : null }
  function input(index: number, name: string, label: string, options: { type?: 'number' | 'textarea'; required?: boolean; min?: number; max?: number } = {}) {
    const path = `samples.${index}.${name}` as Parameters<typeof form.register>[0]; const id = `sample-${path}`
    const attrs = { id, 'aria-invalid': Boolean(form.getFieldState(path).error), 'aria-describedby': `${id}-error` }
    return <div className="space-y-1.5"><Label htmlFor={id}>{options.required === false ? label : <RequiredFieldName>{label}</RequiredFieldName>}</Label>{options.type === 'textarea' ? <Textarea {...attrs} {...form.register(path)} rows={2} /> : <Input {...attrs} {...form.register(path)} type={options.type ?? 'text'} min={options.min} max={options.max} step={options.type === 'number' ? name === 'tubeCount' ? '1' : 'any' : undefined} />}{errorFor(path)}</div>
  }
  function choice(name: 'destinationId' | 'sampleTypeId' | `samples.${number}.replacementAuthorizationId`, label: string, options: { value: string; label: string }[], required = true) {
    return <div className="space-y-1.5"><Label htmlFor={`sample-${name}`}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label><Controller name={name} control={form.control} render={({ field }) => <SearchableSelect id={`sample-${name}`} value={field.value} onValueChange={field.onChange} options={options} required={required} placeholder="Search and select…" emptyMessage="No eligible choices." resultsLabel={`${label} choices`} selectionMessage="Select an option from the results." noMatchMessage="No matching choices." narrowMessage={count => `Keep typing to narrow ${count} choices.`} inputRef={field.ref} aria-invalid={Boolean(form.getFieldState(name).error)} aria-describedby={`sample-${name}-error`} />} />{errorFor(name)}</div>
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="sm:max-w-3xl" showCloseButton={!busy} onCloseAutoFocus={event => { event.preventDefault(); opener?.focus() }}><DialogHeader><DialogTitle>Submit extracted RNA samples</DialogTitle><DialogDescription>Review one roster for one shipment. Use coded research references and do not enter PHI or direct personal identifiers.</DialogDescription></DialogHeader>
    <DialogFeedback>{error ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" type="button" disabled={busy} onClick={() => { void reload() }}>{isReloading ? 'Reloading…' : 'Reload current Trial; keep my entries'}</Button></div> : null}{isReloading ? <p role="status" className="text-sm">Reloading current Trial and sample requirements… Your entries are preserved.</p> : notice ? <p role="status" className="text-sm">{notice}</p> : null}{!trial.canSubmit ? <p role="alert" className="text-sm">{trial.submissionBlocker ?? 'Sample submission is no longer available. Close this roster and review the current Trial.'}</p> : null}</DialogFeedback>
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Disabled controls leave the scrollable roster without a keyboard target. */}
    <form id="trial-samples" noValidate aria-label="Trial sample roster" aria-busy={busy} tabIndex={busy ? 0 : undefined} onSubmit={form.handleSubmit(submit)} className="space-y-5 focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"><fieldset disabled={busy} className="space-y-5"><p className="whitespace-pre-wrap text-sm">{trial.scope?.submissionInstructions}</p><p className="text-sm">{trial.originalSamplesRemaining} original sample slots remain. Add all samples for this shipment before submitting.</p><div className="grid gap-4 sm:grid-cols-2">{choice('destinationId', 'Shipping destination', trialChoices(configuration.destinations))}{choice('sampleTypeId', 'Extracted RNA sample type', trialChoices(configuration.sampleTypes))}</div>
      {sampleType ? <p className="text-sm">Enter every quantity in <strong>{sampleType.quantityUnit}</strong>. {sampleType.minimumQuantity != null ? `Minimum: ${sampleType.minimumQuantity} ${sampleType.quantityUnit}. ` : ''}{sampleType.maximumQuantity != null ? `Maximum: ${sampleType.maximumQuantity} ${sampleType.quantityUnit}. ` : ''}{concentrationRequired ? 'The approved analysis also requires concentration.' : ''}</p> : null}
      {rows.fields.map((row, index) => <fieldset key={row.id} className="space-y-4 border-t pt-4"><legend className="font-semibold">Sample {index + 1}</legend><div className="grid gap-4 sm:grid-cols-2">{input(index, 'reference', 'Coded sample reference')}{input(index, 'biologicalSource', 'Biological source')}{input(index, 'tubeCount', 'Number of tubes', { type: 'number', min: 1 })}{input(index, 'quantity', `Quantity${sampleType ? ` (${sampleType.quantityUnit})` : ''}`, { type: 'number', min: sampleType?.minimumQuantity ?? 0, max: sampleType?.maximumQuantity ?? undefined })}{input(index, 'concentration', 'Concentration (ng/µL)', { type: 'number', min: 0, required: concentrationRequired })}</div>{input(index, 'storageRequirements', 'Storage requirements', { type: 'textarea' })}{input(index, 'safetyDeclaration', 'Research material safety declaration', { type: 'textarea' })}{extras.map(name => <div key={name}>{input(index, `inputs.${name}`, trialLabel(name))}</div>)}{trial.replacements.some(value => !value.usedBySampleId) ? choice(`samples.${index}.replacementAuthorizationId`, 'Approved replacement for', trial.replacements.filter(value => !value.usedBySampleId).map(value => ({ value: value.id, label: trial.samples.find(sample => sample.id === value.originalSampleId)?.reference ?? 'Approved replacement' })), trial.originalSamplesRemaining === 0) : null}<Button type="button" variant="outline" disabled={rows.fields.length === 1 || form.formState.isSubmitting} onClick={() => rows.remove(index)}>Remove sample {index + 1}</Button></fieldset>)}
      {errorFor('samples')}<Button type="button" variant="outline" disabled={rows.fields.length >= Math.min(100, trial.originalSamplesRemaining + trial.replacements.filter(value => !value.usedBySampleId).length) || form.formState.isSubmitting} onClick={() => rows.append(blankRow())}>Add another sample</Button><div className="space-y-2"><label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" {...form.register('confirmed')} aria-invalid={Boolean(form.formState.errors.confirmed)} aria-describedby="sample-confirmed-error" className="mt-1 size-5 accent-primary" /><RequiredFieldName className="inline [&>[data-slot=required-mark]]:ml-0.5">I confirm research use only and no PHI or direct personal identifiers</RequiredFieldName></label>{errorFor('confirmed')}</div>
    </fieldset></form><RequiredDialogFooter><Button type="button" variant="outline" onClick={close} disabled={busy}>Cancel</Button><Button form="trial-samples" type="submit" disabled={busy || !trial.canSubmit}>{form.formState.isSubmitting ? 'Submitting…' : `Submit ${rows.fields.length} ${rows.fields.length === 1 ? 'sample' : 'samples'}`}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
