import { describe, expect, it } from 'vitest'
import { parseExternalOrderListSearch } from './external-order-list-search'

describe('external order list location', () => {
  it('preserves the filtered page context across a record link', () => {
    const value = { q: 'Research', status: 'OnHold', from: '2026-09-01', through: '2026-09-07', mine: true, page: 3 }
    expect(parseExternalOrderListSearch(value)).toEqual(value)
  })
  it('rejects malformed dates and pages from a bookmarked link', () => {
    const parsed = parseExternalOrderListSearch({ page: -1, from: 'not-a-date', through: '2026-99-99' })
    expect(parsed.page).toBeUndefined()
    expect(parsed.from).toBeUndefined()
    expect(parsed.through).toBeUndefined()
  })
})
