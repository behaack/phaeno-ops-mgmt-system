import { describe, expect, it } from 'vitest'
import { isSubmissionDate, submissionBoundary, submissionDateInput, submissionDateLabel } from './trial-submission-dates'

describe('Trial submission calendar dates', () => {
  it('keeps an inclusive closing day across month, leap-year and daylight-saving boundaries', () => {
    for (const [date, following] of [['2026-10-20', '2026-10-21'], ['2026-12-31', '2027-01-01'], ['2028-02-29', '2028-03-01'], ['2026-03-08', '2026-03-09']]) {
      expect(submissionBoundary(date)).toBe(`${date}T00:00:00.000Z`)
      const close = submissionBoundary(date, true)
      expect(close).toBe(`${following}T00:00:00.000Z`)
      expect(submissionDateInput(close, true)).toBe(date)
      expect(submissionDateLabel(close, true)).toBe(submissionDateLabel(submissionBoundary(date)))
    }
  })

  it('rejects invalid calendar dates and time entries', () => {
    for (const date of ['', '2026-02-29', '2026-04-31', '2026-13-01', '2026-10-20T09:00']) expect(isSubmissionDate(date)).toBe(false)
    expect(isSubmissionDate('2028-02-29')).toBe(true)
    expect(submissionDateInput(null)).toBe('')
    expect(submissionDateLabel(null)).toBe('Not set')
  })
})
