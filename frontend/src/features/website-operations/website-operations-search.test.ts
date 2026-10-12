import { describe, expect, it } from 'vitest'
import { parseWebsiteOperationsSearch, websiteOperationsSection } from './website-operations-search'

describe('Website operations bookmarks', () => {
  const id = 'AA111111-2222-3333-4444-555555555555'
  it('preserves independent queue pages and normalizes exact-item identity', () => {
    expect(parseWebsiteOperationsSearch({ section: 'demo-requests', mailingListPage: '3', demoRequestPage: 7, requestId: id })).toMatchObject({ section: 'demo-requests', mailingListPage: 3, demoRequestPage: 7, requestId: id.toLowerCase() })
  })
  it('selects the corresponding intake or recovery queue for an old home link', () => {
    expect(websiteOperationsSection(parseWebsiteOperationsSearch({ requestId: id }))).toBe('demo-requests')
    expect(websiteOperationsSection(parseWebsiteOperationsSearch({ deliveryId: id }))).toBe('email-delivery')
    expect(websiteOperationsSection({})).toBe('mailing-list')
  })
  it('rejects invalid filters and bounds oversized pages', () => {
    expect(parseWebsiteOperationsSearch({ section: 'unknown', mailingListPage: -2, demoRequestPage: 99999999, requestId: '../', deliveryId: ['id'] })).toEqual({ section: undefined, mailingListPage: undefined, demoRequestPage: 100000, requestId: undefined, deliveryId: undefined })
  })
})
