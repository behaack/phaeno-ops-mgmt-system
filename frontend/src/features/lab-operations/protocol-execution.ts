import { z } from 'zod'

import type { LabExecutionStep, LabExecutionStepInput } from '#/api/lab-operations'

export const executionStepFormSchema = z.object({
  outcome: z.enum(['recorded', 'skipped']),
  captures: z.record(z.string(), z.string()),
  operatorConfirmed: z.boolean(),
  resourcesConfirmed: z.boolean(),
  qcOutcome: z.enum(['', 'pass', 'fail', 'hold']),
  reason: z.string().trim().max(4000),
})
export type ExecutionStepFormValues = z.infer<typeof executionStepFormSchema>

export function hasResourceRequirements(step: LabExecutionStep['definition']) {
  return step.inputMaterials.length + step.preparedOutputs.length + step.equipmentTypes.length > 0
}

export function stepFormSchema(step: LabExecutionStep['definition'], action: LabExecutionStepInput['action']) {
  return executionStepFormSchema.superRefine((values, context) => {
    const issue = (path: (string | number)[], message: string) => context.addIssue({ code: 'custom', path, message })
    if (action !== 'record' && !values.reason) issue(['reason'], 'Explain the repeat or data-entry correction.')
    if (values.outcome === 'skipped') {
      if (step.required) issue(['outcome'], 'A required step cannot be skipped.')
      if (!values.reason) issue(['reason'], 'Explain the skip or why the condition does not apply.')
      return
    }
    if (step.condition && !values.reason) issue(['reason'], 'Record how you assessed the condition.')
    if (step.operatorConfirmation && !values.operatorConfirmed) issue(['operatorConfirmed'], 'Confirm that you performed this step.')
    if (hasResourceRequirements(step) && !values.resourcesConfirmed) issue(['resourcesConfirmed'], 'Confirm the listed resources and their job traceability.')
    if (step.qcGate && !values.qcOutcome) issue(['qcOutcome'], 'Choose the QC outcome.')
    if (step.qcGate && ['fail', 'hold'].includes(values.qcOutcome) && !values.reason) issue(['reason'], 'Explain the QC failure or hold.')
    for (const capture of step.captures) {
      const value = values.captures[capture.key]?.trim() ?? ''
      const path = ['captures', capture.key]
      if (!value) {
        if (capture.required) issue(path, `${capture.label} is required.`)
        continue
      }
      if (value.length > 4000) issue(path, 'Use at most 4000 characters.')
      if (capture.type === 'number' && (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) || !Number.isFinite(Number(value)))) issue(path, 'Enter a finite number in the specified unit.')
      if (capture.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) issue(path, 'Enter a valid calendar date.')
      if (capture.type === 'choice' && !capture.options?.includes(value)) issue(path, 'Choose an approved value.')
      if (capture.type === 'barcode' && (value.length > 200 || /\s/.test(value) || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) >= 127 && character.charCodeAt(0) <= 159))) issue(path, 'Enter a barcode without whitespace or control characters.')
    }
  })
}

export function stepFormDefaults(step: LabExecutionStep, action: LabExecutionStepInput['action']): ExecutionStepFormValues {
  const previous = action === 'correct' ? step.records.at(-1) : undefined
  return {
    outcome: previous?.outcome ?? 'recorded',
    captures: Object.fromEntries(step.definition.captures.map(capture => [capture.key, String(previous?.captures[capture.key] ?? '')])),
    operatorConfirmed: false,
    resourcesConfirmed: false,
    qcOutcome: previous?.qcOutcome ?? '',
    reason: '',
  }
}

export function stepInput(step: LabExecutionStep['definition'], action: LabExecutionStepInput['action'], values: ExecutionStepFormValues, version: number): LabExecutionStepInput {
  const skipped = values.outcome === 'skipped'
  return {
    stepKey: step.key, action, outcome: values.outcome, version,
    captures: skipped ? {} : Object.fromEntries(step.captures.flatMap(capture => {
      const value = values.captures[capture.key]?.trim() ?? ''
      return value ? [[capture.key, capture.type === 'number' ? Number(value) : value]] : []
    })),
    operatorConfirmed: !skipped && values.operatorConfirmed,
    resourcesConfirmed: !skipped && values.resourcesConfirmed,
    qcOutcome: !skipped && step.qcGate && values.qcOutcome ? values.qcOutcome : null,
    reason: values.reason.trim() || null,
  }
}
