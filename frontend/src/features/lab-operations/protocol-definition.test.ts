import { describe, expect, it } from 'vitest'

import {
  createLibraryPreparationExample,
  createEmptyProtocolStep,
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


describe('master-mix step configuration', () => {
  function definition() {
    return { preparationBatchEnabled: true, steps: [{ ...createEmptyProtocolStep(), name: 'Combine buffer', instructions: 'Combine the released buffer.', processType: 'masterMix' as const, attachmentKind: 'none' as const,
      captures: [{ key: 'buffer', label: 'Buffer', type: 'material' as const, scope: 'batch' as const, required: true, includeTracking: true, quantityBasis: 'total' as const, unit: 'µL', choices: '', plannedQuantityText: '0.100000000001', material: { name: 'Buffer', materialDefinitionId: '11111111-1111-4111-8111-111111111111' } }],
    }] }
  }
  it('retains the process, mandatory lot and exact planned amount through a draft round trip', () => {
    const values = definition()
    expect(protocolDefinitionFormSchema.safeParse(values).success).toBe(true)
    const stored = JSON.parse(serializeProtocolDefinition(values)) as ProtocolDefinition
    expect(stored.steps[0].processType).toBe('masterMix')
    expect(stored.steps[0].captures[0].plannedQuantityText).toBe('0.100000000001')
    expect(stored.steps[0].captures[0].includeTracking).toBe(true)
    expect(JSON.parse(serializeProtocolDefinition(deserializeProtocolDefinition(JSON.stringify(stored))!))).toEqual(stored)
  })
  it('rejects manual identity, optional lot tracking and nonquantity fields', () => {
    const values = definition()
    values.steps[0].captures[0].includeTracking = false
    expect(protocolDefinitionFormSchema.safeParse(values).success).toBe(false)
    values.steps[0].captures[0].includeTracking = true
    values.steps[0].captures[0].plannedQuantityText = '0.0000000000001'
    expect(protocolDefinitionFormSchema.safeParse(values).success).toBe(false)
    values.steps[0].captures[0].plannedQuantityText = '1'
    const manual = { ...values.steps[0].captures[0], material: { name: 'Buffer' } }
    expect(protocolDefinitionFormSchema.safeParse({ ...values, steps: [{ ...values.steps[0], captures: [manual] }] }).success).toBe(false)
    expect(protocolDefinitionFormSchema.safeParse({ ...values, steps: [{ ...values.steps[0], captures: [{ ...values.steps[0].captures[0], type: 'barcode' }] }] }).success).toBe(false)
  })
})

describe('library Lab step source fields', () => {
  const mix = { name: 'Demo mix', masterMixWorkflowId: '11111111-1111-4111-8111-111111111111', masterMixWorkflowRevision: 3 }
  function definition() {
    return { preparationBatchEnabled: true, steps: [{ ...createEmptyProtocolStep(), name: 'Combine specimen and mix', instructions: 'Transfer the specimen material, then add the prepared mix.', captures: [
      { label: 'Specimen material', type: 'biologicalMaterial' as const, scope: 'tube' as const, required: true, unit: '', choices: '' },
      { label: 'Prepared master mix', type: 'masterMix' as const, scope: 'batch' as const, required: true, unit: 'µL', choices: '', quantityBasis: 'perSample' as const, material: mix },
    ] }] }
  }
  it('keeps specimen transfer separate from the exact shared mix revision through save and reopen', () => {
    const values = definition()
    expect(protocolDefinitionFormSchema.safeParse(values).success).toBe(true)
    const stored = JSON.parse(serializeProtocolDefinition(values)) as ProtocolDefinition
    expect(stored.steps[0].captures[0]).toMatchObject({ type: 'biologicalMaterial', scope: 'tube' })
    expect(stored.steps[0].captures[0].material).toBeUndefined()
    expect(stored.steps[0].captures[1]).toMatchObject({ type: 'material', scope: 'batch', quantityBasis: 'perSample', unit: 'µL', material: mix })
    expect(stored.steps[0].captures[1].includeTracking).toBeUndefined()
    expect(deserializeProtocolDefinition(JSON.stringify(stored))?.steps[0].captures[1].type).toBe('masterMix')
    expect(JSON.parse(serializeProtocolDefinition(deserializeProtocolDefinition(JSON.stringify(stored))!))).toEqual(stored)
  })
  it('rejects an unselected mix, an inventory lot and a shared total amount', () => {
    const values = definition()
    const capture = values.steps[0].captures[1]
    for (const field of [
      { ...capture, material: undefined },
      { ...capture, material: { name: 'Purchased reagent', productId: '22222222-2222-4222-8222-222222222222' } },
      { ...capture, includeTracking: true },
      { ...capture, scope: 'shared', quantityBasis: 'total' },
      { ...capture, unit: '' },
    ]) expect(protocolDefinitionFormSchema.safeParse({ ...values, steps: [{ ...values.steps[0], captures: [field] }] }).success).toBe(false)
  })
  it('requires preparation batches and disallows specimen or mix use inside a master-mix preparation step', () => {
    const values = definition()
    expect(protocolDefinitionFormSchema.safeParse({ ...values, preparationBatchEnabled: false }).success).toBe(false)
    expect(protocolDefinitionFormSchema.safeParse({ ...values, steps: [{ ...values.steps[0], processType: 'masterMix' }] }).success).toBe(false)
  })
})
