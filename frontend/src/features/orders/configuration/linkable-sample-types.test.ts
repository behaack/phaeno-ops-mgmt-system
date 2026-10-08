import { describe, expect, it } from 'vitest'
import type { SampleTypeDefinition } from '#/api/sample-shipping'
import { containerConfiguration } from '#/test-helpers/shipping-containers'
import { linkableSampleTypes } from './linkable-sample-types'

const now = Date.parse('2026-09-26T12:00:00Z')
const released = containerConfiguration.sampleTypes[0]

describe('Sample types available while drafting a kit specification', () => {
  it('offers a Draft-only family without making an inactive historical family selectable', () => {
    const draft: SampleTypeDefinition = {
      ...released, id: '11111111-1111-4111-8111-111111111121',
      definitionKey: '11111111-1111-4111-8111-111111111122',
      name: 'New Draft Sample type', isActive: false, lifecycle: 'Draft',
    }
    const deactivated: SampleTypeDefinition = {
      ...released, id: '11111111-1111-4111-8111-111111111123',
      definitionKey: '11111111-1111-4111-8111-111111111124',
      name: 'Withdrawn Sample type', isActive: false, lifecycle: 'Deactivated',
    }
    expect(linkableSampleTypes([draft, deactivated], now)).toEqual([draft])
  })

  it('shows the current Active revision once when the same family has a successor Draft', () => {
    const successor: SampleTypeDefinition = {
      ...released, id: '11111111-1111-4111-8111-111111111125',
      revision: 2, supersedesSampleTypeId: released.id,
      isActive: false, lifecycle: 'Draft',
    }
    expect(linkableSampleTypes([successor, released], now)).toEqual([released])
  })
})
