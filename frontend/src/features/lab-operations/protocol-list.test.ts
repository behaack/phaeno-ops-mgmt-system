import { describe, expect, it } from 'vitest'

import { isProtocolVisible } from './protocol-list'

describe('protocol working-list visibility', () => {
  it('keeps protocol records visible until they are explicitly deleted', () => {
    expect(isProtocolVisible()).toBe(true)
  })
})
