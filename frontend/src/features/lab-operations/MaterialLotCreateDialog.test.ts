import { describe, expect, it } from 'vitest'

import { materialLotFormSchema } from './MaterialLotCreateDialog'

const supplierLot = {
  kind: 'SupplierLot' as const,
  materialSelection: 'material-id',
  newMaterialName: '',
  lotNumber: 'LOT-42',
  supplierSelection: 'supplier-id',
  newSupplierName: '',
  storageSelection: 'storage-id',
  newStorageLocationName: '',
  availableQuantity: '10',
  quantityUnit: 'uL',
  expirationOrRetestDate: '2027-01-31',
  components: [],
}

describe('material lot form validation', () => {
  it('accepts a controlled supplier lot without a time-of-day expiration', () => {
    expect(materialLotFormSchema.safeParse(supplierLot).success).toBe(true)
  })

  it('requires structured component lots for a prepared reagent', () => {
    const result = materialLotFormSchema.safeParse({
      ...supplierLot,
      kind: 'PreparedReagent',
      supplierSelection: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ['components'] }),
      ]))
    }
  })

  it('requires names when a user creates reference data through the related-record modals', () => {
    const result = materialLotFormSchema.safeParse({
      ...supplierLot,
      materialSelection: '__new__',
      supplierSelection: '__new__',
      storageSelection: '__new__',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['newMaterialName', 'newSupplierName', 'newStorageLocationName']),
      )
    }
  })
})
