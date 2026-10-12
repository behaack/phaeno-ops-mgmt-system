import { describe, expect, it } from 'vitest'
import type { JobDeadline } from '#/api/lab-jobs'
import { deadlineDefaults } from './DeadlineAdjustmentDialog'

const source = { summary: { job: { dueAtUtc: '2026-11-20T20:00:00Z' } }, changes: [], phases: [
  { phaseId: 'first', lifecycle: 'InProgress', job: { dueAtUtc: '2026-11-01T20:00:00Z' } },
  { phaseId: 'second', lifecycle: 'Planned', job: { dueAtUtc: '2026-11-20T20:00:00Z' } },
] } as unknown as JobDeadline
describe('phase deadline attribution', () => {
  it('does not copy the holistic risk driver date into the first unfinished phase', () => {
    const values = deadlineDefaults(source)
    expect(values.phaseId).toBe('first')
    expect(new Date(values.due).toISOString()).toBe('2026-11-01T20:00:00.000Z')
  })
  it('uses the deliberately selected phase date', () => {
    expect(new Date(deadlineDefaults(source, 'second').due).toISOString()).toBe('2026-11-20T20:00:00.000Z')
  })
  it('keeps an undated phase unknown instead of borrowing another phase date', () => {
    expect(deadlineDefaults({ ...source, phases: [{ ...source.phases![0], job: { ...source.phases![0].job, dueAtUtc: null } }] }).due).toBe('')
  })
})
