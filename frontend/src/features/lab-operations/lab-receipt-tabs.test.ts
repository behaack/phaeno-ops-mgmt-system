import { describe, expect, it } from 'vitest'
import { parseLabReceiptTab, resolveLabReceiptTab, resolveTransportationKitTab } from './lab-receipt-tabs'

describe('shipping and receiving tab links', () => {
  it('validates known tabs and ignores malformed values', () => {
    expect(parseLabReceiptTab('standard-kits')).toBe('standard-kits')
    expect(parseLabReceiptTab('receiving')).toBe('receiving')
    expect(parseLabReceiptTab('accession')).toBe('accession')
    expect(parseLabReceiptTab(['kit-requests'])).toBeUndefined()
    expect(parseLabReceiptTab('unknown')).toBeUndefined()
  })
  it('keeps receipt and accession focused on arriving samples', () => {
    expect(resolveLabReceiptTab(undefined)).toBe('receiving')
    expect(resolveLabReceiptTab('receiving')).toBe('receiving')
    expect(resolveLabReceiptTab('accession')).toBe('accession')
    expect(resolveLabReceiptTab('standard-kits')).toBe('receiving')
    expect(resolveLabReceiptTab('kit-requests')).toBe('receiving')
  })
  it('opens kit inventory for administrators and sent kits for other operators', () => {
    expect(resolveTransportationKitTab(undefined, true)).toBe('standard-kits')
    expect(resolveTransportationKitTab('kit-requests', true)).toBe('kit-requests')
    expect(resolveTransportationKitTab('kit-requests', false)).toBe('return-kits')
    expect(resolveTransportationKitTab('return-kits', false)).toBe('return-kits')
  })
})
