import { describe, expect, it } from 'vitest'
import { emptyStepTiming, performanceInput, timingIssues } from './step-performance'

describe('procedure timing and participant capture', () => {
  const now = Date.parse('2026-10-24T18:00:00Z')
  it('enforces configured interval and named-person minimum without inventing observations', () => {
    const issues = timingIssues(emptyStepTiming, now, { timingRequired: true, minimumParticipants: 2 })
    expect(issues.map(i => i.field)).toEqual(expect.arrayContaining(['intervalStart', 'participants']))
    expect(performanceInput(emptyStepTiming, true)).not.toHaveProperty('interval')
  })
  it('retains explicit offsets and additional participant roles in the submitted evidence', () => {
    const timing = { ...emptyStepTiming, intervalStart: '2026-10-24T10:00-07:00', intervalEnd: '2026-10-24T10:30-07:00', reason: 'Bench worksheet', participants: [{ userId: 'person-a', role: 'Second operator' }] }
    expect(timingIssues(timing, now, { timingRequired: true, minimumParticipants: 2 })).toEqual([])
    expect(performanceInput(timing, true)).toMatchObject({ interval: { startedAt: timing.intervalStart, completedAt: timing.intervalEnd }, participants: timing.participants, lateEntryReason: 'Bench worksheet' })
  })
  it('rejects reversed intervals and duplicate people', () => {
    const timing = { ...emptyStepTiming, intervalStart: '2026-10-24T10:30-07:00', intervalEnd: '2026-10-24T10:00-07:00', participants: [{ userId: 'a', role: 'First' }, { userId: 'a', role: 'Second' }] }
    expect(timingIssues(timing, now).map(i => i.field)).toEqual(expect.arrayContaining(['intervalStart', 'participants', 'reason']))
  })
})
