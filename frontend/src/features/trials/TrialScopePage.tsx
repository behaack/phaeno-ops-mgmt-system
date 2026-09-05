import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { TrialConfiguration, TrialDetail } from '#/api/trials'
import { apiErrorMessage } from '#/api/organization-management'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { useTrialMutation, useTrialQueries } from './trial-hooks'
import { trialTerminal } from './trial-presentation'

const required = z.string().trim().min(1, 'Required')
const schema = z.object({ departmentId: required, name: required, objective: required, sampleAllowance: z.number().int().min(1),
  submissionOpensAtUtc: required, submissionClosesAtUtc: required, workflowVersionId: required,
  analysisIds: z.array(z.string()).min(1, 'Select at least one PSeq analysis.'), deliverableIds: z.array(z.string()).min(1, 'Select at least one deliverable.'),
  submissionInstructions: required, successCriteria: required, estimatedRetailValue: z.number().min(0), anticipatedInternalCost: z.number().min(0),
  residualRetentionDays: z.number().int().min(0), materialDisposition: z.enum(['Destroy', 'Return']), returnDestination: z.string(), returnHandling: z.string(), returnShippingPayer: z.string(), terms: required, reason: required,
}).superRefine((value, context) => {
  if (new Date(value.submissionClosesAtUtc) <= new Date(value.submissionOpensAtUtc)) context.addIssue({ code: 'custom', path: ['submissionClosesAtUtc'], message: 'Closing must follow opening.' })
  if (value.materialDisposition === 'Return') for (const key of ['returnDestination', 'returnHandling', 'returnShippingPayer'] as const) if (!value[key].trim()) context.addIssue({ code: 'custom', path: [key], message: 'Required for return of residual material.' })
})
type Values = z.infer<typeof schema>
const localDate = (value?: string) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ''
export function TrialScopePage({ trialId }: { trialId: string }) {
  const queries = useTrialQueries(trialId)
  if (!queries.staff) return <p className="p-6">Phaeno staff define Trial scope.</p>
  if (queries.detail.error || queries.config.error) return <p role="alert" className="p-6">{apiErrorMessage(queries.detail.error ?? queries.config.error)}</p>
  if (!queries.detail.data || !queries.config.data) return <p role="status" className="p-6">Loading Trial scope…</p>
  if (trialTerminal(queries.detail.data.status)) return <p className="p-6">This Trial is closed. Its scope is retained for reference.</p>
  return <ScopeEditor key={trialId} trial={queries.detail.data} configuration={queries.config.data} onReload={async () => { const result = await queries.detail.refetch(); if (result.error) throw result.error; return result.data! }} />
}
function ScopeEditor({ trial, configuration, onReload }: { trial: TrialDetail; configuration: TrialConfiguration; onReload: () => Promise<TrialDetail> }) {
  const values = trial.scope?.internalValues
  const [error, setError] = useState<string | null>(null); const [reloaded, setReloaded] = useState(false)
  const version = useRef(trial.version); const key = useRef(crypto.randomUUID())
  const mutation = useTrialMutation<TrialDetail>(); const navigate = useNavigate()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    departmentId: trial.departmentId ?? (configuration.departments.length === 1 ? configuration.departments[0].id : ''), name: values?.name ?? '', objective: values?.objective ?? '', sampleAllowance: values?.sampleAllowance,
    submissionOpensAtUtc: localDate(values?.submissionOpensAtUtc), submissionClosesAtUtc: localDate(values?.submissionClosesAtUtc), workflowVersionId: values?.workflowVersionId ?? (configuration.workflows.length === 1 ? configuration.workflows[0].id : ''),
    analysisIds: values?.analyses.map(value => value.id) ?? [], deliverableIds: values?.deliverables.map(value => value.id) ?? configuration.defaultDeliverableIds,
    submissionInstructions: values?.submissionInstructions ?? '', successCriteria: values?.successCriteria ?? '', estimatedRetailValue: values?.estimatedRetailValue ?? 0, anticipatedInternalCost: values?.anticipatedInternalCost ?? 0,
    residualRetentionDays: values?.residualRetentionDays ?? 30, materialDisposition: values?.materialDisposition ?? 'Destroy', returnDestination: values?.returnDestination ?? '', returnHandling: values?.returnHandling ?? '', returnShippingPayer: values?.returnShippingPayer ?? '',
    terms: values?.terms ?? 'Research use only. No PHI or direct personal identifiers. This is a no-charge, closed-ended PSeq evaluation; further work requires separate agreement.', reason: '',
  } })
  const disposition = useWatch({ control: form.control, name: 'materialDisposition' })
  const errorFor = (name: keyof Values) => form.formState.errors[name] ? <p id={`scope-${name}-error`} role="alert" className="text-sm text-destructive">{form.formState.errors[name]?.message}</p> : null
  function text(name: keyof Values, label: string, type: 'text' | 'number' | 'datetime-local' | 'textarea' = 'text', optional = false) {
    const attributes = { id: `scope-${name}`, 'aria-invalid': Boolean(form.formState.errors[name]), 'aria-describedby': `scope-${name}-error` }
    return <div className="space-y-1.5"><Label htmlFor={attributes.id}>{label}{optional ? null : <span aria-hidden="true">*</span>}</Label>{type === 'textarea' ? <Textarea {...attributes} rows={4} {...form.register(name)} /> : <Input {...attributes} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} {...form.register(name, { valueAsNumber: type === 'number' })} />}{errorFor(name)}</div>
  }
  function select(name: 'departmentId' | 'workflowVersionId' | 'materialDisposition', label: string, options: { id: string; name: string }[]) {
    return <div className="space-y-1.5"><Label htmlFor={`scope-${name}`}>{label}<span aria-hidden="true">*</span></Label><select id={`scope-${name}`} {...form.register(name)} aria-invalid={Boolean(form.formState.errors[name])} aria-describedby={`scope-${name}-error`} className="h-10 w-full cursor-pointer rounded-md border bg-background px-3 text-sm"><option value="">Select…</option>{options.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select>{errorFor(name)}</div>
  }
  async function submit(input: Values) {
    setError(null)
    try { await mutation.mutateAsync({ path: `/${trial.id}/scope`, payload: { ...input, version: version.current, submissionOpensAtUtc: new Date(input.submissionOpensAtUtc).toISOString(), submissionClosesAtUtc: new Date(input.submissionClosesAtUtc).toISOString() }, key: key.current }); await navigate({ to: '/trial-projects/$trialId', params: { trialId: trial.id } }) }
    catch (failure) { setError(apiErrorMessage(failure)); setReloaded(false) }
  }
  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6"><Link to="/trial-projects/$trialId" params={{ trialId: trial.id }} className="text-primary underline">Back to {trial.number}</Link><header><h1 className="text-2xl font-semibold">{trial.scope ? 'Amend Trial scope' : 'Define Trial scope'}</h1><p className="text-sm text-muted-foreground">Every revision requires independent Commercial and Scientific Operations approval, followed by Prospect acceptance. Dates use your local time zone.</p></header>
    <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">Purpose and allowance</legend>{text('name', 'Trial name')}{text('objective', 'Scientific objective', 'textarea')}{select('departmentId', 'Prospect department', configuration.departments)}{!configuration.departments.length ? <p role="alert">Link an active Prospect organization and department through the company’s CRM access request first.</p> : null}<div className="grid gap-4 sm:grid-cols-3">{text('sampleAllowance', 'Original sample allowance', 'number')}{text('submissionOpensAtUtc', 'Submission opens', 'datetime-local')}{text('submissionClosesAtUtc', 'Submission closes', 'datetime-local')}</div></fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">PSeq scientific requirements</legend>{select('workflowVersionId', 'Approved laboratory workflow', configuration.workflows)}
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">PSeq analyses<span aria-hidden="true">*</span></legend>{configuration.analyses.map(value => <label key={value.id} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" value={value.id} {...form.register('analysisIds')} className="mt-1 size-4 accent-primary" />{value.name} · version {value.version}</label>)}{errorFor('analysisIds')}</fieldset>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Deliverables<span aria-hidden="true">*</span></legend>{configuration.deliverables.map(value => <label key={value.id} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" value={value.id} {...form.register('deliverableIds')} className="mt-1 size-4 accent-primary" />{value.name} · revision {value.revision}</label>)}{errorFor('deliverableIds')}</fieldset>
        {text('submissionInstructions', 'Extracted RNA submission instructions', 'textarea')}{text('successCriteria', 'Acceptance and success criteria', 'textarea')}
      </fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">Material and terms</legend><p className="text-sm text-muted-foreground">Residual retention starts at terminal closure. Return arrangements are frozen once samples are submitted.</p><div className="grid gap-4 sm:grid-cols-2">{text('residualRetentionDays', 'Residual RNA retention days', 'number')}{select('materialDisposition', 'Planned disposition', [{ id: 'Destroy', name: 'Destroy after retention' }, { id: 'Return', name: 'Return under agreed arrangements' }])}</div>{disposition === 'Return' ? <>{text('returnDestination', 'Return destination', 'textarea')}{text('returnHandling', 'Return handling', 'textarea')}{text('returnShippingPayer', 'Return shipping payer')}</> : null}{text('terms', 'Prospect terms and RUO / no-PHI requirements', 'textarea')}</fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-semibold">Internal commercial context</legend><p className="text-sm text-muted-foreground">These values remain internal and do not create a charge, invoice, or payment gate.</p><div className="grid gap-4 sm:grid-cols-2">{text('estimatedRetailValue', 'Estimated retail value', 'number')}{text('anticipatedInternalCost', 'Anticipated internal cost', 'number')}</div>{text('reason', 'Reason for this scope revision', 'textarea')}</fieldset>
      {error ? <div role="alert" className="space-y-2 text-destructive"><p>{error}</p><Button type="button" variant="outline" onClick={async () => { try { const latest = await onReload(); version.current = latest.version; key.current = crypto.randomUUID(); setReloaded(true) } catch (failure) { setError(apiErrorMessage(failure)) } }}>Reload current Trial; keep my entries</Button></div> : null}
      {reloaded ? <p role="status">The current Trial was reloaded. Review your preserved entries before submitting again.</p> : null}
      <footer className="flex flex-wrap items-center gap-3"><span className="mr-auto text-xs text-muted-foreground">* Required</span><Button asChild variant="outline"><Link to="/trial-projects/$trialId" params={{ trialId: trial.id }}>Cancel</Link></Button><Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Submitting…' : 'Submit scope for approval'}</Button></footer>
    </form></main>
}
