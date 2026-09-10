import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acknowledgeShippingInsert, isShippingInsertAcknowledged, shippingInsertScope } from './shipping-insert-acknowledgement'

const insert = { id: 'insert-1', revision: 1, packetNumber: 'SP-1' }

describe('shipping insert acknowledgement', () => {
  beforeEach(() => window.sessionStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('remembers only the current user, organization, shipment and insert revision in this browser tab', () => {
    const scope = shippingInsertScope('user-1', 'org-1', 'shipment-1')
    acknowledgeShippingInsert(scope, insert)
    expect(isShippingInsertAcknowledged(scope, insert)).toBe(true)
    expect(isShippingInsertAcknowledged(shippingInsertScope('user-2', 'org-1', 'shipment-1'), insert)).toBe(false)
    expect(isShippingInsertAcknowledged(shippingInsertScope('user-1', 'org-2', 'shipment-1'), insert)).toBe(false)
    expect(isShippingInsertAcknowledged(shippingInsertScope('user-1', 'org-1', 'shipment-2'), insert)).toBe(false)
    expect(isShippingInsertAcknowledged(scope, { ...insert, id: 'insert-2' })).toBe(false)
    expect(isShippingInsertAcknowledged(scope, { ...insert, revision: 2 })).toBe(false)
    expect(isShippingInsertAcknowledged(null, insert)).toBe(false)
    window.sessionStorage.clear()
    expect(isShippingInsertAcknowledged(scope, insert)).toBe(false)
  })

  it('keeps an in-memory acknowledgement when browser storage is unavailable without reusing an older stored revision', () => {
    const scope = shippingInsertScope('storage-fallback-user', 'org-1', 'shipment-1')
    acknowledgeShippingInsert(scope, insert)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable') })
    const revised = { ...insert, revision: 2 }
    acknowledgeShippingInsert(scope, revised)
    expect(isShippingInsertAcknowledged(scope, revised)).toBe(true)
    expect(isShippingInsertAcknowledged(scope, insert)).toBe(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable') })
    expect(isShippingInsertAcknowledged(scope, revised)).toBe(true)
  })
})
