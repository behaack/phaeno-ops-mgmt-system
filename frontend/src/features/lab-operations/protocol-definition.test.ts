import { describe, expect, it } from 'vitest'

import {
  createLibraryPreparationExample,
  deserializeProtocolDefinition,
  serializeProtocolDefinition,
  type ProtocolDefinition,
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

  it('resumes and reviews API definitions with explicit null optional fields', () => {
    const example = createLibraryPreparationExample()
    const stored: ProtocolDefinition = JSON.parse(serializeProtocolDefinition(example))
    for (const step of stored.steps) {
      step.condition ??= null
      step.requiredRole ??= null
      step.qcGate ??= null
      for (const capture of step.captures) {
        capture.unit ??= null
        capture.options ??= null
      }
    }

    expect(deserializeProtocolDefinition(JSON.stringify(stored))).toEqual(example)
  })

  it('opens an empty legacy object safely and rejects invalid JSON', () => {
    expect(deserializeProtocolDefinition('{"unexpected":true}')).toEqual({
      steps: [expect.objectContaining({ name: '' })],
    })
    expect(deserializeProtocolDefinition('not-json')).toBeNull()
  })
})
