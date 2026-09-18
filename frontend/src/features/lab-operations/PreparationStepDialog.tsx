import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getLabOperationsError } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredFieldName, RequiredDialogFooter } from '#/components/ui/required-field'
import type { PreparationDetail, PreparationStage, PreparationStepInput } from '#/api/lab-preparation'
import type { ProtocolDefinition } from './protocol-definition'
import { isAutomaticSpecimenReference, isOptionalPreparationReference, isOptionalSyntheticQcReference, isSharedIdentityCheckDate, preparationFailureReasons } from './preparation-evidence'
import { PreparationField, prepRowClass, prepSelectClass } from './preparation-ui'

import { PreparationResourceField } from './PreparationResourceField'
import { eligibleResources, emptyResourceCatalog, isResourceField, resourceEntries, stepResourceFields, type ResourceCatalog } from './preparation-resource-fields'

type Step = ProtocolDefinition['steps'][number]
const baseSchema = z.object({ values: z.record(z.string(), z.string()), covered: z.array(z.string()), outcome: z.enum(['recorded', 'skipped']), operator: z.boolean(), resources: z.boolean() })
const failureSchema = z.object({
  code: z.string().refine(value => preparationFailureReasons.some(reason => reason.value === value), 'Choose a failure reason.'),
  reason: z.string().trim().min(1, 'Record the reason and evidence.').max(4000, 'Use 4,000 characters or fewer.'),
})
type Values = z.infer<typeof baseSchema>
function TubeEvidenceCard({ title, action, children, invalid = false }: { title: string; action: ReactNode; children: ReactNode; invalid?: boolean }) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  useEffect(() => { if (invalid) setOpen(true) }, [invalid])
  return <section className={prepRowClass}>
    <div className="flex items-start justify-between gap-3">
      <h4 className="min-w-0"><button type="button" className="flex min-h-8 cursor-pointer items-center gap-2 rounded-sm text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(value => !value)}><ChevronRight aria-hidden="true" className={`size-4 shrink-0 ${open ? 'rotate-90' : ''}`} /><span className="wrap-anywhere">{title}</span></button></h4>
      {action}
    </div>
    <div id={contentId} hidden={!open} className="mt-4 space-y-4">{children}</div>
  </section>
}
export function PreparationStepDialog({ batch, stage, step: sourceStep, action, onClose, onSubmit, pending, error, resourceCatalog = emptyResourceCatalog, catalogError, onFail, onFailureExit, preview, previewControls, suspended = false }: {
  resourceCatalog?: ResourceCatalog; catalogError?: string; preview?: boolean; previewControls?: ReactNode; suspended?: boolean
  onFail?: (memberId: string, reasonCode: string, reason: string) => Promise<unknown>; onFailureExit?: () => void
  batch: PreparationDetail; stage: PreparationStage; step: Step; action: 'record' | 'repeat' | 'correct'; onClose: () => void; onSubmit: (input: PreparationStepInput, report?: File) => void; pending: boolean; error?: string; onResource?: (action: 'material' | 'equipment' | 'output', coveredMemberIds: string[]) => void
}) {
  const step: Step = { ...sourceStep, captures: sourceStep.captures.map(c => ({ ...c, scope: c.scope ?? 'tube' })), qcGate: sourceStep.qcGate ? { ...sourceStep.qcGate, scope: sourceStep.qcGate.scope ?? 'tube' } : sourceStep.qcGate }
  const [failureMemberId, setFailureMemberId] = useState<string | null>(null)
  const [recordException, setRecordException] = useState(false)
  const resources = stepResourceFields(step)
  const catalog = eligibleResources(resourceCatalog)
  const [qcReport, setQcReport] = useState<File>()
  const preparationReport = step.attachmentKind === 'preparation' || !step.attachmentKind && step.captures.some(c => isOptionalPreparationReference(batch, step, c))
  const allowsReport = step.attachmentKind !== 'none' && (Boolean(step.attachmentKind) || preparationReport || Boolean(batch.optionalQcReports && step.qcGate))
  const reportRequired = allowsReport && Boolean(step.attachmentRequired)
  const reportInput = useRef<HTMLInputElement>(null)
  const [savedFailures, setSavedFailures] = useState<Record<string, string>>({})
  const [failureNotice, setFailureNotice] = useState('')
  const [failureError, setFailureError] = useState<string>()
  const failing = useRef(false)
  const failureButtons = useRef<Record<string, HTMLButtonElement | null>>({})
  const returnTo = useRef<string | null>(null)
  const noticeRef = useRef<HTMLParagraphElement>(null)
  const failureMember = batch.members.find(m => m.id === failureMemberId)
  const failureForm = useForm<z.infer<typeof failureSchema>>({ resolver: zodResolver(failureSchema), defaultValues: { code: '', reason: '' } })
  const failedMembers = batch.members.filter(m => m.state === 'Failed' || savedFailures[m.id] !== undefined)
  const isFailed = (id: string) => failedMembers.some(m => m.id === id)
  const applicable = batch.members.filter(m => !isFailed(m.id) && !['Succeeded', 'Cancelled'].includes(m.state) && !m.blocker && m.executions.some(e => e.stageId === stage.id && ['InProgress', 'Blocked'].includes(e.status) && !e.stepPrerequisites?.[step.key]?.length)
    && (preview || (action === 'record' ? !m.executions.find(e => e.stageId === stage.id)?.evidence.records.some(r => r.stepKey === step.key) : m.executions.find(e => e.stageId === stage.id)?.evidence.records.some(r => r.stepKey === step.key))))
  const manualCaptures = step.captures.filter(c =>
    !isResourceField(c) && !isAutomaticSpecimenReference(batch, c) && !isOptionalSyntheticQcReference(batch, step, c) && !isOptionalPreparationReference(batch, step, c))
  const recordsSpecimenReference = step.captures.some(c => isAutomaticSpecimenReference(batch, c))
  const rationaleSuppliesCondition = action === 'record' && Boolean(step.condition) && !step.qcGate
    && manualCaptures.some(c => c.key === 'review-rationale' && c.type === 'text' && c.required && (c.scope === 'shared' || c.scope === 'batch'))
  const hasMaterialExceptions = action !== 'correct' && resources.some(f => f.type === 'material' && f.scope === 'shared')
  const hasValueExceptions = manualCaptures.some(c => c.scope === 'shared' && !isSharedIdentityCheckDate(c)) || step.qcGate?.scope === 'shared'
  const hasExceptions = hasMaterialExceptions || hasValueExceptions
  const hasIndividual = manualCaptures.some(c => c.scope === 'tube') || resources.some(c => c.scope === 'tube') || step.qcGate?.scope === 'tube'
  const showTubeReason = hasValueExceptions && recordException || step.qcGate?.scope === 'tube'
  const schema = baseSchema.transform(v => ({ ...v, covered: applicable.map(m => m.id) })).superRefine((v, ctx) => {
    if (!v.covered.length) ctx.addIssue({ code: 'custom', path: ['covered'], message: 'No tubes remain eligible for this entry.' })
    const requiredValue = (key: string, label: string) => { if (!v.values[key]?.trim()) ctx.addIssue({ code: 'custom', path: ['values', key], message: `${label} is required.` }) }
    if (v.outcome === 'skipped' || action !== 'record' || step.condition && !rationaleSuppliesCondition) requiredValue('reason', 'Reason')
    if (v.outcome === 'skipped') return
    if (reportRequired && !qcReport) ctx.addIssue({ code: 'custom', path: ['values', 'qc_report'], message: 'Attach the required report before saving the step record.' })
    if (qcReport && (!qcReport.name.toLowerCase().endsWith('.pdf') || qcReport.size < 5 || qcReport.size > 10 * 1024 * 1024)) ctx.addIssue({ code: 'custom', path: ['values', 'qc_report'], message: 'Choose a nonempty PDF report no larger than 10 MB.' })
    if (step.operatorConfirmation && !v.operator) ctx.addIssue({ code: 'custom', path: ['operator'], message: 'Confirm that you performed this step.' })
    if (step.inputMaterials.length + step.equipmentTypes.length + step.preparedOutputs.length > 0 && !v.resources) ctx.addIssue({ code: 'custom', path: ['resources'], message: 'Confirm the listed resources and outputs.' })
    for (const capture of manualCaptures) {
      const keys = capture.scope === 'tube' ? v.covered.map(id => `${id}_${capture.key}`) : [`shared_${capture.key}`, ...(capture.scope === 'shared' && recordException && !isSharedIdentityCheckDate(capture) ? v.covered.map(id => `${id}_${capture.key}`) : [])]
      for (const key of keys) {
        if (capture.required && (capture.scope === 'tube' || key.startsWith('shared_'))) requiredValue(key, capture.label)
        if (capture.sourceTube && v.values[key]?.trim() && applicable.find(m => key === `${m.id}_${capture.key}`)?.barcode !== v.values[key].trim()) ctx.addIssue({ code: 'custom', path: ['values', key], message: 'Scan the source barcode shown for this tube.' })
        if (capture.type === 'choice' && v.values[key]?.trim() && !capture.options?.includes(v.values[key])) ctx.addIssue({ code: 'custom', path: ['values', key], message: 'Choose a listed value.' })
        if (capture.type === 'date' && v.values[key]?.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(v.values[key])) ctx.addIssue({ code: 'custom', path: ['values', key], message: 'Enter a valid date.' })
        if (capture.type === 'number' && v.values[key]?.trim() && !Number.isFinite(Number(v.values[key]))) ctx.addIssue({ code: 'custom', path: ['values', key], message: 'Enter a valid number.' })
      }
    }
    if (step.qcGate) {
      const keys = step.qcGate.scope === 'tube' ? v.covered.map(id => `${id}_qc`) : ['shared_qc']
      keys.forEach(key => requiredValue(key, 'QC outcome'))
      if (v.values.shared_qc && v.values.shared_qc !== 'pass') requiredValue('reason', 'QC reason')
    }
    if (action !== 'correct') Object.entries(resourceEntries(resources, applicable, v.values, catalog).errors).forEach(([key, message]) => ctx.addIssue({ code: 'custom', path: ['values', key], message }))
    for (const id of v.covered) {
      if (manualCaptures.some(c => c.scope === 'shared' && recordException && !isSharedIdentityCheckDate(c) && v.values[`${id}_${c.key}`]?.trim()) || step.qcGate?.scope === 'shared' && recordException && v.values[`${id}_qc`]
        || step.qcGate?.scope === 'tube' && v.values[`${id}_qc`] && v.values[`${id}_qc`] !== 'pass') requiredValue(`${id}_reason`, 'Tube exception or QC reason')
    }
  })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { values: {}, covered: applicable.map(m => m.id), outcome: 'recorded', operator: false, resources: false } })
  const covered = applicable.map(m => m.id)
  const excluded = batch.members.filter(m => !covered.includes(m.id))
  const exclusionReason = (member: PreparationDetail['members'][number]) => {
    if (isFailed(member.id)) return `Failed: ${savedFailures[member.id] || member.failureEvidence || 'Attempt closed as failed.'}`
    if (member.blocker) return member.blocker
    if (['Succeeded', 'Cancelled'].includes(member.state)) return `Attempt ${member.state.toLowerCase()}.`
    const execution = member.executions.find(e => e.stageId === stage.id)
    if (!execution || !['InProgress', 'Blocked'].includes(execution.status)) return 'This protocol is not active for this tube.'
    if (execution.stepPrerequisites?.[step.key]?.length) return execution.stepPrerequisites[step.key].join(' ')
    return action === 'record' ? 'This step already has a record.' : 'No previous entry is available for this action.'
  }
  const skipped = form.watch('outcome') === 'skipped'
  const showSamples = !skipped && (hasIndividual || hasExceptions && recordException)
  const visibleMembers = showSamples ? batch.members.filter(m => isFailed(m.id) || covered.includes(m.id)) : []
  const toggleExceptions = (checked: boolean) => {
    setRecordException(checked)
    if (!checked) for (const member of batch.members) {
      for (const field of resources.filter(f => f.scope === 'shared')) for (const part of ['exception', 'quantity', 'unknown', 'reason', 'disposition']) { const key = `${member.id}_${field.key}_${part}`; form.setValue(`values.${key}`, ''); form.clearErrors(`values.${key}`) }
      for (const field of manualCaptures.filter(c => c.scope === 'shared' && !isSharedIdentityCheckDate(c))) { const key = `${member.id}_${field.key}`; form.setValue(`values.${key}`, ''); form.clearErrors(`values.${key}`) }
      if (step.qcGate?.scope === 'shared') { form.setValue(`values.${member.id}_qc`, ''); form.clearErrors(`values.${member.id}_qc`) }
      if (step.qcGate?.scope !== 'tube') { form.setValue(`values.${member.id}_reason`, ''); form.clearErrors(`values.${member.id}_reason`) }
    }
  }
  const failurePending = pending || failureForm.formState.isSubmitting
  const canFail = Boolean(onFail) && batch.canOperate && batch.status === 'InProgress'
  const returnFromFailure = () => {
    if (failing.current || pending) return
    setFailureMemberId(null)
    setFailureError(undefined)
    onFailureExit?.()
  }
  useEffect(() => {
    if (failureMemberId) failureForm.setFocus('code')
    else if (returnTo.current) {
      const target = failureButtons.current[returnTo.current]
      returnTo.current = null
      if (target) target.focus()
      else noticeRef.current?.focus()
    }
  }, [failureMemberId, failureForm])
  const submitFailure = async (values: z.infer<typeof failureSchema>) => {
    if (!failureMember || !canFail || failing.current || pending) return
    failing.current = true
    setFailureError(undefined)
    try {
      await onFail!(failureMember.id, values.code, values.reason)
      setSavedFailures(saved => ({ ...saved, [failureMember.id]: values.reason }))
      form.setValue('operator', false)
      setFailureNotice(`${failureMember.position} · ${failureMember.barcode} was closed as failed. It remains in its tray position and is shown below as read-only, excluded from further processing. Other entries are preserved; review the remaining tube coverage before saving.`)
      setFailureMemberId(null)
      onFailureExit?.()
    } catch (cause) {
      setFailureError(getLabOperationsError(cause, 'The failure could not be saved. Review the tube and try again.'))
    } finally {
      failing.current = false
    }
  }
  const captureInput = (capture: Step['captures'][number], prefix: string, required: boolean) => {
    const key = `${prefix}_${capture.key}`
    return <PreparationField key={key} id={key} label={`${capture.label}${capture.unit ? ` (${capture.unit})` : ''}`} required={required} error={form.formState.errors.values?.[key]?.message}>
      {capture.type === 'choice' ? <select id={key} className={prepSelectClass} {...form.register(`values.${key}`)}><option value="">{!required && capture.scope === 'shared' ? 'Use shared value' : 'Choose…'}</option>{capture.options?.map(o => <option key={o}>{o}</option>)}</select>
        : <Input id={key} type={capture.type === 'number' ? 'number' : capture.type === 'date' ? 'date' : 'text'} step="any" placeholder={!required && capture.scope === 'shared' ? 'Use shared value' : undefined} {...form.register(`values.${key}`)} />}
    </PreparationField>
  }
  const qcInput = (prefix: string, required: boolean) => <PreparationField id={`${prefix}_qc`} label="QC outcome" required={required} error={form.formState.errors.values?.[`${prefix}_qc`]?.message}>
    <select id={`${prefix}_qc`} className={prepSelectClass} {...form.register(`values.${prefix}_qc`)}><option value="">{required ? 'Choose an outcome…' : 'Use shared outcome'}</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="hold">Hold</option></select>
  </PreparationField>
  const submit = (v: Values) => {
    const captures = (prefix: string, scopes: string[]) => Object.fromEntries(manualCaptures.filter(c => scopes.includes(c.scope ?? '') && (prefix === 'shared' || !isSharedIdentityCheckDate(c) && (c.scope !== 'shared' || recordException)) && v.values[`${prefix}_${c.key}`]?.trim()).map(c => [c.key, c.type === 'number' ? Number(v.values[`${prefix}_${c.key}`]) : v.values[`${prefix}_${c.key}`]]))
    onSubmit({ stageId: stage.id, stepKey: step.key, action, outcome: v.outcome, coveredMemberIds: v.covered,
      sharedCaptures: skipped ? {} : captures('shared', ['batch', 'shared']),
      tubes: skipped ? [] : v.covered.map(id => ({ memberId: id, captures: captures(id, ['tube', 'shared']), qcOutcome: step.qcGate?.scope === 'tube' || recordException && step.qcGate?.scope === 'shared' ? v.values[`${id}_qc`] || null : null, reason: showTubeReason ? v.values[`${id}_reason`] || null : null })),
      sharedQcOutcome: skipped ? null : v.values.shared_qc || null,
      reason: !skipped && rationaleSuppliesCondition ? v.values['shared_review-rationale']?.trim() || null : v.values.reason || null, coverageConfirmed: true,
      operatorConfirmed: !skipped && v.operator, resourcesConfirmed: !skipped && v.resources, resourceEntries: skipped || action === 'correct' ? [] : resourceEntries(resources, applicable, v.values, catalog).entries }, skipped ? undefined : qcReport)
  }
  return <Dialog open={!suspended} onOpenChange={open => { if (!open && !pending && !failing.current) { if (failureMember) returnFromFailure(); else onClose() } }}><DialogContent className={failureMember ? 'sm:max-w-lg' : 'sm:max-w-3xl'}>{failureMember ? <form className="contents" onSubmit={failureForm.handleSubmit(submitFailure)} noValidate>
    <DialogHeader><DialogTitle>Close attempt as failed: {failureMember.position} · {failureMember.barcode}</DialogTitle><DialogDescription>This closes this tube attempt and prevents it from producing a successful library. The tube remains visible in its tray position with its failure reason and history. Entries for the other tubes will be preserved.</DialogDescription>{failureError ? <p role="alert" className="text-sm text-destructive">{failureError}</p> : null}</DialogHeader>
    <div className="space-y-4">
      <PreparationField id="step-failure-code" label="Failure reason" required error={failureForm.formState.errors.code?.message}><select id="step-failure-code" className={prepSelectClass} disabled={failurePending} {...failureForm.register('code')}><option value="">Choose…</option>{preparationFailureReasons.map(reason => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></PreparationField>
      <PreparationField id="step-failure-reason" label="Reason and evidence" required error={failureForm.formState.errors.reason?.message}><textarea id="step-failure-reason" className={`${prepSelectClass} min-h-24 py-2`} disabled={failurePending} {...failureForm.register('reason')} /></PreparationField>
    </div>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={failurePending} onClick={returnFromFailure}>Back to step</Button><Button type="submit" variant="destructive" disabled={failurePending || !canFail}>{failurePending ? 'Saving…' : 'Close attempt as failed'}</Button></RequiredDialogFooter>
  </form> : <form className="contents" onSubmit={form.handleSubmit(submit)} noValidate>
    <DialogHeader><DialogTitle>{preview ? 'Configuration preview · ' : ''}{action === 'record' ? 'Record step' : action === 'repeat' ? 'Repeat step' : 'Correct step'}: {step.name}</DialogTitle><DialogDescription>{stage.name}. Batch entries apply to all eligible samples.{hasIndividual ? ' Individual sample entries are recorded below.' : ''}{hasExceptions ? ' Select Record exception only when a sample differs.' : ''}</DialogDescription>{preview ? <p className="text-sm font-medium">Fictional example tubes. Validation only; nothing is recorded or uploaded.</p> : null}{previewControls}</DialogHeader>
    <div className="space-y-5">{resources.length > 0 && !preview && (!batch.inlineResourceFields || resources.some(f => f.type === 'material') && !batch.configuredMaterials) ? <p role="alert">These fields require an application update before they can be saved. Refresh after the update; your entries have not been submitted.</p> : null}{failureNotice ? <p ref={noticeRef} tabIndex={-1} role="status" className="rounded-md border p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{failureNotice}</p> : null}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<p className="whitespace-pre-wrap text-sm">{step.instructions}</p>{step.condition ? <p className="text-sm">Condition: {step.condition}</p> : null}
      <div className="space-y-2 rounded-lg border p-3" aria-label="Tube coverage">
        <p className="text-sm font-medium">Applies to {covered.length} {covered.length === 1 ? 'tube' : 'tubes'}{excluded.length ? ` · ${excluded.length} excluded` : ''}</p>
        <p className="text-sm text-muted-foreground">Every eligible tube is included automatically.</p>
        <details className="text-sm"><summary className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View tube coverage</summary><ul className="mt-2 space-y-2">{batch.members.map(member => <li key={member.id}>{member.position} · {member.barcode} · {member.jobName} — {covered.includes(member.id) ? 'Included' : exclusionReason(member)}{!showSamples && canFail && covered.includes(member.id) ? <Button type="button" variant="outline" size="sm" className="ml-2 text-destructive" disabled={pending} ref={element => { failureButtons.current[member.id] = element }} onClick={() => { returnTo.current = member.id; failureForm.reset({ code: '', reason: '' }); setFailureError(undefined); setFailureMemberId(member.id) }}>Close attempt as failed</Button> : null}</li>)}</ul></details>
        {!applicable.length ? <p>No tubes are eligible for this action.</p> : null}
        {form.formState.errors.covered ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.covered.message}</p> : null}
      </div>
      {!step.required ? <PreparationField label="Decision" id="prep-decision" required><select id="prep-decision" className={prepSelectClass} {...form.register('outcome')}><option value="recorded">Performed</option><option value="skipped">Skip with reason</option></select></PreparationField> : null}
      {!skipped ? <>
        {manualCaptures.some(c => c.scope !== 'tube') || resources.length > 0 || step.qcGate && step.qcGate.scope !== 'tube' ? <div className={`${prepRowClass} space-y-4`}>
          <h3 className="font-medium">Batch entries</h3>
          {manualCaptures.filter(c => c.scope !== 'tube').map(c => captureInput(c, 'shared', c.required))}
          {manualCaptures.some(isSharedIdentityCheckDate) ? <p className="text-sm text-muted-foreground">This identity check date is recorded for every tube covered by this entry.</p> : null}
          {step.qcGate && step.qcGate.scope !== 'tube' ? <><p className="text-sm">{step.qcGate.criteria}</p>{qcInput('shared', true)}</> : null}
        {catalogError && resources.length ? <p role="alert" className="text-sm text-destructive">{catalogError}</p> : null}
        {resources.filter(f => ['batch', 'shared'].includes(f.scope ?? '') || f.type === 'output' && action !== 'correct').map(field => <PreparationResourceField key={field.key} field={field} form={form} catalog={catalog} count={field.scope === 'shared' ? applicable.filter(m => form.watch(`values.${m.id}_${field.key}_exception`) !== 'yes').length : covered.length} defaults={field.type === 'output'} correction={action === 'correct'} previous={applicable[0]?.executions.find(e => e.stageId === stage.id)?.evidence.records.filter(r => r.stepKey === step.key).at(-1)?.captures[field.key]} />)}
        {action === 'correct' && resources.length ? <p className="text-sm text-muted-foreground">Resource use is retained. This correction does not consume stock again or replace an output.</p> : null}
        </div> : null}
      </> : null}
        {!skipped && hasExceptions ? <div className="space-y-1"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="size-4" aria-describedby="sample-exception-help" checked={recordException} onChange={e => toggleExceptions(e.target.checked)} />Record exception</label><p id="sample-exception-help" className="text-xs text-muted-foreground">Turning this off clears sample overrides.</p></div> : null}
        {visibleMembers.length ? <h3 className="font-medium">Sample entries and exceptions</h3> : null}
        {visibleMembers.map(m => {
          const failed = isFailed(m.id)
          const recorded = m.executions.find(e => e.stageId === stage.id)?.evidence.records.filter(r => r.stepKey === step.key).at(-1)
          const draftCaptures = manualCaptures.filter(c => form.getValues(`values.${m.id}_${c.key}`)?.trim())
          return <TubeEvidenceCard key={m.id} invalid={Object.keys(form.formState.errors.values ?? {}).some(key => key.startsWith(`${m.id}_`))} title={`${m.position} · ${m.barcode}`} action={failed ? <Badge variant="destructive">Failed</Badge> : canFail ? <Button type="button" variant="outline" size="sm" className="shrink-0 text-destructive" ref={element => { failureButtons.current[m.id] = element }} disabled={pending || hasMaterialExceptions && recordException} title={hasMaterialExceptions && recordException ? 'Choose the outcome in the material exception and save the step to retain consumption.' : undefined} aria-label={`Close attempt as failed for ${m.position}, tube ${m.barcode}`} onClick={() => { returnTo.current = m.id; failureForm.reset({ code: '', reason: '' }); setFailureError(undefined); setFailureMemberId(m.id) }}>Close attempt as failed</Button> : null}>
          <dl className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-2">
            <div className="min-w-0"><dt className="text-xs text-muted-foreground">Customer sample ID</dt><dd className="wrap-anywhere">{m.customerSampleId === undefined ? 'Not available' : m.customerSampleId?.trim() || 'Not recorded'}</dd></div>
            <div className="min-w-0"><dt className="text-xs text-muted-foreground">Specimen type</dt><dd className="wrap-anywhere">{m.biologicalSource?.trim() || 'Not recorded'}</dd></div>
            <div className="min-w-0 sm:col-span-2"><dt className="text-xs text-muted-foreground">Accession reference</dt><dd>{preview ? <span>{m.specimenName}</span> : <Link className="wrap-anywhere underline" to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId: m.workOrderId, specimenId: m.specimenId }} search={{ section: 'work' }} target="_blank" rel="noopener noreferrer" aria-label={`Open specimen ${m.specimenName} in a new tab`}>{m.specimenName}</Link>}</dd></div>
          </dl>
          {failed ? <>
            <p className="text-sm">Remains in tray position {m.position}. This attempt is closed and cannot receive further step records or supply a successful library.</p>
            <div><h5 className="text-sm font-medium">Reason and evidence</h5><p className="whitespace-pre-wrap break-words text-sm">{m.failureEvidence?.trim() || savedFailures[m.id] || 'No failure reason available.'}</p></div>
            {recorded ? <div className="space-y-2 text-sm"><h5 className="font-medium">Step record</h5><dl className="space-y-2">{Object.entries(recorded.captures).map(([key, value]) => <div key={key}><dt className="text-muted-foreground">{step.captures.find(c => c.key === key)?.label ?? key}</dt><dd className="whitespace-pre-wrap break-words">{String(value)}</dd></div>)}</dl>{recorded.qcOutcome ? <p>QC outcome: {recorded.qcOutcome}</p> : null}{recorded.reason ? <p className="whitespace-pre-wrap break-words">{recorded.reason}</p> : null}</div> : null}
            {draftCaptures.length ? <div className="space-y-2 text-sm"><h5 className="font-medium">Unsaved entries — for reference only</h5><dl className="space-y-2">{draftCaptures.map(c => <div key={c.key}><dt className="text-muted-foreground">{c.label}</dt><dd className="whitespace-pre-wrap break-words">{form.getValues(`values.${m.id}_${c.key}`)}</dd></div>)}</dl></div> : null}
          </> : <>
            {resources.filter(f => f.scope === 'tube' || f.scope === 'shared' && recordException).map(field => <PreparationResourceField key={field.key} field={field} member={m} form={form} catalog={catalog} count={covered.length} correction={action === 'correct'} previous={recorded?.captures[field.key]} />)}
            {recordsSpecimenReference ? <p className="text-sm text-muted-foreground">POMS records this accession reference automatically. Verify the specimen details against the tube you are processing.</p> : null}
            {manualCaptures.filter(c => (c.scope === 'tube' || c.scope === 'shared' && recordException) && !isSharedIdentityCheckDate(c)).map(c => captureInput(c, m.id, c.scope === 'tube' && c.required))}{step.qcGate && (step.qcGate.scope === 'tube' || step.qcGate.scope === 'shared' && recordException) ? <><p className="text-sm">{step.qcGate.criteria}</p>{qcInput(m.id, step.qcGate.scope === 'tube')}</> : null}{showTubeReason ? <PreparationField label="Tube exception or QC reason" id={`${m.id}_reason`} error={form.formState.errors.values?.[`${m.id}_reason`]?.message}><Input id={`${m.id}_reason`} {...form.register(`values.${m.id}_reason`)} /></PreparationField> : null}
          </>}</TubeEvidenceCard>
        })}
      {!skipped ? <>

        {step.inputMaterials.length + step.equipmentTypes.length + step.preparedOutputs.length ? <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug"><input type="checkbox" aria-required aria-invalid={Boolean(form.formState.errors.resources)} className="mt-0.5 size-4 shrink-0" {...form.register('resources')} /><RequiredFieldName>I confirmed the listed inputs, outputs and equipment and recorded their traceability.</RequiredFieldName></label> : null}
      </> : null}
      {!rationaleSuppliesCondition || skipped ? <PreparationField label="Reason or condition assessment" id="prep-step-reason" required={skipped || action !== 'record' || Boolean(step.condition)} error={form.formState.errors.values?.reason?.message}><textarea id="prep-step-reason" className={`${prepSelectClass} min-h-20 py-2`} {...form.register('values.reason')} /></PreparationField> : null}
        {!skipped && allowsReport ? <div className={`${prepRowClass} space-y-2`} >
          <PreparationField label={`${preparationReport ? 'Preparation report or worksheet' : 'QC report'}${reportRequired ? '' : ' (optional)'}`} required={reportRequired} id="prep-qc-report" error={form.formState.errors.values?.qc_report?.message}>
            <Input ref={reportInput} id="prep-qc-report" type="file" aria-required={reportRequired || undefined} accept=".pdf,application/pdf" disabled={pending} aria-describedby="prep-qc-report-help" onChange={event => { setQcReport(event.target.files?.[0]); form.clearErrors('values.qc_report') }} />
          </PreparationField>
          <p id="prep-qc-report-help" className="text-xs leading-relaxed text-muted-foreground">Attach a PDF up to 10 MB for the included tubes. {preview ? 'The selection stays local and is discarded when preview closes.' : 'It uploads when you save the step record.'} {reportRequired ? 'A report is required for a performed step.' : 'You can continue without a report.'}</p>
          {qcReport ? <div className="flex flex-wrap items-center gap-2"><p className="min-w-0 break-all text-sm">Selected: {qcReport.name}</p><Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => { setQcReport(undefined); if (reportInput.current) reportInput.current.value = ''; form.clearErrors('values.qc_report') }}>Remove report</Button></div> : null}
        </div> : null}
        {!skipped && step.operatorConfirmation ? <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug"><input type="checkbox" aria-required aria-invalid={Boolean(form.formState.errors.operator)} className="mt-0.5 size-4 shrink-0" {...form.register('operator')} /><RequiredFieldName>I performed this step according to its pinned instructions.</RequiredFieldName></label> : null}
      {(['operator', 'resources'] as const).map(key => form.formState.errors[key] ? <p key={key} role="alert" className="text-sm text-destructive">{form.formState.errors[key]?.message}</p> : null)}
    </div><RequiredDialogFooter><Button type="button" variant="outline" disabled={pending} onClick={onClose}>{preview ? 'Return to configuration' : 'Cancel'}</Button><Button type="submit" disabled={pending || !applicable.length || resources.length > 0 && !preview && (!batch.inlineResourceFields || resources.some(f => f.type === 'material') && !batch.configuredMaterials)}>{pending ? 'Saving…' : preview ? 'Validate entry' : 'Save step record'}</Button></RequiredDialogFooter>
  </form>}</DialogContent></Dialog>
}
