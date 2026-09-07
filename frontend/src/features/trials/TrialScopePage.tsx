import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useBlocker, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { TrialConfiguration, TrialDetail, TrialScopeDraftValues } from '#/api/trials'
import { apiErrorMessage } from '#/api/organization-management'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { SearchableSelect } from '#/components/ui/searchable-select'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { useTrialMutation, useTrialQueries } from './trial-hooks'
import { trialDate, trialTerminal } from './trial-presentation'

const draftText = (max = 4000) => z.string().trim().max(max, `Use ${max.toLocaleString()} characters or fewer.`)
const draftDate = z.string().refine(value => !value || Number.isFinite(new Date(value).getTime()), 'Enter a valid date and time.')
const draftSchema = z.object({ departmentId: z.string(), name: draftText(255), objective: draftText(), sampleAllowance: z.number().int().min(1).nullable(),
  submissionOpensAtUtc: draftDate, submissionClosesAtUtc: draftDate, workflowVersionId: z.string(),
  analysisIds: z.array(z.string()).max(100), deliverableIds: z.array(z.string()).max(100),
  submissionInstructions: draftText(), successCriteria: draftText(), estimatedRetailValue: z.number().min(0).nullable(), anticipatedInternalCost: z.number().min(0).nullable(),
  residualRetentionDays: z.number().int().min(0).nullable(), materialDisposition: z.enum(['Destroy', 'Return']), returnDestination: draftText(), returnHandling: draftText(), returnShippingPayer: draftText(255), terms: draftText(12000), reason: draftText(),
})
const schema = draftSchema.superRefine((value, context) => {
  for (const key of ['departmentId', 'name', 'objective', 'sampleAllowance', 'submissionOpensAtUtc', 'submissionClosesAtUtc', 'workflowVersionId', 'submissionInstructions', 'successCriteria', 'estimatedRetailValue', 'anticipatedInternalCost', 'residualRetentionDays', 'terms', 'reason'] as const)
    if (value[key] === '' || value[key] === null) context.addIssue({ code: 'custom', path: [key], message: 'Required for approval.' })
  if (!value.analysisIds.length) context.addIssue({ code: 'custom', path: ['analysisIds'], message: 'Select at least one PSeq analysis.' })
  if (!value.deliverableIds.length) context.addIssue({ code: 'custom', path: ['deliverableIds'], message: 'Select at least one deliverable.' })
  if (new Date(value.submissionClosesAtUtc) <= new Date(value.submissionOpensAtUtc)) context.addIssue({ code: 'custom', path: ['submissionClosesAtUtc'], message: 'Closing must follow opening.' })
  if (value.materialDisposition === 'Return') for (const key of ['returnDestination', 'returnHandling', 'returnShippingPayer'] as const) if (!value[key].trim()) context.addIssue({ code: 'custom', path: [key], message: 'Required for return of residual material.' })
})
type Values = z.infer<typeof schema>
const localDate = (value?: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ''
function initialValues(trial: TrialDetail, configuration: TrialConfiguration): Values {
  const scope = trial.scope?.internalValues
  const draft = trial.scopeDraft?.values
  if (draft) return {
    departmentId: draft.departmentId ?? '', name: draft.name ?? '', objective: draft.objective ?? '', sampleAllowance: draft.sampleAllowance,
    submissionOpensAtUtc: localDate(draft.submissionOpensAtUtc), submissionClosesAtUtc: localDate(draft.submissionClosesAtUtc), workflowVersionId: draft.workflowVersionId ?? '',
    analysisIds: draft.analysisIds ?? [], deliverableIds: draft.deliverableIds ?? [], submissionInstructions: draft.submissionInstructions ?? '', successCriteria: draft.successCriteria ?? '',
    estimatedRetailValue: draft.estimatedRetailValue, anticipatedInternalCost: draft.anticipatedInternalCost, residualRetentionDays: draft.residualRetentionDays,
    materialDisposition: draft.materialDisposition ?? 'Destroy', returnDestination: draft.returnDestination ?? '', returnHandling: draft.returnHandling ?? '', returnShippingPayer: draft.returnShippingPayer ?? '', terms: draft.terms ?? '', reason: draft.reason ?? '',
  }
  return {
    departmentId: trial.departmentId ?? (configuration.departments.length === 1 ? configuration.departments[0].id : ''), name: scope?.name ?? '', objective: scope?.objective ?? '', sampleAllowance: scope?.sampleAllowance ?? null,
    submissionOpensAtUtc: localDate(scope?.submissionOpensAtUtc), submissionClosesAtUtc: localDate(scope?.submissionClosesAtUtc), workflowVersionId: scope?.workflowVersionId ?? (configuration.workflows.length === 1 ? configuration.workflows[0].id : ''),
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
  const disposition = useWatch({ control: form.control, name: 'materialDisposition' })
  const errorFor = (name: keyof Values) => form.formState.errors[name] ? <p id={`scope-${name}-error`} role="alert" className="text-sm text-destructive">{form.formState.errors[name]?.message}</p> : null
  function text(name: keyof Values, label: string, type: 'text' | 'number' | 'datetime-local' | 'textarea' = 'text', optional = false) {
    const attributes = { id: `scope-${name}`, 'aria-invalid': Boolean(form.formState.errors[name]), 'aria-describedby': `scope-${name}-error` }
    return <div className="space-y-1.5"><Label htmlFor={attributes.id}>{optional ? label : <RequiredFieldName>{label}</RequiredFieldName>}</Label>{type === 'textarea' ? <Textarea {...attributes} aria-required={!optional} rows={4} {...form.register(name)} /> : <Input {...attributes} aria-required={!optional} type={type} min={type === 'number' ? name === 'sampleAllowance' ? 1 : 0 : undefined} step={type === 'number' ? name === 'sampleAllowance' || name === 'residualRetentionDays' ? 1 : 'any' : undefined} {...form.register(name, type === 'number' ? { setValueAs: value => value === '' || value == null ? null : Number(value) } : {})} />}{errorFor(name)}</div>
  }
  function select(name: 'departmentId' | 'workflowVersionId' | 'materialDisposition', label: string, options: { id: string; name: string }[]) {
    return <div className="space-y-1.5"><Label htmlFor={`scope-${name}`}><RequiredFieldName>{label}</RequiredFieldName></Label>{name === 'materialDisposition' ? <select id={`scope-${name}`} {...form.register(name)} aria-invalid={Boolean(form.formState.errors[name])} aria-describedby={`scope-${name}-error`} className="h-10 w-full cursor-pointer rounded-md border bg-background px-3 text-sm">{options.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select> : <Controller name={name} control={form.control} render={({ field }) => <SearchableSelect id={`scope-${name}`} value={field.value} onValueChange={field.onChange} inputRef={field.ref} options={options.map(value => ({ value: value.id, label: value.name }))} required placeholder="Search and select…" emptyMessage="No eligible choices." resultsLabel={`${label} choices`} selectionMessage="Select an option from the results." noMatchMessage="No matching choices." narrowMessage={count => `Keep typing to narrow ${count} choices.`} aria-invalid={Boolean(form.formState.errors[name])} aria-describedby={`scope-${name}-error`} />} />}{errorFor(name)}</div>
  }
  async function submit(input: Values, action: 'draft' | 'submit') {
    if (reloadPending.current || trialTerminal(trial.status)) return
    setError(null)
    setSavingDraft(action === 'draft')
    const values: TrialScopeDraftValues = { ...input, departmentId: input.departmentId || null, workflowVersionId: input.workflowVersionId || null,
      submissionOpensAtUtc: input.submissionOpensAtUtc ? new Date(input.submissionOpensAtUtc).toISOString() : null,
      submissionClosesAtUtc: input.submissionClosesAtUtc ? new Date(input.submissionClosesAtUtc).toISOString() : null }
    try { await mutation.mutateAsync({ path: `/${trial.id}/scope${action === 'draft' ? '/draft' : ''}`, payload: action === 'draft' ? { version: version.current, values } : { ...values, version: version.current }, key: key.current }); saved.current = true; await navigate({ to: '/trial-projects/$trialId', params: { trialId: trial.id }, search: previous => ({ ...previous, fromCompanyId, requestId: undefined }) }) }
    catch (failure) { setError(apiErrorMessage(failure)); setReloaded(false) }
    finally { setSavingDraft(false) }
  }
  async function reload() {
    if (reloadPending.current || form.formState.isSubmitting) return
    reloadPending.current = true; setIsReloading(true); setReloaded(false)
    try {
      const latest = await onReload(); version.current = latest.trial.version; key.current = crypto.randomUUID()
      if (!latest.configuration.departments.some(value => value.id === form.getValues('departmentId'))) form.setValue('departmentId', '')
      if (!latest.configuration.workflows.some(value => value.id === form.getValues('workflowVersionId'))) form.setValue('workflowVersionId', '')
      form.setValue('analysisIds', form.getValues('analysisIds').filter(id => latest.configuration.analyses.some(value => value.id === id)))
      form.setValue('deliverableIds', form.getValues('deliverableIds').filter(id => latest.configuration.deliverables.some(value => value.id === id)))
      form.clearErrors(); setError(null); setReloaded(true)
    } catch (failure) { setError(apiErrorMessage(failure)) }
    finally { reloadPending.current = false; setIsReloading(false) }
  }
  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6"><Link to="/trial-projects/$trialId" params={{ trialId: trial.id }} search={previous => ({ ...previous, fromCompanyId, requestId: undefined })} disabled={busy} className="text-primary underline aria-disabled:cursor-default aria-disabled:opacity-50">Back to {trial.number}</Link><header><h1 className="text-2xl font-semibold">{trial.scopeDraft ? 'Resume Trial scope draft' : trial.scope ? 'Amend Trial scope' : 'Define Trial scope'}</h1><p className="text-sm text-muted-foreground">Save incomplete work as a shared staff draft. Submit for approval only when ready for independent Commercial and Scientific Operations review, followed by Prospect acceptance. Saving a draft leaves the current scope and approvals unchanged. Dates use your local time zone.</p>{trial.scopeDraft ? <p className="mt-2 text-sm text-muted-foreground">Last saved by {trial.scopeDraft.savedByName} · {trialDate(trial.scopeDraft.savedAtUtc)}</p> : null}</header>
    <form noValidate aria-busy={busy} onSubmit={event => { intent.current = 'submit'; void form.handleSubmit(input => submit(input, 'submit'))(event) }} className="space-y-6"><fieldset disabled={busy} className="space-y-6">
      {trialTerminal(trial.status) ? <p role="alert">This Trial is now closed. Its scope cannot be amended. Your unsaved entries remain here for reference.</p> : null}
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">Purpose and allowance</legend>{text('name', 'Trial name')}{text('objective', 'Scientific objective', 'textarea')}{select('departmentId', 'Prospect department', configuration.departments)}{!configuration.departments.length ? <p role="alert">Link an active Prospect organization and department through the company’s CRM access request first.</p> : null}<div className="grid gap-4 sm:grid-cols-3">{text('sampleAllowance', 'Original sample allowance', 'number')}{text('submissionOpensAtUtc', 'Submission opens', 'datetime-local')}{text('submissionClosesAtUtc', 'Submission closes', 'datetime-local')}</div></fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">PSeq scientific requirements</legend>{select('workflowVersionId', 'Approved laboratory workflow', configuration.workflows)}
        <fieldset className="space-y-2" aria-invalid={Boolean(form.formState.errors.analysisIds)} aria-describedby="scope-analysisIds-error"><legend className="mb-2 text-sm font-medium"><RequiredFieldName>PSeq analyses</RequiredFieldName></legend>{configuration.analyses.map(value => <label key={value.id} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" value={value.id} {...form.register('analysisIds')} className="mt-1 size-4 accent-primary" />{value.name} · version {value.version}</label>)}{errorFor('analysisIds')}</fieldset>
        <fieldset className="space-y-2" aria-invalid={Boolean(form.formState.errors.deliverableIds)} aria-describedby="scope-deliverableIds-error"><legend className="mb-2 text-sm font-medium"><RequiredFieldName>Deliverables</RequiredFieldName></legend>{configuration.deliverables.map(value => <label key={value.id} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" value={value.id} {...form.register('deliverableIds')} className="mt-1 size-4 accent-primary" />{value.name} · revision {value.revision}</label>)}{errorFor('deliverableIds')}</fieldset>
        {text('submissionInstructions', 'Extracted RNA submission instructions', 'textarea')}{text('successCriteria', 'Acceptance and success criteria', 'textarea')}
      </fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">Material and terms</legend><p className="text-sm text-muted-foreground">Residual retention starts at terminal closure. Return arrangements are frozen once samples are submitted.</p><div className="grid gap-4 sm:grid-cols-2">{text('residualRetentionDays', 'Residual RNA retention days', 'number')}{select('materialDisposition', 'Planned disposition', [{ id: 'Destroy', name: 'Destroy after retention' }, { id: 'Return', name: 'Return under agreed arrangements' }])}</div>{disposition === 'Return' ? <>{text('returnDestination', 'Return destination', 'textarea')}{text('returnHandling', 'Return handling', 'textarea')}{text('returnShippingPayer', 'Return shipping payer')}</> : null}{text('terms', 'Prospect terms and RUO / no-PHI requirements', 'textarea')}</fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">Internal commercial context</legend><p className="text-sm text-muted-foreground">These values remain internal and do not create a charge, invoice, or payment gate.</p><div className="grid gap-4 sm:grid-cols-2">{text('estimatedRetailValue', 'Estimated retail value', 'number')}{text('anticipatedInternalCost', 'Anticipated internal cost', 'number')}</div>{text('reason', 'Reason for this scope revision', 'textarea')}</fieldset>
      {error ? <div role="alert" className="space-y-2 text-destructive"><p>{error}</p><Button type="button" variant="outline" disabled={busy} onClick={() => { void reload() }}>{isReloading ? 'Reloading…' : 'Reload current Trial; keep my entries'}</Button></div> : null}
      {isReloading ? <p role="status">Reloading current Trial and configuration… Your entries are preserved.</p> : reloaded ? <p role="status">The current Trial and configuration were reloaded. Your entries are preserved; unavailable departments, workflows, analyses and deliverables were cleared. Review the current choices before submitting again.</p> : null}
      <footer className="flex flex-wrap items-center gap-3"><div className="mr-auto"><RequiredLegend /><p className="text-xs text-muted-foreground">Required for approval; drafts may be incomplete.</p></div><Button asChild variant="outline"><Link to="/trial-projects/$trialId" params={{ trialId: trial.id }} disabled={busy} search={previous => ({ ...previous, fromCompanyId, requestId: undefined })}>Cancel</Link></Button><Button type="button" variant="outline" disabled={busy || !isDirty || trialTerminal(trial.status)} onClick={() => { intent.current = 'draft'; void form.handleSubmit(input => submit(input, 'draft'))() }}>{savingDraft ? 'Saving draft…' : 'Save draft'}</Button><Button disabled={busy || trialTerminal(trial.status)} type="submit">{form.formState.isSubmitting && !savingDraft ? 'Submitting…' : 'Submit scope for approval'}</Button></footer>
    </fieldset></form></main>
}
