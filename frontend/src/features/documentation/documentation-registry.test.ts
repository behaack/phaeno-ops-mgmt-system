import { describe, expect, it } from 'vitest'

import {
  documentationAudienceKeys,
  documentationEntries,
  getDocumentationEntries,
  getDocumentationEntry,
  getDocumentationSearchIdentity,
} from './documentation-registry'

describe('documentation registry', () => {
  it('provides ordered maintained guides for each supported audience', () => {
    for (const audience of documentationAudienceKeys) {
      const entries = getDocumentationEntries(audience)

      expect(entries.map((entry) => entry.order)).toEqual([
        ...(audience === 'phaeno'
          ? [10, 20, 30, 40, 45, 50, 60]
          : [10, 20, 30, 40, 50, 60]),
      ])
      expect(entries.every((entry) => entry.audience === audience)).toBe(true)
    }
  })

  it('uses stable, unique audience and slug identities with indexable metadata', () => {
    const identities = documentationEntries.map(getDocumentationSearchIdentity)

    expect(new Set(identities).size).toBe(documentationEntries.length)
    for (const entry of documentationEntries) {
      expect(entry.title).not.toBe('')
      expect(entry.summary).not.toBe('')
      expect(entry.section).not.toBe('')
      expect(entry.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(entry.Content).toBeTypeOf('function')
      expect(entry.locale).toBe(
        entry.audience === 'phaeno' ? null : 'en-US',
      )
    }
  })

  it('includes locale in external search identities but not internal Phaeno identities', () => {
    const prospectGuide = getDocumentationEntry('prospect', 'getting-started')
    const customerGuide = getDocumentationEntry('customer', 'getting-started')
    const phaenoGuide = getDocumentationEntry('phaeno', 'getting-started')

    expect(getDocumentationSearchIdentity(prospectGuide!)).toBe(
      'prospect/en-US/getting-started',
    )
    expect(getDocumentationSearchIdentity(customerGuide!)).toBe(
      'customer/en-US/getting-started',
    )
    expect(getDocumentationSearchIdentity(phaenoGuide!)).toBe(
      'phaeno/getting-started',
    )
  })

  it('resolves a guide only within its audience', () => {
    expect(getDocumentationEntry('prospect', 'data-library')?.title).toBe(
      'Use the Data Library',
    )
    expect(getDocumentationEntry('customer', 'lab-services')?.title).toBe(
      'Request laboratory services',
    )
    expect(getDocumentationEntry('phaeno', 'lab-operations')?.title).toBe(
      'Laboratory operations',
    )
    expect(getDocumentationEntry('partner', 'lab-services')).toBeUndefined()
    expect(getDocumentationEntry('prospect', 'lab-services')).toBeUndefined()
  })
})
