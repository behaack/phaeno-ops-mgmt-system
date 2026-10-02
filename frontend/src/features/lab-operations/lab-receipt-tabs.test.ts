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
  it('defaults to kit requests while preserving explicit receipt and accession links', () => {
    expect(resolveLabReceiptTab(undefined)).toBe('kit-requests')
    expect(resolveLabReceiptTab('receiving')).toBe('receiving')
    expect(resolveLabReceiptTab('accession')).toBe('accession')
    expect(resolveLabReceiptTab('standard-kits')).toBe('kit-requests')
    expect(resolveLabReceiptTab('kit-requests')).toBe('kit-requests')
    expect(resolveLabReceiptTab('return-kits')).toBe('kit-requests')
  })
})
