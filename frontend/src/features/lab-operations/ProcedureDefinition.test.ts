import { describe, expect, it } from 'vitest'
import { createEmptyProtocolCapture, createEmptyProtocolStep, deserializeSavedProcedure, deserializeProtocolDefinition, serializeProtocolDefinition } from './protocol-definition'

describe('structured procedure API definitions', () => {
  it('blocks empty saved procedures instead of creating a blank replacement', () => {
    expect(deserializeSavedProcedure('{}')).toBeNull()
    expect(deserializeSavedProcedure('{"steps":[]}')).toBeNull()
  })
  it('assigns stable identities before same-named instructions or fields are reordered', () => {
    const first = { ...createEmptyProtocolStep(), name: 'Inspect', instructions: 'First instruction.', captures: [{ ...createEmptyProtocolCapture(), label: 'Reading' }, { ...createEmptyProtocolCapture(), label: 'Reading' }] }
    const second = { ...createEmptyProtocolStep(), name: 'Inspect', instructions: 'Second instruction.' }
    const original = JSON.parse(serializeProtocolDefinition({ steps: [first, second] }))
    const reordered = JSON.parse(serializeProtocolDefinition({ steps: [second, { ...first, captures: [...first.captures].reverse() }] }))
    expect(reordered.steps.map((s: { key: string }) => s.key)).toEqual(original.steps.map((s: { key: string }) => s.key).reverse())
    expect(reordered.steps[1].captures.map((c: { key: string }) => c.key)).toEqual(original.steps[0].captures.map((c: { key: string }) => c.key).reverse())
  })
  it('retains non-resource entries whose current API quantity basis is null', () => {
    const definition = { schemaVersion: 1, preparationBatchEnabled: true, steps: [{ key: 'inspect', name: 'Inspect mix', instructions: 'Inspect this preparation.', processType: 'masterMix', required: true, repeatable: false, operatorConfirmation: true, inputMaterials: [], equipmentTypes: [], preparedOutputs: [], condition: null, requiredRole: null, illustrations: null, copiedFrom: null, qcGate: null, captures: [{ key: 'temperature', label: 'Temperature', type: 'number', required: true, scope: 'batch', unit: '°C', quantityBasis: null, options: null }] }] }
    const form = deserializeProtocolDefinition(JSON.stringify(definition))
    expect(form?.steps[0].name).toBe('Inspect mix')
    expect(form?.steps[0].captures[0].label).toBe('Temperature')
    expect(JSON.parse(serializeProtocolDefinition(form!)).steps[0].captures[0]).toMatchObject({ key: 'temperature', scope: 'batch', unit: '°C' })
  })
})
