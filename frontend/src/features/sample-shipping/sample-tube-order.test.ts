import { describe, expect, it } from 'vitest'
import { shippingTube } from '#/test-helpers/sample-shipping'
import { orderedSampleTubes } from './sample-tube-order'

describe('sample ID and tube ordering', () => {
  it('orders IDs digit by digit and keeps tube ordinals numeric without mutating saved data', () => {
    const rows = [
      shippingTube(1, { customerSampleId: '5675488' }),
      shippingTube(2, { customerSampleId: '124334582', tubeOrdinal: 10 }),
      shippingTube(3, { customerSampleId: '23452345' }),
      shippingTube(4, { customerSampleId: '124334582', tubeOrdinal: 2 }),
      shippingTube(5, { customerSampleId: 'S-2' }),
      shippingTube(6, { customerSampleId: 'S-10' }),
    ]
    expect(orderedSampleTubes(rows)).toEqual([rows[3], rows[1], rows[2], rows[0], rows[5], rows[4]])
    expect(rows[0].customerSampleId).toBe('5675488')
  })

  it('follows the grouped sample-list order when supplied by the Job', () => {
    const rows = [shippingTube(1, { customerSampleId: 'A' }), shippingTube(2, { customerSampleId: 'Z' })]
    expect(orderedSampleTubes(rows, [rows[1].submittedSpecimenId, rows[0].submittedSpecimenId])).toEqual([rows[1], rows[0]])
  })
})
