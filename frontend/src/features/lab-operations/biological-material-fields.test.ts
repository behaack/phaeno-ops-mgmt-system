import { describe, expect, it } from 'vitest'
import type { PreparationMember } from '#/api/lab-preparation'
import { createPreviewBatch } from './ConfigurationPreview'
import { emptyResourceCatalog, resourceEntries, type ResourceField } from './preparation-resource-fields'
import { createLibraryPreparationExample, deserializeProtocolDefinition, protocolDefinitionFormSchema, serializeProtocolDefinition } from './protocol-definition'
import { remainingDecimalQuantity } from './decimal-quantity'

const field: ResourceField = { key: 'sample-input', label: 'Sample material', type: 'biologicalMaterial', scope: 'tube', required: true }
const member = createPreviewBatch({ id: 'example-stage', name: 'Example', sequence: 1, requirement: 'Required', definition: { schemaVersion: 1, steps: [] } }).members[0]
const prefix = `${member.id}_${field.key}`
const values = { [`${prefix}_sourceBarcode`]: member.barcode, [`${prefix}_quantity`]: '20', [`${prefix}_barcode`]: member.libraryTube!.barcode }
const parse = (input: Record<string, string> = values, target: PreparationMember = member, capture = field) => resourceEntries([capture], [target], input, emptyResourceCatalog)

describe('biological material field accounting', () => {
  it('uses the selected source identity and version with positive actual amount and destination scan', () => {
    const result = parse({ ...values, [`${prefix}_resource`]: 'a-different-sample', [`${prefix}_unit`]: 'mL' })
    expect(result.errors).toEqual({})
    expect(result.entries).toEqual([expect.objectContaining({ memberId: member.id, resourceId: member.sourceMaterial!.id, resourceVersion: 1, quantityText: '20', quantityUnit: 'µL', barcode: member.libraryTube!.barcode, materialExhausted: false })])
    expect(result.entries[0].quantity).toBeUndefined()
  })

  it('retains the actual transferred amount when exhaustion overrides a positive computed balance', () => {
    const result = parse({ ...values, [`${prefix}_exhausted`]: 'yes' })
    expect(result.errors).toEqual({})
    expect(result.entries[0]).toMatchObject({ quantityText: '20', materialExhausted: true })
    expect(result.entries[0].exhaustionReason).toBeUndefined()
    expect(member.sourceMaterial!.quantity).toBe(100)
  })

  it('matches scanner letter case and Code 39 wrappers against the exact known tubes', () => {
    const result = parse({ ...values, [`${prefix}_sourceBarcode`]: `*${member.barcode.toLowerCase()}*`, [`${prefix}_barcode`]: `*${member.libraryTube!.barcode.toLowerCase()}*` })
    expect(result.errors).toEqual({})
    expect(result.entries[0].resourceId).toBe(member.sourceMaterial!.id)
  })

  it('rejects zero, negative, overdraw, mismatched units, wrong barcode and unallocated tubes', () => {
    for (const amount of ['', '0', '-1', '101', 'Infinity']) expect(parse({ ...values, [`${prefix}_quantity`]: amount }).errors[`${prefix}_quantity`]).toBeTruthy()
    expect(parse(values, member, { ...field, unit: 'mL' }).errors[`${prefix}_unit`]).toBeTruthy()
    expect(parse({ ...values, [`${prefix}_sourceBarcode`]: 'OTHER-SOURCE' }).errors[`${prefix}_sourceBarcode`]).toBeTruthy()
    expect(parse({ ...values, [`${prefix}_barcode`]: member.barcode }).errors[`${prefix}_barcode`]).toBeTruthy()
    expect(parse(values, { ...member, libraryTube: null }).errors[`${prefix}_barcode`]).toBeTruthy()
    expect(parse(values, { ...member, sourceMaterial: { ...member.sourceMaterial!, status: 'Consumed' } }).errors[`${prefix}_quantity`]).toBeTruthy()
  })

  it('preserves an unknown starting amount while still recording an actual withdrawal', () => {
    const unknown = { ...member, sourceMaterial: { ...member.sourceMaterial!, quantity: null, quantityUnit: null } }
    const result = parse({ ...values, [`${prefix}_unit`]: 'µL' }, unknown)
    expect(result.errors).toEqual({})
    expect(result.entries[0]).toMatchObject({ quantityText: '20', quantityUnit: 'µL' })
    expect(unknown.sourceMaterial.quantity).toBeNull()
    expect(parse(values, unknown).errors[`${prefix}_unit`]).toBeTruthy()
  })

  it('requires an explicit fresh withdrawal for repeated input and prevents adding it after yield', () => {
    const transferred = { ...member, libraryTube: { ...member.libraryTube!, transferId: 'saved-transfer' } }
    expect(parse(values, transferred).entries).toEqual([])
    const deliberate = { ...values, [`${prefix}_additional`]: 'yes' }
    expect(parse(deliberate, transferred).entries).toHaveLength(1)
    expect(parse({ [`${prefix}_additional`]: 'yes' }, transferred).errors[`${prefix}_quantity`]).toBeTruthy()
    expect(parse(deliberate, { ...transferred, output: { id: transferred.libraryTube.id, barcode: transferred.libraryTube.barcode, quantity: 25, quantityUnit: 'µL', confirmed: true } }).entries).toEqual([])
  })

  it('compares precise source and transfer amounts without converting them to numbers', () => {
    const source = { ...member.sourceMaterial!, quantity: 0.12345678901234568, quantityText: '0.1234567890123456789012345678' }
    const precise = { ...member, sourceMaterial: source }
    const quantity = `${prefix}_quantity`
    expect(parse({ ...values, [quantity]: '0.1234567890123456789012345679' }, precise).errors[quantity]).toBeTruthy()
    const result = parse({ ...values, [quantity]: '0.1234567890123456789012345678' }, precise)
    expect(result.errors).toEqual({})
    expect(result.entries[0]).toMatchObject({ quantityText: '0.1234567890123456789012345678' })
    expect(result.entries[0].quantity).toBeUndefined()
    expect(remainingDecimalQuantity('0.2234567890123456789012345678', result.entries[0].quantityText!)).toBe('0.1')
    expect(parse({ ...values, [quantity]: '0.12345678901234567890123456789' }, precise).errors[quantity]).toBeTruthy()
    const largerSource = { ...member, sourceMaterial: { ...member.sourceMaterial!, quantityText: '20' } }
    expect(parse({ ...values, [quantity]: '5.0000000000000000000000000001' }, largerSource).errors[quantity]).toBeTruthy()
  })
})

describe('biological material configuration', () => {
  it('round-trips the type and unit without requiring supplier or reagent identity', () => {
    const form = createLibraryPreparationExample()
    form.steps[0].captures = [{ label: 'Sample material', type: 'biologicalMaterial', scope: 'tube', required: true, unit: 'µL', choices: '' }]
    expect(protocolDefinitionFormSchema.safeParse(form).success).toBe(true)
    expect(deserializeProtocolDefinition(serializeProtocolDefinition(form))?.steps[0].captures[0]).toMatchObject({ type: 'biologicalMaterial', scope: 'tube', unit: 'µL' })
    form.steps[0].captures[0].scope = 'batch'
    expect(protocolDefinitionFormSchema.safeParse(form).success).toBe(false)
    form.steps[0].captures[0].scope = 'tube'
    form.preparationBatchEnabled = false
    expect(protocolDefinitionFormSchema.safeParse(form).success).toBe(false)
  })
})
