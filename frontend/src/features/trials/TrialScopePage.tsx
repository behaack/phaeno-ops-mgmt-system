import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useBlocker, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { TrialConfiguration, TrialDetail, TrialScopeDraftValues } from '#/api/trials'
import { apiErrorMessage } from '#/api/organization-management'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { SearchableSelect } from '#/components/ui/searchable-select'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { TrialSourcesFields } from './TrialSourcesFields'
import { trialSourceRow, validateTrialSources } from './trial-source-schema'
import { useTrialMutation, useTrialQueries } from './trial-hooks'
import { trialDate, trialTerminal } from './trial-presentation'
import { isSubmissionDate, submissionBoundary, submissionDateInput } from './trial-submission-dates'

const draftText = (max = 4000) => z.string().trim().max(max, `Use ${max.toLocaleString()} characters or fewer.`)
const draftDate = z.string().refine(value => !value || isSubmissionDate(value), 'Enter a valid date.')
const baseSchema = z.object({ departmentId: z.string(), name: draftText(255), objective: draftText(), sampleTypeId: z.string(), sources: z.array(trialSourceRow),
  submissionOpensAtUtc: draftDate, submissionClosesAtUtc: draftDate, workflowVersionId: z.string(),
  analysisIds: z.array(z.string()).max(100), deliverableIds: z.array(z.string()).max(100),
  submissionInstructions: draftText(), successCriteria: draftText(), estimatedRetailValue: z.number().min(0).nullable(), anticipatedInternalCost: z.number().min(0).nullable(),
  residualRetentionDays: z.number().int().min(0).nullable(), materialDisposition: z.enum(['Destroy', 'Return']), returnDestination: draftText(), returnHandling: draftText(), returnShippingPayer: draftText(255), terms: draftText(12000), reason: draftText(),
})
const draftSchema = baseSchema.superRefine((value, context) => validateTrialSources(value.sources, context, false))
const schema = baseSchema.superRefine((value, context) => {
  validateTrialSources(value.sources, context, true)
  for (const key of ['departmentId', 'name', 'objective', 'sampleTypeId', 'submissionOpensAtUtc', 'submissionClosesAtUtc', 'workflowVersionId', 'submissionInstructions', 'successCriteria', 'estimatedRetailValue', 'anticipatedInternalCost', 'residualRetentionDays', 'terms', 'reason'] as const)
    if (value[key] === '' || value[key] === null) context.addIssue({ code: 'custom', path: [key], message: 'Required for approval.' })
  if (!value.analysisIds.length) context.addIssue({ code: 'custom', path: ['analysisIds'], message: 'Select at least one PSeq analysis.' })
  if (!value.deliverableIds.length) context.addIssue({ code: 'custom', path: ['deliverableIds'], message: 'Select at least one deliverable.' })
  if (value.submissionClosesAtUtc < value.submissionOpensAtUtc) context.addIssue({ code: 'custom', path: ['submissionClosesAtUtc'], message: 'Closing date cannot be before opening date.' })
  if (value.materialDisposition === 'Return') for (const key of ['returnDestination', 'returnHandling', 'returnShippingPayer'] as const) if (!value[key].trim()) context.addIssue({ code: 'custom', path: [key], message: 'Required for return of residual material.' })
})
type Values = z.infer<typeof schema>
function initialValues(trial: TrialDetail, configuration: TrialConfiguration): Values {
  const scope = trial.scope?.internalValues
  const draft = trial.scopeDraft?.values
  if (draft) return {
    departmentId: draft.departmentId ?? '', name: draft.name ?? '', objective: draft.objective ?? '', sampleTypeId: draft.sampleTypeId ?? '', sources: draft.sources?.length ? draft.sources : [{ biologicalSource: '', specimenCount: null }],
    submissionOpensAtUtc: submissionDateInput(draft.submissionOpensAtUtc), submissionClosesAtUtc: submissionDateInput(draft.submissionClosesAtUtc, true), workflowVersionId: draft.workflowVersionId ?? '',
    analysisIds: draft.analysisIds ?? [], deliverableIds: draft.deliverableIds ?? [], submissionInstructions: draft.submissionInstructions ?? '', successCriteria: draft.successCriteria ?? '',
    estimatedRetailValue: draft.estimatedRetailValue, anticipatedInternalCost: draft.anticipatedInternalCost, residualRetentionDays: draft.residualRetentionDays,
    materialDisposition: draft.materialDisposition ?? 'Destroy', returnDestination: draft.returnDestination ?? '', returnHandling: draft.returnHandling ?? '', returnShippingPayer: draft.returnShippingPayer ?? '', terms: draft.terms ?? '', reason: draft.reason ?? '',
  }
  return {
    departmentId: trial.departmentId ?? (configuration.departments.length === 1 ? configuration.departments[0].id : ''), name: scope?.name ?? '', objective: scope?.objective ?? '', sampleTypeId: scope?.sampleType.id ?? '', sources: scope?.sources ?? [{ biologicalSource: '', specimenCount: null }],
    submissionOpensAtUtc: submissionDateInput(scope?.submissionOpensAtUtc), submissionClosesAtUtc: submissionDateInput(scope?.submissionClosesAtUtc, true), workflowVersionId: scope?.workflowVersionId ?? (configuration.workflows.length === 1 ? configuration.workflows[0].id : ''),
    analysisIds: scope?.analyses.map(value => value.id) ?? [], deliverableIds: scope?.deliverables.map(value => value.id) ?? configuration.defaultDeliverableIds,
    submissionInstructions: scope?.submissionInstructions ?? '', successCriteria: scope?.successCriteria ?? '', estimatedRetailValue: scope?.estimatedRetailValue ?? 0, anticipatedInternalCost: scope?.anticipatedInternalCost ?? 0,
    residualRetentionDays: scope?.residualRetentionDays ?? 30, materialDisposition: scope?.materialDisposition ?? 'Destroy', returnDestination: scope?.returnDestination ?? '', returnHandling: scope?.returnHandling ?? '', returnShippingPayer: scope?.returnShippingPayer ?? '',
    terms: scope?.terms ?? 'Research use only. No PHI or direct personal identifiers. This is a no-charge, closed-ended PSeq evaluation; further work requires separate agreement.', reason: '',
  }
}
export function TrialScopePage({ trialId, fromCompanyId }: { trialId: string; fromCompanyId?: string }) {
  const queries = useTrialQueries(trialId)
  if (!queries.staff) return <p className="p-6">Phaeno staff define Trial scope.</p>
  if (queries.detail.error && !queries.detail.data || queries.config.error && !queries.config.data) return <p role="alert" className="p-6">{apiErrorMessage(queries.detail.error ?? queries.config.error)} <Button variant="outline" onClick={() => { void queries.detail.refetch(); void queries.config.refetch() }}>Retry Trial scope</Button></p>
  if (!queries.detail.data || !queries.config.data) return <p role="status" className="p-6">Loading Trial scope…</p>
  return <ScopeEditor fromCompanyId={fromCompanyId} key={trialId} trial={queries.detail.data} configuration={queries.config.data} onReload={async () => { const [result, configuration] = await Promise.all([queries.detail.refetch(), queries.config.refetch()]); if (result.error) throw result.error; if (configuration.error) throw configuration.error; return { trial: result.data!, configuration: configuration.data! } }} />
}
function ScopeEditor({ trial, configuration, onReload, fromCompanyId }: { fromCompanyId?: string; trial: TrialDetail; configuration: TrialConfiguration; onReload: () => Promise<{ trial: TrialDetail; configuration: TrialConfiguration }> }) {
  const [error, setError] = useState<string | null>(null); const [reloaded, setReloaded] = useState(false)
  const [isReloading, setIsReloading] = useState(false); const reloadPending = useRef(false)
  const intent = useRef<'draft' | 'submit'>('submit')
  const [savingDraft, setSavingDraft] = useState(false)
  const saved = useRef(false); const version = useRef(trial.version); const key = useRef(crypto.randomUUID())
  const mutation = useTrialMutation<TrialDetail>(); const navigate = useNavigate()
  const form = useForm<Values>({ resolver: (values, context, options) => zodResolver(intent.current === 'draft' ? draftSchema : schema)(values, context, options), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: initialValues(trial, configuration) })
  const { isDirty } = form.formState
  const busy = form.formState.isSubmitting || isReloading
  useBlocker({ shouldBlockFn: () => !saved.current && (reloadPending.current || form.formState.isSubmitting || isDirty && !window.confirm('Discard the unsaved Trial scope changes?')), enableBeforeUnload: () => !saved.current && (isDirty || busy) })
  const sources = useFieldArray({ control: form.control, name: 'sources' })
  const sourceValues = useWatch({ control: form.control, name: 'sources' })
  const sourceTotal = sourceValues.reduce((sum, source) => sum + (Number(source.specimenCount) || 0), 0)
  const disposition = useWatch({ control: form.control, name: 'materialDisposition' })
  const errorFor = (name: keyof Values) => form.formState.errors[name] ? <p id={`scope-${name}-error`} role="alert" className="text-sm text-destructive">{form.formState.errors[name]?.message}</p> : null
  function text(name: keyof Values, label: string, type: 'text' | 'number' | 'date' | 'textarea' = 'text', optional = false) {
    const attributes = { id: `scope-${name}`, 'aria-invalid': Boolean(form.formState.errors[name]), 'aria-describedby': form.formState.errors[name] ? `scope-${name}-error` : undefined }
    return <Field><Label htmlFor={attributes.id}>{optional ? label : <RequiredFieldName>{label}</RequiredFieldName>}</Label>{type === 'textarea' ? <Textarea {...attributes} aria-required={!optional} rows={4} {...form.register(name)} /> : <Input {...attributes} aria-required={!optional} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? name === 'residualRetentionDays' ? 1 : 'any' : undefined} {...form.register(name, type === 'number' ? { setValueAs: value => value === '' || value == null ? null : Number(value) } : {})} />}{errorFor(name)}</Field>
  }
  function select(name: 'departmentId' | 'workflowVersionId' | 'materialDisposition', label: string, options: { id: string; name: string }[]) {
    return <Field><Label htmlFor={`scope-${name}`}><RequiredFieldName>{label}</RequiredFieldName></Label>{name === 'materialDisposition' ? <NativeSelect id={`scope-${name}`} {...form.register(name)} aria-invalid={Boolean(form.formState.errors[name])} aria-describedby={form.formState.errors[name] ? `scope-${name}-error` : undefined} >{options.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</NativeSelect> : <Controller name={name} control={form.control} render={({ field }) => <SearchableSelect id={`scope-${name}`} value={field.value} onValueChange={field.onChange} inputRef={field.ref} options={options.map(value => ({ value: value.id, label: value.name }))} required placeholder="Search and select…" emptyMessage="No eligible choices." resultsLabel={`${label} choices`} selectionMessage="Select an option from the results." noMatchMessage="No matching choices." narrowMessage={count => `Keep typing to narrow ${count} choices.`} aria-invalid={Boolean(form.formState.errors[name])} aria-describedby={form.formState.errors[name] ? `scope-${name}-error` : undefined} />} />}{errorFor(name)}</Field>
  }
  async function submit(input: Values, action: 'draft' | 'submit') {
    if (reloadPending.current || trialTerminal(trial.status)) return
    setError(null)
    setSavingDraft(action === 'draft')
    const values: TrialScopeDraftValues = { ...input, sampleTypeId: input.sampleTypeId || null, sampleAllowance: input.sources.reduce((sum, source) => sum + (source.specimenCount ?? 0), 0) || null, departmentId: input.departmentId || null, workflowVersionId: input.workflowVersionId || null,
      submissionOpensAtUtc: input.submissionOpensAtUtc ? submissionBoundary(input.submissionOpensAtUtc) : null,
      submissionClosesAtUtc: input.submissionClosesAtUtc ? submissionBoundary(input.submissionClosesAtUtc, true) : null }
    const scopeValues: Partial<TrialScopeDraftValues> = { ...values }
    delete scopeValues.sampleAllowance
    try { await mutation.mutateAsync({ path: `/${trial.id}/scope${action === 'draft' ? '/draft' : ''}`, payload: action === 'draft' ? { version: version.current, values } : { ...scopeValues, version: version.current }, key: key.current }); saved.current = true; await navigate({ to: '/order-operations/lab-services/trials/$trialId', params: { trialId: trial.id }, search: previous => ({ ...previous, fromCompanyId, requestId: undefined }) }) }
    catch (failure) { setError(apiErrorMessage(failure)); setReloaded(false) }
    finally { setSavingDraft(false) }
  }
  async function reload() {
    if (reloadPending.current || form.formState.isSubmitting) return
    reloadPending.current = true; setIsReloading(true); setReloaded(false)
    try {
      const latest = await onReload(); version.current = latest.trial.version; key.current = crypto.randomUUID()
      if (!latest.configuration.departments.some(value => value.id === form.getValues('departmentId'))) form.setValue('departmentId', '')
      if (!latest.configuration.sampleTypes.some(value => value.id === form.getValues('sampleTypeId'))) form.setValue('sampleTypeId', '')
      if (!latest.configuration.workflows.some(value => value.id === form.getValues('workflowVersionId'))) form.setValue('workflowVersionId', '')
      form.setValue('analysisIds', form.getValues('analysisIds').filter(id => latest.configuration.analyses.some(value => value.id === id)))
      form.setValue('deliverableIds', form.getValues('deliverableIds').filter(id => latest.configuration.deliverables.some(value => value.id === id)))
      form.clearErrors(); setError(null); setReloaded(true)
    } catch (failure) { setError(apiErrorMessage(failure)) }
    finally { reloadPending.current = false; setIsReloading(false) }
  }
  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6"><Link to="/order-operations/lab-services/trials/$trialId" params={{ trialId: trial.id }} search={previous => ({ ...previous, fromCompanyId, requestId: undefined })} disabled={busy} className="text-primary underline aria-disabled:cursor-default aria-disabled:opacity-50">Back to {trial.number}</Link><header><h1 className="text-2xl font-semibold">{trial.scopeDraft ? 'Resume Trial scope draft' : trial.scope ? 'Amend Trial scope' : 'Define Trial scope'}</h1><p className="text-sm text-muted-foreground">Save incomplete work as a shared staff draft. {trial.canApproveScopeOnSubmission ? 'Approve and submit a complete scope to make it available for Prospect acceptance; no separate approval decision is needed.' : 'Submit a complete scope for Commercial leadership review, followed by Prospect acceptance.'} Saving a draft leaves the current scope and approvals unchanged. Submission windows use calendar dates, including the closing date.</p>{trial.scopeDraft ? <p className="mt-2 text-sm text-muted-foreground">Last saved by {trial.scopeDraft.savedByName} · {trialDate(trial.scopeDraft.savedAtUtc)}</p> : null}</header>
    <form noValidate aria-busy={busy} onSubmit={event => { intent.current = 'submit'; void form.handleSubmit(input => submit(input, 'submit'))(event) }} className="space-y-6"><fieldset disabled={busy} className="space-y-6">
      {trialTerminal(trial.status) ? <p role="alert">This Trial is now closed. Its scope cannot be amended. Your unsaved entries remain here for reference.</p> : null}
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">Purpose and allowance</legend>{text('name', 'Trial name')}{text('objective', 'Objective / Description', 'textarea')}{select('departmentId', 'Prospect department', configuration.departments)}{!configuration.departments.length ? <p role="alert">Link an active Prospect organization and department through the company’s CRM access request first.</p> : null}<Field><Label htmlFor="scope-sampleTypeId"><RequiredFieldName>Sample type</RequiredFieldName></Label><NativeSelect id="scope-sampleTypeId" {...form.register('sampleTypeId')} aria-invalid={Boolean(form.formState.errors.sampleTypeId)} aria-describedby="scope-sampleTypeId-error"><option value="">Select sample type</option>{configuration.sampleTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</NativeSelect>{errorFor('sampleTypeId')}</Field>
      <TrialSourcesFields prefix="scope" total={sourceTotal} rows={sources.fields.map((source, index) => ({ id: source.id, source: form.register(`sources.${index}.biologicalSource`), quantity: form.register(`sources.${index}.specimenCount`, { setValueAs: value => value === '' || value == null ? null : Number(value) }), sourceError: form.formState.errors.sources?.[index]?.biologicalSource?.message, quantityError: form.formState.errors.sources?.[index]?.specimenCount?.message }))} error={form.formState.errors.sources?.root?.message ?? form.formState.errors.sources?.message} onAdd={() => sources.append({ biologicalSource: '', specimenCount: 1 })} onRemove={index => sources.remove(index)} />
      <div className="grid gap-4 sm:grid-cols-2">{text('submissionOpensAtUtc', 'Submission opens', 'date')}{text('submissionClosesAtUtc', 'Submission closes', 'date')}</div></fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">PSeq scientific requirements</legend>{select('workflowVersionId', 'Approved laboratory workflow', configuration.workflows)}
        <fieldset className="space-y-2" aria-invalid={Boolean(form.formState.errors.analysisIds)} aria-describedby={form.formState.errors.analysisIds ? 'scope-analysisIds-error' : undefined}><legend className="mb-2 text-sm font-medium"><RequiredFieldName>PSeq analyses</RequiredFieldName></legend>{configuration.analyses.map(value => <label key={value.id} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" value={value.id} {...form.register('analysisIds')} className="mt-1 size-4 accent-primary" />{value.name} · version {value.version}</label>)}{errorFor('analysisIds')}</fieldset>
        <fieldset className="space-y-2" aria-invalid={Boolean(form.formState.errors.deliverableIds)} aria-describedby={form.formState.errors.deliverableIds ? 'scope-deliverableIds-error' : undefined}><legend className="mb-2 text-sm font-medium"><RequiredFieldName>Deliverables</RequiredFieldName></legend>{configuration.deliverables.map(value => <label key={value.id} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" value={value.id} {...form.register('deliverableIds')} className="mt-1 size-4 accent-primary" />{value.name} · revision {value.revision}</label>)}{errorFor('deliverableIds')}</fieldset>
        {text('submissionInstructions', 'Extracted RNA submission instructions', 'textarea')}{text('successCriteria', 'Acceptance and success criteria', 'textarea')}
      </fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">Material and terms</legend><p className="text-sm text-muted-foreground">Residual retention starts at terminal closure. Return arrangements are frozen once samples are submitted.</p><div className="grid gap-4 sm:grid-cols-2">{text('residualRetentionDays', 'Residual RNA retention days', 'number')}{select('materialDisposition', 'Planned disposition', [{ id: 'Destroy', name: 'Destroy after retention' }, { id: 'Return', name: 'Return under agreed arrangements' }])}</div>{disposition === 'Return' ? <>{text('returnDestination', 'Return destination', 'textarea')}{text('returnHandling', 'Return handling', 'textarea')}{text('returnShippingPayer', 'Return shipping payer')}</> : null}{text('terms', 'Prospect terms and RUO / no-PHI requirements', 'textarea')}</fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">Internal commercial context</legend><p className="text-sm text-muted-foreground">These values remain internal and do not create a charge, invoice, or payment gate.</p><div className="grid gap-4 sm:grid-cols-2">{text('estimatedRetailValue', 'Estimated retail value', 'number')}{text('anticipatedInternalCost', 'Anticipated internal cost', 'number')}</div>{text('reason', 'Reason for this scope revision', 'textarea')}</fieldset>
      {error ? <div role="alert" className="space-y-2 text-destructive"><p>{error}</p><Button type="button" variant="outline" disabled={busy} onClick={() => { void reload() }}>{isReloading ? 'Reloading…' : 'Reload current Trial; keep my entries'}</Button></div> : null}
      {isReloading ? <p role="status">Reloading current Trial and configuration… Your entries are preserved.</p> : reloaded ? <p role="status">The current Trial and configuration were reloaded. Your entries are preserved; unavailable departments, workflows, analyses and deliverables were cleared. Review the current choices before submitting again.</p> : null}
      <footer className="flex flex-wrap items-center gap-3"><div className="mr-auto"><RequiredLegend /><p className="text-xs text-muted-foreground">Required for approval; drafts may be incomplete.</p></div><Button asChild variant="outline"><Link to="/order-operations/lab-services/trials/$trialId" params={{ trialId: trial.id }} disabled={busy} search={previous => ({ ...previous, fromCompanyId, requestId: undefined })}>Cancel</Link></Button><Button type="button" variant="outline" disabled={busy || !isDirty || trialTerminal(trial.status)} onClick={() => { intent.current = 'draft'; void form.handleSubmit(input => submit(input, 'draft'))() }}>{savingDraft ? 'Saving draft…' : 'Save draft'}</Button><Button disabled={busy || trialTerminal(trial.status) || Boolean(trial.canApproveScopeOnSubmission && trial.isOnHold)} type="submit">{form.formState.isSubmitting && !savingDraft ? 'Submitting…' : trial.canApproveScopeOnSubmission ? 'Approve and submit scope' : 'Submit scope for approval'}</Button>{trial.canApproveScopeOnSubmission && trial.isOnHold ? <p role="status" className="text-sm text-muted-foreground">Resolve the Trial hold before approving scope. You can still save a draft.</p> : null}</footer>
    </fieldset></form></main>
}
