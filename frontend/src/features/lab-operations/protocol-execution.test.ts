import { describe, expect, it } from 'vitest'
import { labExecutionFixture } from '#/test-helpers/lab-execution'
import { stepFormDefaults, stepFormSchema, stepInput } from './protocol-execution'

describe('guided protocol evidence', () => {
  it('requires barcode and explicit confirmation before recording identity', () => {
    const step = labExecutionFixture().steps[0]
    const values = stepFormDefaults(step, 'record')
    expect(stepFormSchema(step.definition, 'record').safeParse(values).success).toBe(false)
    expect(stepFormSchema(step.definition, 'record').safeParse({ ...values, captures: { barcode: 'PH-TRAINING-01' }, operatorConfirmed: true }).success).toBe(true)
  })

  it('validates numbers, real dates, choices, references, and explicit QC without a default pass', () => {
    const step = labExecutionFixture().steps[1]
    const values = { ...stepFormDefaults(step, 'record'), captures: { concentration: '0', measured: '2026-09-05', method: 'Fluorometry', file: 'qc-record-001' }, qcOutcome: 'pass' as const }
    const schema = stepFormSchema(step.definition, 'record')
    expect(schema.safeParse(values).success).toBe(true)
    expect(stepInput(step.definition, 'record', values, 7).captures.concentration).toBe(0)
    for (const [field, invalid] of [['concentration', 'Infinity'], ['concentration', '0x12'], ['measured', '2026-02-30'], ['method', 'Unknown'], ['file', '']]) {
      expect(schema.safeParse({ ...values, captures: { ...values.captures, [field]: invalid } }).success).toBe(false)
    }
    expect(schema.safeParse({ ...values, qcOutcome: '' }).success).toBe(false)
    expect(schema.safeParse({ ...values, qcOutcome: 'hold' }).success).toBe(false)
    expect(schema.safeParse({ ...values, qcOutcome: 'hold', reason: 'Awaiting review' }).success).toBe(true)
  })

  it('requires a conditional decision and strips performed evidence when skipping', () => {
    const step = labExecutionFixture().steps[2]
    const values = { ...stepFormDefaults(step, 'record'), outcome: 'skipped' as const, operatorConfirmed: true, captures: { ignored: 'not performed' }, qcOutcome: 'pass' as const }
    expect(stepFormSchema(step.definition, 'record').safeParse(values).success).toBe(false)
    values.reason = 'The condition did not apply.'
    expect(stepFormSchema(step.definition, 'record').safeParse(values).success).toBe(true)
    expect(stepInput(step.definition, 'record', values, 4)).toMatchObject({ captures: {}, operatorConfirmed: false, qcOutcome: null, version: 4 })
  })

  it('prefills corrections with prior values but requires fresh confirmation and a reason', () => {
    const step = labExecutionFixture().steps[0]
    step.records = [{ id: 'record', recordedByUserId: 'operator', recordedAtUtc: '2026-09-05T12:00:00Z', ...stepInput(step.definition, 'record', { ...stepFormDefaults(step, 'record'), captures: { barcode: 'original' }, operatorConfirmed: true }, 1) }]
    const values = stepFormDefaults(step, 'correct')
    expect(values.captures.barcode).toBe('original')
    expect(values.operatorConfirmed).toBe(false)
    expect(stepFormSchema(step.definition, 'correct').safeParse(values).success).toBe(false)
    expect(stepFormDefaults(step, 'repeat').captures.barcode).toBe('')
  })
})
