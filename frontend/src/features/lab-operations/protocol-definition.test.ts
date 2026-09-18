import { describe, expect, it } from 'vitest'

import {
  createLibraryPreparationExample,
  deserializeProtocolDefinition,
  protocolDefinitionFormSchema,
  serializeProtocolDefinition,
  type ProtocolDefinition,
} from './protocol-definition'

describe('protocol definition authoring', () => {
  it('requires explicit batch scopes and preserves them when a draft is resumed', () => {
    const example = createLibraryPreparationExample()
    example.preparationBatchEnabled = true
    for (const step of example.steps) {
      for (const capture of step.captures) delete capture.scope
      delete step.qcScope
    }
    expect(protocolDefinitionFormSchema.safeParse(example).success).toBe(false)
    for (const step of example.steps) {
      for (const capture of step.captures) capture.scope = capture.type === 'barcode' ? 'tube' : 'shared'
      if (step.qcEnabled) step.qcScope = 'tube'
    }
    expect(protocolDefinitionFormSchema.safeParse(example).success).toBe(true)
    expect(serializeProtocolDefinition(deserializeProtocolDefinition(serializeProtocolDefinition(example))!)).toBe(serializeProtocolDefinition(example))
  })

  it('round-trips a structured definition when a draft is resumed or cloned', () => {
    const example = createLibraryPreparationExample()

    const resumed = deserializeProtocolDefinition(serializeProtocolDefinition(example))

    expect(serializeProtocolDefinition(resumed!)).toBe(serializeProtocolDefinition(example))
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

    expect(serializeProtocolDefinition(deserializeProtocolDefinition(JSON.stringify(stored))!)).toBe(serializeProtocolDefinition(example))
  })

  it('opens an empty legacy object safely and rejects invalid JSON', () => {
    expect(deserializeProtocolDefinition('{"unexpected":true}')).toEqual({
      steps: [expect.objectContaining({ name: '' })],
    })
    expect(deserializeProtocolDefinition('not-json')).toBeNull()
  })
})


describe('pinned occurrence identity', () => {
  it('preserves keys across renaming, reordering and explicit version adoption', () => {
    const values = deserializeProtocolDefinition(serializeProtocolDefinition(createLibraryPreparationExample()))!
    const key = values.steps[0].key
    const captureKey = values.steps[0].captures[0].key
    values.steps[0].name = 'Renamed procedure'
    values.steps[0].captures[0].label = 'Renamed capture'
    values.steps[0].labStepVersionId = '00000000-0000-4000-8000-000000000001'
    values.steps.reverse()
    const result = JSON.parse(serializeProtocolDefinition(values)) as ProtocolDefinition
    expect(result.steps.at(-1)).toMatchObject({ key, labStepVersionId: '00000000-0000-4000-8000-000000000001', captures: [{ key: captureKey }] })
  })
})


describe('material assignment at configuration', () => {
  it('requires a material definition and preserves catalog identity through save/reopen', () => {
    const form = createLibraryPreparationExample()
    const capture = { label: 'Reagent used', type: 'material' as const, scope: 'batch' as const, required: true, includeTracking: true, quantityBasis: 'perSample' as const, unit: 'µL', choices: '' }
    form.steps[0].captures = [capture]
    expect(protocolDefinitionFormSchema.safeParse(form).success).toBe(false)
    const material = { name: 'Reagent X', vendor: 'Vendor A', productNumber: 'X-10', productId: '11111111-1111-4111-8111-111111111111', supplierId: '22222222-2222-4222-8222-222222222222' }
    form.steps[0].captures = [{ ...capture, material }]
    expect(protocolDefinitionFormSchema.safeParse(form).success).toBe(true)
    expect(deserializeProtocolDefinition(serializeProtocolDefinition(form))?.steps[0].captures[0].material).toEqual(material)
    expect(deserializeProtocolDefinition(serializeProtocolDefinition(form))?.steps[0].captures[0].unit).toBe('µL')
    form.steps[0].captures[0].unit = ''
    expect(protocolDefinitionFormSchema.safeParse(form).success).toBe(false)
  })
})
