import { describe, expect, it } from 'vitest'
import { parseDashboardSection } from './dashboard-search'
import { parsePurchasingSection } from '#/features/lab-operations/purchasing-search'

describe('pure workspace route selections', () => {
  it('retains valid bookmarked sections and rejects other values', () => {
    for (const value of ['orders','lab','accounts','webOps']) expect(parseDashboardSection(value)).toBe(value)
    for (const value of ['suppliers','products','materials']) expect(parsePurchasingSection(value)).toBe(value)
    for (const value of [undefined,null,1,'unknown',{},'WEBOPS']) {
      expect(parseDashboardSection(value)).toBeUndefined()
      expect(parsePurchasingSection(value)).toBeUndefined()
    }
  })
})
