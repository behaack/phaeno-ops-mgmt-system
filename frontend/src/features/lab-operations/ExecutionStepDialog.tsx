import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'

import type { LabExecutionStep, LabExecutionStepInput } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'

import { hasResourceRequirements, stepFormDefaults, stepFormSchema, stepInput, type ExecutionStepFormValues } from './protocol-execution'

const selectClass = 'h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring'

export function ExecutionStepDialog({ step, action, version, error, pending, onClose, onSave, onReturnFocus }: {
  step: LabExecutionStep
  action: LabExecutionStepInput['action']
  version: number
  error?: string
  pending: boolean
  onClose: () => void
  onSave: (input: LabExecutionStepInput) => Promise<void>
  onReturnFocus: () => void
}) {
  const definition = step.definition
  const form = useForm<ExecutionStepFormValues>({
    resolver: zodResolver(stepFormSchema(definition, action)),
    defaultValues: stepFormDefaults(step, action), mode: 'onBlur', reValidateMode: 'onChange',
  })
  const dirty = form.formState.isDirty
  useBlocker({
    shouldBlockFn: () => pending || dirty && !window.confirm('Discard the unsaved step values?'),
    enableBeforeUnload: () => dirty || pending,
  })
  const close = () => {
    if (!pending && (!dirty || window.confirm('Discard the unsaved step values?'))) onClose()
  }
  const outcome = form.watch('outcome')
  const qcOutcome = form.watch('qcOutcome')
  const skipped = outcome === 'skipped'
  const allowed = action === 'record' ? step.canRecord : action === 'repeat' ? step.canRepeat : step.canCorrect
  const reasonRequired = skipped || action !== 'record' || Boolean(definition.condition) || ['fail', 'hold'].includes(qcOutcome)
  const title = action === 'correct' ? 'Correct step record' : action === 'repeat' ? 'Repeat step' : 'Record step'
  const errors = form.formState.errors
  const canSkip = !definition.required && step.records.at(-1)?.outcome !== 'recorded'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="max-w-2xl" onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus() }}>
        <DialogHeader>
          <DialogTitle>{title}: {definition.name}</DialogTitle>
          <DialogDescription>{action === 'correct' ? 'Correct a data-entry error. The earlier evidence remains in history with your reason.' : 'Record evidence for this exact protocol version. Required fields and QC are checked before saving.'}</DialogDescription>
        </DialogHeader>
        {error ? <Alert variant="destructive"><AlertTitle>Step was not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {!allowed ? <Alert><AlertTitle>Review the latest execution</AlertTitle><AlertDescription>{step.actionBlocker ?? 'This action is no longer available. Close this form and choose an action from the current step.'}</AlertDescription></Alert> : null}
        <form id="record-protocol-step" className="space-y-5" noValidate onSubmit={form.handleSubmit(async values => {
          if (!allowed) return
          try { await onSave(stepInput(definition, action, values, version)); form.reset(values); onClose() } catch { /* The persistent API feedback preserves these entered values. */ }
        })}>
          <p className="whitespace-pre-wrap text-sm leading-6">{definition.instructions}</p>
          {definition.condition ? <p className="rounded-lg bg-muted p-3 text-sm"><strong>Condition:</strong> {definition.condition}</p> : null}
          {canSkip ? <div className="space-y-1.5"><Label htmlFor="step-outcome"><RequiredFieldName>Step decision</RequiredFieldName></Label><select id="step-outcome" className={selectClass} {...form.register('outcome')}><option value="recorded">Record performed step</option><option value="skipped">Skip with reason</option></select></div> : null}
          {!skipped ? <>
            {definition.captures.map(capture => {
              const id = `capture-${capture.key}`
              const message = errors.captures?.[capture.key]?.message
              const inputProps = { id, 'aria-invalid': Boolean(message), 'aria-describedby': message ? `${id}-error` : capture.unit || capture.type === 'fileReference' ? `${id}-help` : undefined, ...form.register(`captures.${capture.key}`) }
              return <div key={capture.key} className="space-y-1.5">
                <Label htmlFor={id}>{capture.required ? <RequiredFieldName>{capture.label}</RequiredFieldName> : capture.label}</Label>
                {capture.unit || capture.type === 'fileReference' ? <FieldDescription id={`${id}-help`}>{capture.unit ? `Unit: ${capture.unit}` : 'Enter the approved file identifier or reference. This records a reference; it does not upload a file.'}</FieldDescription> : null}
                {capture.type === 'choice' ? <select {...inputProps} className={selectClass}><option value="">Choose a value</option>{capture.options?.map(option => <option key={option} value={option}>{option}</option>)}</select>
                  : <Input {...inputProps} type={capture.type === 'date' ? 'date' : 'text'} inputMode={capture.type === 'number' ? 'decimal' : undefined} autoComplete="off" maxLength={capture.type === 'barcode' ? 200 : 4000} />}
                <FieldError id={`${id}-error`}>{message}</FieldError>
              </div>
            })}
            {hasResourceRequirements(definition) ? <fieldset className="space-y-3 rounded-lg border p-3"><legend className="px-1 text-sm font-medium">Required resources</legend>
              {definition.inputMaterials.length > 0 ? <p className="text-sm"><strong>Inputs:</strong> {definition.inputMaterials.join(', ')}</p> : null}
              {definition.preparedOutputs.length > 0 ? <p className="text-sm"><strong>Outputs:</strong> {definition.preparedOutputs.join(', ')}</p> : null}
              {definition.equipmentTypes.length > 0 ? <p className="text-sm"><strong>Equipment:</strong> {definition.equipmentTypes.join(', ')}</p> : null}
              <Label className="items-start" htmlFor="step-resources"><input className="mt-1 size-4 shrink-0 cursor-pointer accent-primary" type="checkbox" id="step-resources" aria-invalid={Boolean(errors.resourcesConfirmed)} aria-describedby="step-resources-error" {...form.register('resourcesConfirmed')} /><RequiredFieldName>I checked these resources and recorded the applicable lot, container, and equipment traceability on the job.</RequiredFieldName></Label>
              <FieldError id="step-resources-error">{errors.resourcesConfirmed?.message}</FieldError>
            </fieldset> : null}
            {definition.qcGate ? <fieldset className="space-y-3 rounded-lg border p-3"><legend className="px-1 text-sm font-medium">QC gate</legend><p className="text-sm whitespace-pre-wrap">{definition.qcGate.criteria}</p>
              <Label htmlFor="step-qc"><RequiredFieldName>QC outcome</RequiredFieldName></Label><select id="step-qc" className={selectClass} aria-invalid={Boolean(errors.qcOutcome)} aria-describedby="step-qc-error" {...form.register('qcOutcome')}><option value="">Choose an outcome</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="hold">Hold</option></select>
              <FieldError id="step-qc-error">{errors.qcOutcome?.message}</FieldError><p className="text-xs text-muted-foreground">Fail or Hold is saved as evidence and blocks later steps and completion.</p>
            </fieldset> : null}
            {definition.operatorConfirmation ? <div><Label className="items-start" htmlFor="step-confirmation"><input type="checkbox" id="step-confirmation" className="mt-1 size-4 shrink-0 cursor-pointer accent-primary" aria-invalid={Boolean(errors.operatorConfirmed)} aria-describedby="step-confirmation-error" {...form.register('operatorConfirmed')} /><RequiredFieldName>I performed this step according to the pinned instructions.</RequiredFieldName></Label><FieldError id="step-confirmation-error">{errors.operatorConfirmed?.message}</FieldError></div> : null}
          </> : null}
          <div className="space-y-1.5"><Label htmlFor="step-reason">{reasonRequired ? <RequiredFieldName>Reason or condition assessment</RequiredFieldName> : 'Note (optional)'}</Label><Textarea id="step-reason" rows={3} maxLength={4000} aria-invalid={Boolean(errors.reason)} aria-describedby="step-reason-error" {...form.register('reason')} /><FieldError id="step-reason-error">{errors.reason?.message}</FieldError></div>
        </form>
        <RequiredDialogFooter><Button type="button" variant="outline" onClick={close} disabled={pending}>Cancel</Button><Button type="submit" form="record-protocol-step" disabled={pending || !allowed}>{pending ? 'Saving…' : 'Save step record'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}
