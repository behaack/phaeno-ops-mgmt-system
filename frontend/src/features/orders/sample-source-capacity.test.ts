import { describe, expect, it } from 'vitest'
import type { LabSample } from '#/api/order-management'
import { getSampleSourceAvailability, getSampleSourceCapacityError, getSampleSourceGroups, normalizeBiologicalSource } from './sample-source-capacity'

const samples = [
  { id: 'one', biologicalSource: ' FGHJ ', quantity: 20 },
  { id: 'two', biologicalSource: 'fghj', quantity: 1 },
  { id: 'unknown', biologicalSource: 'Legacy source', quantity: 3 },
] as LabSample[]
const order = { sourceGroups: [{ id: 'a', biologicalSource: 'fghj', specimenCount: 1, version: 1 }, { id: 'b', biologicalSource: 'Other accepted source', specimenCount: 2, version: 1 }], samples }

describe('accepted sample source capacity', () => {
  it('matches normalized accepted sources and counts sample records independently of tubes', () => {
    expect(normalizeBiologicalSource(' FGHJ ')).toBe('fghj')
    const groups = getSampleSourceGroups(order)
    expect(groups[0].samples.map(sample => sample.id)).toEqual(['one', 'two'])
    expect(groups[0].specimenCount).toBe(1)
    expect(groups[1].samples).toEqual([])
    expect(getSampleSourceAvailability(order).map(group => group.remaining)).toEqual([0, 2])
    expect(getSampleSourceAvailability({ ...order, samples: [samples[0]], sourceGroups: [{ ...order.sourceGroups[0], specimenCount: 2 }] })[0].remaining).toBe(1)
  })
  it('excludes the edited record and allows unchanged legacy overfull/unknown source metadata', () => {
    expect(getSampleSourceAvailability({ ...order, samples: [samples[0]] }, samples[0])[0]).toMatchObject({ remaining: 1, isOriginalSource: true })
    expect(getSampleSourceCapacityError(order, 'fghj', samples[0])).toBeNull()
    expect(getSampleSourceCapacityError(order, 'legacy source', samples[2])).toBeNull()
    expect(getSampleSourceCapacityError(order, 'fghj', samples[2])).toContain('is full')
  })
  it('allows moves only into accepted source groups with a free record slot', () => {
    expect(getSampleSourceCapacityError(order, 'Other accepted source', samples[0])).toBeNull()
    expect(getSampleSourceCapacityError(order, 'unaccepted source', samples[0])).toContain('accepted with this Job')
    expect(getSampleSourceCapacityError(order, 'fghj')).toContain('2 of 1 samples')
  })
})
