import { describe, expect, it } from 'vitest'
import { emptyStepTiming, localTimeOccurrences, performanceInput, timingIssues } from './step-performance'
import { labExecutionFixture } from '#/test-helpers/lab-execution'
import { stepFormDefaults, stepFormSchema, stepInput } from './protocol-execution'

describe('step performance capture', () => {
  it('requires an identified actual performer and reason for on-behalf work', () => {
    const timing = { ...emptyStepTiming, otherPerformer: true, performerId: '' }
    expect(timingIssues(timing).map(i => i.field)).toEqual(expect.arrayContaining(['performerId', 'reason']))
    const complete = { ...timing, performerId: 'actual-person', reason: ' Transcribed from signed worksheet ' }
    expect(timingIssues(complete)).toEqual([])
    expect(performanceInput(complete, true)).toEqual({ mode: 'now', personallyPerformed: false, performedByUserId: 'actual-person', lateEntryReason: 'Transcribed from signed worksheet' })
  })

  it('keeps now timestamp server-owned and requires personal confirmation even without a protocol checkbox', () => {
    const step = labExecutionFixture().steps[0]
    const definition = { ...step.definition, captures: [], operatorConfirmation: false }
    const values = { ...stepFormDefaults(step, 'record'), captures: {} }
    expect(stepFormSchema(definition, 'record').safeParse(values).success).toBe(false)
    values.operatorConfirmed = true
    expect(stepFormSchema(definition, 'record').safeParse(values).success).toBe(true)
    expect(stepInput(definition, 'record', values, 1).performance).toEqual({ mode: 'now', personallyPerformed: true })
  })

  it('requires a valid actual minute and a reason for late recording', () => {
    const late = { ...emptyStepTiming, mode: 'earlier' as const, localTime: '2020-01-15T12:30' }
    expect(timingIssues(late).map(i => i.field)).toEqual(['reason'])
    expect(timingIssues({ ...late, reason: 'Entered from worksheet' })).toEqual([])
    const input = performanceInput({ ...late, reason: ' Entered from worksheet ' }, true)
    expect(input.performedAt).toMatch(/^2020-01-15T12:30[+-]\d\d:\d\d$/)
    expect(input.lateEntryReason).toBe('Entered from worksheet')
    expect(localTimeOccurrences('2026-02-30T12:00')).toEqual([])
    expect(timingIssues({ ...late, localTime: '2099-01-15T12:30', reason: 'x' }).map(i => i.field)).toContain('localTime')
  })

  it('never sends hidden performance fields for a skip or reattributes a correction', () => {
    const step = labExecutionFixture().steps[0]
    const values = { ...stepFormDefaults(step, 'record'), operatorConfirmed: true, timing: { ...emptyStepTiming, mode: 'earlier' as const, localTime: '2020-01-15T12:30', reason: 'Late' } }
    expect(stepInput(step.definition, 'correct', values, 1).performance).toBeUndefined()
    expect(stepInput(step.definition, 'record', { ...values, outcome: 'skipped' }, 1).performance).toBeUndefined()
    expect(stepFormDefaults(step, 'repeat').timing).toEqual(emptyStepTiming)
  })
})
