import { describe, expect, it } from 'vitest'
import { assemblyDuration, currentAssemblyPercentage } from './assembly-jobs'

describe('assembly progress and execution times', () => {
  const now = Date.parse('2026-09-22T12:00:00Z')
  const progress = { percentage: 43, receivedAtUtc: new Date(now).toISOString(), sequence: 4 }
  it('shows only fresh finite percentages for active jobs', () => {
    expect(currentAssemblyPercentage(progress, false, now)).toBe(43)
    expect(currentAssemblyPercentage(progress, true, now)).toBeNull()
    expect(currentAssemblyPercentage(progress, false, now + 120_001)).toBeNull()
    expect(currentAssemblyPercentage(null, false, now)).toBeNull()
    for (const percentage of [-1, 101, Number.NaN]) expect(currentAssemblyPercentage({ ...progress, percentage }, false, now)).toBeNull()
  })
  it('does not replace final disposition with a late percentage', () => {
    expect(currentAssemblyPercentage({ ...progress, percentage: 100 }, true, now)).toBeNull()
  })
  it('distinguishes missing execution time from a zero-duration job', () => {
    expect(assemblyDuration(null)).toBe('Not available')
    expect(assemblyDuration(0)).toBe('0h 0m 0s')
    expect(assemblyDuration(3661)).toBe('1h 1m 1s')
  })
})
