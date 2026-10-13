import { describe, expect, it } from 'vitest'
import { parseWorkSearch } from './work-search'
import { workDestination, type WorkItem } from '#/api/work-attention'
import { pseudolocalize } from '#/features/customer-i18n/customer-text'
import { workPriorityLabel } from './work-priority'

describe('work presentation boundaries', () => {
  it('separates undated elevated actions from recorded due-soon work', () => {
    const item = { kind: 'action', priority: 2, dueAtUtc: null } as WorkItem
    expect(workPriorityLabel(item)).toBe('needsReview')
    expect(workPriorityLabel({ ...item, dueAtUtc: '2026-10-13T12:00:00Z' })).toBe('dueSoon')
    expect(workPriorityLabel({ ...item, kind: 'waiting' })).toBe('waiting')
    expect(workPriorityLabel({ ...item, kind: 'update' })).toBe('available')
  })
  it('keeps new commercial decisions linked to their owning Job or Kit order', () => {
    expect(workDestination({ destination: '/lab-services/', sourceId: 'quote', targetId: 'job' } as WorkItem)).toBe('/lab-services/job')
    expect(workDestination({ destination: '/reagent-orders/', sourceId: 'substitution', targetId: 'kit' } as WorkItem)).toBe('/reagent-orders/kit')
    expect(workDestination({ destination: '/order-operations/partner-services/pseq-kits/', sourceId: 'kit' } as WorkItem)).toBe('/order-operations/partner-services/pseq-kits/kit')
    expect(workDestination({ destination: '/lab-operations/pseq-kit-orders/', sourceId: 'kit' } as WorkItem)).toBe('/lab-operations/pseq-kit-orders/kit')
  })
  it('rejects arbitrary destinations and preserves exact source/target identity', () => {
    expect(workDestination({ destination: 'https://untrusted.example/', sourceId: 'one' } as WorkItem)).toBe('/dashboard/attention')
    expect(workDestination({ destination: '/lab-operations/', sourceId: 'package', targetId: 'work-order' } as WorkItem)).toBe('/lab-operations/work-order')
  })
  it('does not silently retain an unknown filter or oversized page', () => {
    expect(parseWorkSearch({ workDomain: 'unknown', workPage: 999999999, workPriority: -1 })).toMatchObject({ workDomain: '', workPage: 100000, workPriority: undefined })
  })
  it('opens Website notification links in their matching sidebar queue', () => {
    expect(workDestination({ destination: '/?dashboardSection=webOps&requestId=', sourceId: 'demo/id' } as WorkItem)).toBe('/website-operations?section=demo-requests&requestId=demo%2Fid')
    expect(workDestination({ destination: '/?dashboardSection=webOps&deliveryId=', sourceId: 'email-id' } as WorkItem)).toBe('/website-operations?section=email-delivery&deliveryId=email-id')
  })
  it('preserves scientific acronyms and parameter identities in review text', () => {
    const value = pseudolocalize('Review PSeq RNA FASTQ files for {p0}')
    expect(value).toContain('PSeq RNA FASTQ')
    expect(value).toContain('{p0}')
    expect(value).not.toContain('Review')
  })
})
