import { describe, expect, it } from 'vitest'

import { isProtocolVisible } from './protocol-list'

describe('protocol working-list visibility', () => {
  it('keeps discarded-only records hidden even when showing retired protocols', () => {
    const protocol = { versions: [{ status: 'Discarded' }] }
    expect(isProtocolVisible(protocol)).toBe(false)
    expect(isProtocolVisible(protocol, true)).toBe(false)
    expect(isProtocolVisible({ ...protocol, retiredAtUtc: '2026-09-11T18:00:00Z' }, true)).toBe(false)
  })

  it('keeps new identities and histories with a current version visible', () => {
    expect(isProtocolVisible({ versions: [] })).toBe(true)
    for (const status of ['Draft', 'Approved', 'Active', 'Retired']) {
      expect(isProtocolVisible({ versions: [{ status: 'Discarded' }, { status }] })).toBe(true)
    }
    const retiredProtocol = { retiredAtUtc: '2026-09-11T18:00:00Z', versions: [{ status: 'Approved' }, { status: 'Discarded' }] }
    expect(isProtocolVisible(retiredProtocol)).toBe(false)
    expect(isProtocolVisible(retiredProtocol, true)).toBe(true)
  })
})
