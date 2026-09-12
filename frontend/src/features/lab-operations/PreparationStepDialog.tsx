import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredFieldName, RequiredDialogFooter } from '#/components/ui/required-field'
import type { PreparationDetail, PreparationStage, PreparationStepInput } from '#/api/lab-preparation'
import type { ProtocolDefinition } from './protocol-definition'
import { PreparationActions, PreparationField, prepRowClass, prepSelectClass } from './preparation-ui'

type Step = ProtocolDefinition['steps'][number]
const baseSchema = z.object({ values: z.record(z.string(), z.string()), covered: z.array(z.string()).min(1, 'Select at least one tube.'), outcome: z.enum(['recorded', 'skipped']), confirmed: z.boolean(), operator: z.boolean(), resources: z.boolean() })
type Values = z.infer<typeof baseSchema>
export function PreparationStepDialog({ batch, stage, step, action, onClose, onSubmit, pending, error, onResource }: {
  batch: PreparationDetail; stage: PreparationStage; step: Step; action: 'record' | 'repeat' | 'correct'; onClose: () => void; onSubmit: (input: PreparationStepInput) => void; pending: boolean; error?: string; onResource: (action: 'material' | 'equipment' | 'output', coveredMemberIds: string[]) => void
}) {
  const applicable = batch.members.filter(m => !['Failed', 'Succeeded', 'Cancelled'].includes(m.state) && !m.blocker && m.executions.some(e => e.stageId === stage.id && ['InProgress', 'Blocked'].includes(e.status) && !e.stepPrerequisites?.[step.key]?.length)
    && (action === 'record' ? !m.executions.find(e => e.stageId === stage.id)?.evidence.records.some(r => r.stepKey === step.key) : m.executions.find(e => e.stageId === stage.id)?.evidence.records.some(r => r.stepKey === step.key)))
  const schema = baseSchema.superRefine((v, ctx) => {
    if (!v.confirmed) ctx.addIssue({ code: 'custom', path: ['confirmed'], message: 'Confirm the covered tubes.' })
    const requiredValue = (key: string, label: string) => { if (!v.values[key]?.trim()) ctx.addIssue({ code: 'custom', path: ['values', key], message: `${label} is required.` }) }
    if (v.outcome === 'skipped' || action !== 'record' || step.condition) requiredValue('reason', 'Reason')
    if (v.outcome === 'skipped') return
    if (step.operatorConfirmation && !v.operator) ctx.addIssue({ code: 'custom', path: ['operator'], message: 'Confirm that you performed this step.' })
    if (step.inputMaterials.length + step.equipmentTypes.length + step.preparedOutputs.length > 0 && !v.resources) ctx.addIssue({ code: 'custom', path: ['resources'], message: 'Confirm the listed resources and outputs.' })
    for (const capture of step.captures) {
      const keys = capture.scope === 'tube' ? v.covered.map(id => `${id}_${capture.key}`) : [`shared_${capture.key}`]
      for (const key of keys) {
        if (capture.required) requiredValue(key, capture.label)
        if (capture.type === 'number' && v.values[key]?.trim() && !Number.isFinite(Number(v.values[key]))) ctx.addIssue({ code: 'custom', path: ['values', key], message: 'Enter a valid number.' })
      }
    }
    if (step.qcGate) {
      const keys = step.qcGate.scope === 'tube' ? v.covered.map(id => `${id}_qc`) : ['shared_qc']
      keys.forEach(key => requiredValue(key, 'QC outcome'))
      if (v.values.shared_qc && v.values.shared_qc !== 'pass') requiredValue('reason', 'QC reason')
    }
    for (const id of v.covered) {
      if (step.captures.some(c => c.scope === 'shared' && v.values[`${id}_${c.key}`]?.trim()) || step.qcGate?.scope === 'shared' && v.values[`${id}_qc`]
        || step.qcGate?.scope === 'tube' && v.values[`${id}_qc`] && v.values[`${id}_qc`] !== 'pass') requiredValue(`${id}_reason`, 'Tube exception or QC reason')
    }
  })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { values: {}, covered: applicable.map(m => m.id), outcome: 'recorded', confirmed: false, operator: false, resources: false } })
  const covered = form.watch('covered')
  const skipped = form.watch('outcome') === 'skipped'
  const captureInput = (capture: Step['captures'][number], prefix: string, required: boolean) => {
    const key = `${prefix}_${capture.key}`
    return <PreparationField key={key} id={key} label={`${capture.label}${capture.unit ? ` (${capture.unit})` : ''}`} required={required} error={form.formState.errors.values?.[key]?.message}>
      {capture.type === 'choice' ? <select id={key} className={prepSelectClass} {...form.register(`values.${key}`)}><option value="">{required ? 'Choose…' : 'Use shared value'}</option>{capture.options?.map(o => <option key={o}>{o}</option>)}</select>
        : <Input id={key} type={capture.type === 'number' ? 'number' : capture.type === 'date' ? 'date' : 'text'} step="any" placeholder={required ? undefined : 'Use shared value'} {...form.register(`values.${key}`)} />}
    </PreparationField>
  }
  const qcInput = (prefix: string, required: boolean) => <PreparationField id={`${prefix}_qc`} label="QC outcome" required={required} error={form.formState.errors.values?.[`${prefix}_qc`]?.message}>
    <select id={`${prefix}_qc`} className={prepSelectClass} {...form.register(`values.${prefix}_qc`)}><option value="">{required ? 'Choose an outcome…' : 'Use shared outcome'}</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="hold">Hold</option></select>
  </PreparationField>
  const submit = (v: Values) => {
    const captures = (prefix: string, scopes: string[]) => Object.fromEntries(step.captures.filter(c => scopes.includes(c.scope ?? '') && v.values[`${prefix}_${c.key}`]?.trim()).map(c => [c.key, c.type === 'number' ? Number(v.values[`${prefix}_${c.key}`]) : v.values[`${prefix}_${c.key}`]]))
    onSubmit({ stageId: stage.id, stepKey: step.key, action, outcome: v.outcome, coveredMemberIds: v.covered,
      sharedCaptures: skipped ? {} : captures('shared', ['batch', 'shared']),
      tubes: skipped ? [] : v.covered.map(id => ({ memberId: id, captures: captures(id, ['tube', 'shared']), qcOutcome: v.values[`${id}_qc`] || null, reason: v.values[`${id}_reason`] || null })),
      sharedQcOutcome: skipped ? null : v.values.shared_qc || null, reason: v.values.reason || null, coverageConfirmed: v.confirmed,
      operatorConfirmed: !skipped && v.operator, resourcesConfirmed: !skipped && v.resources })
  }
  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose() }}><DialogContent className="sm:max-w-3xl"><form className="contents" onSubmit={form.handleSubmit(submit)} noValidate>
    <DialogHeader><DialogTitle>{action === 'record' ? 'Record step' : action === 'repeat' ? 'Repeat step' : 'Correct step'}: {step.name}</DialogTitle><DialogDescription>{stage.name}. Shared values remain shared observations; tube values and exceptions retain their own identity.</DialogDescription></DialogHeader>
    <div className="space-y-5">{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<p className="whitespace-pre-wrap text-sm">{step.instructions}</p>{step.condition ? <p className="text-sm">Condition: {step.condition}</p> : null}
      <fieldset className="space-y-2 rounded-lg border p-3"><legend className="px-1 text-sm font-medium">Tubes covered by this entry</legend>{applicable.map(m => <label key={m.id} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" value={m.id} className="mt-0.5 size-4 shrink-0" {...form.register('covered')} /><span>{m.position} · {m.barcode} · {m.jobName}</span></label>)}{!applicable.length ? <p>No tubes are eligible for this action.</p> : null}{form.formState.errors.covered ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.covered.message}</p> : null}</fieldset>
      {!step.required ? <PreparationField label="Decision" id="prep-decision" required><select id="prep-decision" className={prepSelectClass} {...form.register('outcome')}><option value="recorded">Performed</option><option value="skipped">Skip with reason</option></select></PreparationField> : null}
      {!skipped ? <>
        {step.captures.some(c => c.scope !== 'tube') || step.qcGate && step.qcGate.scope !== 'tube' ? <div className={`${prepRowClass} space-y-4`}><h3 className="font-medium">Shared evidence</h3>{step.captures.filter(c => c.scope !== 'tube').map(c => captureInput(c, 'shared', c.required))}{step.qcGate && step.qcGate.scope !== 'tube' ? <><p className="text-sm">{step.qcGate.criteria}</p>{qcInput('shared', true)}</> : null}</div> : null}
        {applicable.filter(m => covered.includes(m.id)).map(m => <details key={m.id} open={step.captures.some(c => c.scope === 'tube') || step.qcGate?.scope === 'tube'} className={prepRowClass}><summary className="cursor-pointer font-medium">{m.position} · {m.barcode} — values and exceptions</summary><div className="mt-4 space-y-4">{step.captures.filter(c => c.scope !== 'batch').map(c => captureInput(c, m.id, c.scope === 'tube' && c.required))}{step.qcGate && step.qcGate.scope !== 'batch' ? <><p className="text-sm">{step.qcGate.criteria}</p>{qcInput(m.id, step.qcGate.scope === 'tube')}</> : null}<PreparationField label="Tube exception or QC reason" id={`${m.id}_reason`} error={form.formState.errors.values?.[`${m.id}_reason`]?.message}><Input id={`${m.id}_reason`} {...form.register(`values.${m.id}_reason`)} /></PreparationField></div></details>)}
        {step.inputMaterials.length + step.equipmentTypes.length + step.preparedOutputs.length ? <div className="space-y-3 rounded-lg border p-3"><p className="text-sm">Inputs: {step.inputMaterials.join(', ') || 'None specified'}<br />Equipment: {step.equipmentTypes.join(', ') || 'None specified'}<br />Outputs: {step.preparedOutputs.join(', ') || 'None specified'}</p><PreparationActions items={[{ label: 'Record material use', onClick: () => onResource('material', covered) }, { label: 'Record equipment use', onClick: () => onResource('equipment', covered) }, { label: 'Create output', onClick: () => onResource('output', covered) }]} /></div> : null}
        {step.operatorConfirmation ? <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug"><input type="checkbox" aria-required aria-invalid={Boolean(form.formState.errors.operator)} className="mt-0.5 size-4 shrink-0" {...form.register('operator')} /><RequiredFieldName>I performed this step according to its pinned instructions.</RequiredFieldName></label> : null}
        {step.inputMaterials.length + step.equipmentTypes.length + step.preparedOutputs.length ? <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug"><input type="checkbox" aria-required aria-invalid={Boolean(form.formState.errors.resources)} className="mt-0.5 size-4 shrink-0" {...form.register('resources')} /><RequiredFieldName>I confirmed the listed inputs, outputs and equipment and recorded their traceability.</RequiredFieldName></label> : null}
      </> : null}
      <PreparationField label="Reason or condition assessment" id="prep-step-reason" required={skipped || action !== 'record' || Boolean(step.condition)} error={form.formState.errors.values?.reason?.message}><textarea id="prep-step-reason" className={`${prepSelectClass} min-h-20 py-2`} {...form.register('values.reason')} /></PreparationField>
      <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug"><input type="checkbox" aria-required aria-invalid={Boolean(form.formState.errors.confirmed)} className="mt-0.5 size-4 shrink-0" {...form.register('confirmed')} /><RequiredFieldName>I confirm this entry applies to the {covered.length} selected tube(s), including the listed exceptions.</RequiredFieldName></label>
      {(['confirmed', 'operator', 'resources'] as const).map(key => form.formState.errors[key] ? <p key={key} role="alert" className="text-sm text-destructive">{form.formState.errors[key]?.message}</p> : null)}
    </div><RequiredDialogFooter><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || !applicable.length}>{pending ? 'Saving…' : 'Save step evidence'}</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
