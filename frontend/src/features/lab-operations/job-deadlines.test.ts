import { describe, expect, it } from 'vitest'
import { clearJobFilters, jobDateBoundary, parseJobDate, parseJobListSearch } from './job-deadlines'

describe('Jobs navigation state', () => {
  it('defaults to Active and preserves its shareable filters', () => {
    expect(parseJobListSearch({ jobSearch: 'Job 1', jobDeadline: 'Overdue', jobPage: '12', jobStatus: 'Sequencing', jobFrom: '2026-09-01' })).toMatchObject({ jobView: undefined, jobSearch: 'Job 1', jobDeadline: 'Overdue', jobPage: 12, jobStatus: 'Sequencing', jobFrom: '2026-09-01' })
  })
  it('keeps independent filter and page state through a tab switch', () => {
    const active = parseJobListSearch({ jobSearch: 'Active search', jobPage: 3, jobClosedSearch: 'Closed search', jobClosedPage: 7, jobOutcome: 'Delivered', jobClosedFrom: '2026-08-01' })
    const closed = parseJobListSearch({ ...active, jobView: 'Closed' })
    expect(closed).toMatchObject({ jobView: 'Closed', jobSearch: 'Active search', jobPage: 3, jobClosedSearch: 'Closed search', jobClosedPage: 7, jobOutcome: 'Delivered', jobClosedFrom: '2026-08-01' })
    expect(parseJobListSearch({ ...closed, jobView: 'Active' })).toEqual(active)
    expect(parseJobListSearch({ ...closed, ...clearJobFilters('Closed') })).toMatchObject({ jobSearch: 'Active search', jobPage: 3, jobClosedSearch: undefined, jobClosedPage: undefined, jobOutcome: undefined })
    expect(parseJobListSearch({ ...closed, ...clearJobFilters('Active') })).toMatchObject({ jobSearch: undefined, jobPage: undefined, jobClosedSearch: 'Closed search', jobClosedPage: 7 })
  })
  it('rejects unsupported filters without restoring Show complete', () => {
    expect(parseJobListSearch({ jobDeadline: 'NeedsDueDate', jobStatus: '__proto__', jobOutcome: 'Failed', jobPage: -4 })).toMatchObject({ jobDeadline: undefined, jobStatus: undefined, jobOutcome: undefined, jobPage: undefined })
    expect(parseJobListSearch({ jobDeadline: 'Cancelled', jobSearch: 'ABC' })).toMatchObject({ jobView: 'Closed', jobOutcome: 'Cancelled', jobClosedSearch: 'ABC', jobDeadline: undefined })
    expect(parseJobListSearch({ showComplete: true })).toMatchObject({ jobView: 'Closed' })
  })
})
describe('Jobs calendar date filters', () => {
  it('validates real calendar dates and supports open ranges', () => {
    expect(parseJobDate('2026-02-29')).toBeUndefined()
    expect(parseJobDate('2028-02-29')).toBe('2028-02-29')
    expect(parseJobDate('2026-13-01')).toBeUndefined()
    expect(jobDateBoundary(undefined)).toBeUndefined()
  })
  it('uses local midnight and the next local midnight, including DST boundaries', () => {
    for (const date of ['2026-03-08', '2026-11-01', '2026-12-31']) {
      const [year, month, day] = date.split('-').map(Number)
      expect(jobDateBoundary(date)).toBe(new Date(year, month - 1, day).toISOString())
      expect(jobDateBoundary(date, true)).toBe(new Date(year, month - 1, day + 1).toISOString())
    }
  })
})
