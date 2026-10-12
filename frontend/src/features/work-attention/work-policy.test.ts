import { describe, expect, it } from 'vitest'
import { parseWorkSearch } from './work-search'
import { workDestination, type WorkItem } from '#/api/work-attention'
import { pseudolocalize } from '#/features/customer-i18n/customer-text'

describe('work presentation boundaries', () => {
  it('rejects arbitrary destinations and preserves exact source/target identity', () => {
    expect(workDestination({ destination: 'https://untrusted.example/', sourceId: 'one' } as WorkItem)).toBe('/dashboard/attention')
    expect(workDestination({ destination: '/lab-operations/', sourceId: 'package', targetId: 'work-order' } as WorkItem)).toBe('/lab-operations/work-order')
  })
  it('does not silently retain an unknown filter or oversized page', () => {
    expect(parseWorkSearch({ workDomain: 'unknown', workPage: 999999999, workPriority: -1 })).toMatchObject({ workDomain: '', workPage: 100000, workPriority: undefined })
  })
  it('preserves scientific acronyms and parameter identities in review text', () => {
    const value = pseudolocalize('Review PSeq RNA FASTQ files for {p0}')
    expect(value).toContain('PSeq RNA FASTQ')
    expect(value).toContain('{p0}')
    expect(value).not.toContain('Review')
  })
})
