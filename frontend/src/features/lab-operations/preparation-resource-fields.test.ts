import type { LabMaterialLot } from '#/api/lab-operations'
import { describe, expect, it } from 'vitest'
import { createPreviewBatch } from './ConfigurationPreview'
import { emptyResourceCatalog, eligibleResources, materialLotMatches, resourceEntries, type ResourceField } from './preparation-resource-fields'

const members = createPreviewBatch({ id: 'stage', name: 'Example', sequence: 1, requirement: 'Required', definition: { schemaVersion: 1, steps: [] } }).members
describe('inline resource entries', () => {
  it('requires registered equipment even when older configuration disabled tracking or requiredness', () => {
    const equipment: ResourceField = { key: 'instrument', label: 'Instrument', type: 'equipment', scope: 'batch', required: false, includeTracking: false }
    const invalidEntries: Record<string, string>[] = [{}, { shared_instrument_name: 'Free-text instrument' }, { shared_instrument_resource: 'missing' }]
    for (const values of invalidEntries) {
      expect(resourceEntries([equipment], members, values, emptyResourceCatalog).errors.shared_instrument_resource).toBeTruthy()
    }
    const catalog = { ...emptyResourceCatalog, equipment: [{ id: 'asset', assetCode: 'EQ-1', name: 'Instrument', equipmentType: 'Test', location: 'Bench', status: 'Active' as const, lastCalibrationOn: null, calibrationDueOn: null, version: 1 }] }
    const result = resourceEntries([equipment], members, { shared_instrument_resource: 'asset', shared_instrument_name: 'Ignored name' }, catalog)
    expect(result.errors).toEqual({})
    expect(result.entries).toEqual([{ fieldKey: 'instrument', resourceId: 'asset', resourceVersion: 1 }])
  })
  const field: ResourceField = { key: 'buffer', label: 'Buffer', type: 'material', required: true, scope: 'batch', quantityBasis: 'perSample', material: { name: 'Configured buffer', vendor: 'Configured vendor' } }
  it('takes material identity from configuration and ignores runtime replacement values', () => {
    const result = resourceEntries([field], members, { shared_buffer_product: 'manual', shared_buffer_name: 'In-house buffer', shared_buffer_vendor: 'In-house', shared_buffer_quantity: '10', shared_buffer_unit: 'µL' }, emptyResourceCatalog)
    expect(result.errors).toEqual({})
    expect(result.entries).toEqual([{ fieldKey: 'buffer', quantity: 10, quantityUnit: 'µL' }])
  })
  it('requires runtime quantity and unit without asking for a product', () => {
    const result = resourceEntries([field], members, { shared_buffer_product: 'missing' }, emptyResourceCatalog)
    expect(result.errors.shared_buffer_product).toBeUndefined()
    expect(result.errors.shared_buffer_quantity).toBeTruthy()
    expect(result.errors.shared_buffer_unit).toBeTruthy()
  })
  it('applies output defaults per sample while retaining individual overrides and existing outputs', () => {
    const output: ResourceField = { key: 'library', label: 'Library', type: 'output', required: true, scope: 'tube' }
    const values = { shared_library_quantity: '20', shared_library_unit: 'µL', shared_library_location: 'Example freezer', 'example-2_library_quantity': '15' }
    const result = resourceEntries([output], members, values, emptyResourceCatalog)
    expect(result.errors).toEqual({})
    expect(result.entries.map(e => [e.memberId, e.quantity])).toEqual([['example-1', 20], ['example-2', 15]])
    expect(resourceEntries([output], [{ ...members[0], output: { id: 'existing', barcode: 'LIBRARY', quantity: 20, quantityUnit: 'µL', confirmed: false } }], {}, emptyResourceCatalog).entries).toEqual([])
  })
})


describe('exact configured material lot selection', () => {
  const lot: LabMaterialLot = { id: 'lot', kind: 'SupplierLot', supplierId: 'vendor', supplierProductId: 'product-a', productName: 'A', supplier: 'Vendor', materialDefinitionId: 'definition', materialKey: 'material', name: 'Reagent', lotNumber: 'LOT', storageLocationId: 'storage', storageLocation: 'Shelf', availableQuantity: 20, quantityUnit: 'mL', expirationOrRetestDate: null, qcDisposition: 'Passed', qcPerformedOn: null, qcFailureReason: null, components: [], version: 1 }
  const field: ResourceField = { key: 'reagent', label: 'Reagent', type: 'material', required: true, includeTracking: true, scope: 'batch', material: { name: 'A', productId: 'product-a', supplierId: 'vendor' } }
  it('excludes unlinked lots and other products from the same vendor', () => {
    expect(materialLotMatches(field, lot)).toBe(true)
    for (const wrong of [{ ...lot, supplierProductId: null }, { ...lot, supplierProductId: 'product-b' }]) {
      expect(materialLotMatches(field, wrong)).toBe(false)
      expect(resourceEntries([field], members, { shared_reagent_resource: 'lot', shared_reagent_quantity: '1' }, { ...emptyResourceCatalog, materialLots: [wrong] }).errors.shared_reagent_resource).toBeTruthy()
    }
  })
  it('uses the configured unit and rejects lots with a different unit', () => {
    const configured = { ...field, unit: 'mL' }
    const values = { shared_reagent_resource: 'lot', shared_reagent_quantity: '1', shared_reagent_unit: 'L' }
    const result = resourceEntries([configured], members, values, { ...emptyResourceCatalog, materialLots: [lot] })
    expect(result.errors).toEqual({})
    expect(result.entries[0].quantityUnit).toBe('mL')
    const mismatch = { ...lot, quantityUnit: 'µL' }
    expect(materialLotMatches(configured, mismatch)).toBe(false)
    expect(resourceEntries([configured], members, values, { ...emptyResourceCatalog, materialLots: [mismatch] }).errors.shared_reagent_resource).toBeTruthy()
  })
  it('matches prepared lots by definition and excludes empty, failed and expired stock', () => {
    const preparedField = { ...field, material: { name: 'Buffer', materialDefinitionId: 'definition' } }
    expect(materialLotMatches(preparedField, lot)).toBe(false)
    expect(materialLotMatches(preparedField, { ...lot, kind: 'PreparedReagent', supplierProductId: null, supplierId: null })).toBe(true)
    expect(materialLotMatches(preparedField, { ...lot, kind: 'PreparedReagent', materialDefinitionId: 'other' })).toBe(false)
    expect(eligibleResources({ ...emptyResourceCatalog, materialLots: [lot, { ...lot, availableQuantity: 0 }, { ...lot, qcDisposition: 'Failed' }, { ...lot, expirationOrRetestDate: '2000-01-01' }] }).materialLots).toEqual([lot])
  })
})


describe('shared material amount exceptions', () => {
  const field: ResourceField = { key: 'buffer', label: 'Buffer', type: 'material', required: true, scope: 'shared', unit: 'µL', quantityBasis: 'perSample', material: { name: 'Buffer' } }
  const values = { shared_buffer_quantity: '10', 'example-2_buffer_exception': 'yes', 'example-2_buffer_quantity': '20', 'example-2_buffer_reason': 'Extra amount added', 'example-2_buffer_disposition': 'fail' }
  it('retains the common amount and actual failed-tube override separately', () => {
    const result = resourceEntries([field], members, values, emptyResourceCatalog)
    expect(result.errors).toEqual({})
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]).toMatchObject({ quantity: 10, quantityUnit: 'µL' })
    expect(result.entries[1]).toMatchObject({ memberId: 'example-2', quantity: 20, disposition: 'fail', exceptionReason: 'Extra amount added' })
  })
  it('requires a reason and disallows continuing an unknown amount', () => {
    const result = resourceEntries([field], members, { ...values, 'example-2_buffer_unknown': 'yes', 'example-2_buffer_reason': '', 'example-2_buffer_disposition': 'continue' }, emptyResourceCatalog)
    expect(result.entries[1].quantity).toBeUndefined()
    expect(result.errors['example-2_buffer_reason']).toBeTruthy()
    expect(result.errors['example-2_buffer_disposition']).toBeTruthy()
    expect(resourceEntries([field], members, { ...values, 'example-2_buffer_unknown': 'yes', 'example-2_buffer_disposition': 'hold' }, emptyResourceCatalog).errors).toEqual({})
  })
  it('allows an actual zero without treating it as unknown and ignores unchecked overrides', () => {
    expect(resourceEntries([field], members, { ...values, 'example-2_buffer_quantity': '0' }, emptyResourceCatalog).errors).toEqual({})
    expect(resourceEntries([field], members, { ...values, 'example-2_buffer_exception': '' }, emptyResourceCatalog).entries).toHaveLength(1)
  })
  it('counts overrides instead of their batch shares and checks combined stock', () => {
    const lot: LabMaterialLot = { id: 'lot', kind: 'PreparedReagent', materialDefinitionId: 'definition', materialKey: 'buffer', name: 'Buffer', lotNumber: 'LOT', supplierId: null, supplier: null, storageLocationId: 'storage', storageLocation: 'Shelf', availableQuantity: 30, quantityUnit: 'µL', expirationOrRetestDate: null, qcDisposition: 'Passed', qcPerformedOn: null, qcFailureReason: null, components: [], version: 1 }
    const tracked = { ...field, includeTracking: true, material: { name: 'Buffer', materialDefinitionId: 'definition' } }
    const input = { ...values, shared_buffer_resource: 'lot' }
    expect(resourceEntries([tracked], members, input, { ...emptyResourceCatalog, materialLots: [lot] }).errors).toEqual({})
    expect(resourceEntries([tracked], members, input, { ...emptyResourceCatalog, materialLots: [{ ...lot, availableQuantity: 29 }] }).errors.shared_buffer_quantity).toBeTruthy()
    expect(eligibleResources({ ...emptyResourceCatalog, materialLots: [{ ...lot, quantityHoldReason: 'Uncertain amount' }] }).materialLots).toEqual([])
  })
})
