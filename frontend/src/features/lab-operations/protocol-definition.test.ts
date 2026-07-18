import { describe, expect, it } from 'vitest'

import {
  createLibraryPreparationExample,
  deserializeProtocolDefinition,
  serializeProtocolDefinition,
} from './protocol-definition'

describe('protocol definition authoring', () => {
  it('round-trips a structured definition when a draft is resumed or cloned', () => {
    const example = createLibraryPreparationExample()

    const resumed = deserializeProtocolDefinition(serializeProtocolDefinition(example))

    expect(resumed).toEqual(example)
  })

  it('opens an older empty steps definition as one editable blank step', () => {
    const resumed = deserializeProtocolDefinition('{"steps":[]}')

    expect(resumed?.steps).toHaveLength(1)
    expect(resumed?.steps[0]?.name).toBe('')
  })

  it('opens an empty legacy object safely and rejects invalid JSON', () => {
    expect(deserializeProtocolDefinition('{"unexpected":true}')).toEqual({
      steps: [expect.objectContaining({ name: '' })],
    })
    expect(deserializeProtocolDefinition('not-json')).toBeNull()
  })
})
