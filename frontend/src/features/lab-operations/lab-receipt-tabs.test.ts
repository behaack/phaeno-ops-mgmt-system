import { describe, expect, it } from 'vitest'
import { parseLabReceiptTab, resolveLabReceiptTab } from './lab-receipt-tabs'

describe('shipping and receiving tab links', () => {
  it('validates known tabs and ignores malformed values', () => {
    expect(parseLabReceiptTab('standard-kits')).toBe('standard-kits')
    expect(parseLabReceiptTab('receiving')).toBe('receiving')
    expect(parseLabReceiptTab('accession')).toBe('accession')
    expect(parseLabReceiptTab(['kit-requests'])).toBeUndefined()
    expect(parseLabReceiptTab('unknown')).toBeUndefined()
  })
  it('defaults to permitted work and preserves shipment-specific entry', () => {
    expect(resolveLabReceiptTab(undefined, undefined, true)).toBe('kit-requests')
    expect(resolveLabReceiptTab(undefined, undefined, false)).toBe('receiving')
    expect(resolveLabReceiptTab(undefined, 'shipment-1', true)).toBe('return-kits')
    expect(resolveLabReceiptTab('receiving', 'shipment-1', true)).toBe('receiving')
  })
  it('does not select configuration-only content without its capability', () => {
    expect(resolveLabReceiptTab('standard-kits', undefined, false)).toBe('receiving')
    expect(resolveLabReceiptTab('kit-requests', undefined, false)).toBe('receiving')
  })
})
