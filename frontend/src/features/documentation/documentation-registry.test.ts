import { describe, expect, it } from 'vitest'

import {
  documentationAudienceKeys,
  documentationEntries,
  getDocumentationEntries,
  getDocumentationEntry,
  getDocumentationSearchIdentity,
} from './documentation-registry'

describe('documentation registry', () => {
  it('organizes Phaeno staff tasks without a standalone Trial home entry', () => {
    const entries = getDocumentationEntries('phaeno')
    expect(entries.filter(entry => !entry.parentSlug).slice(0, 3).map(entry => entry.title))
      .toEqual(['Phaeno operations guide', 'POMS user administration', 'CRM'])
    const trial = getDocumentationEntry('phaeno', 'trial-projects')!
    expect(trial.parentSlug).toBe('order-operations')
    expect(trial.topicIds).toContain('orders')
    expect(trial.topicIds).not.toContain('trials')
    const howTos = entries.filter(entry => entry.contentType === 'how-to')
    expect(howTos.map(entry => entry.slug)).toEqual([
      'how-to-onboard-customer',
      'how-to-place-customer-order', 'how-to-configure-samples-shipping', 'how-to-lab-protocol',
    ])
    expect(howTos.every(entry => entry.parentSlug)).toBe(true)
    expect(getDocumentationEntry('prospect', 'trial-projects')?.topicIds).toContain('trials')
    expect(getDocumentationEntry('customer', 'how-to-place-customer-order')).toBeUndefined()
  })

  it('provides ordered maintained guides for each supported audience', () => {
    for (const audience of documentationAudienceKeys) {
      const entries = getDocumentationEntries(audience)

      expect(entries.map((entry) => entry.order)).toEqual([
        ...(audience === 'phaeno'
          ? [
              10, 12, 15, 15.5, 16, 17, 18, 19, 20, 21, 22,
              30, 31, 32, 33, 34,
              40, 40.5, 41, 42, 43, 44, 45, 46,
              50, 51, 52, 53, 53.5, 54, 55, 56, 57, 58,
              60, 70,
            ]
          : audience === 'prospect'
            ? [10, 20, 24, 25, 30, 40, 50, 60]
            : audience === 'customer'
              ? [10, 20, 30, 35, 40, 45, 50, 60]
              : [10, 20, 25, 30, 40, 45, 50, 60]),
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
      expect(entry.Content).toHaveProperty('$$typeof', Symbol.for('react.lazy'))
      expect(entry.locale).toBe(
        entry.audience === 'phaeno' ? null : 'en-US',
      )
      if (entry.parentSlug) {
        const parent = getDocumentationEntry(entry.audience, entry.parentSlug)
        expect(parent).toBeDefined()
        expect(parent?.parentSlug).toBeUndefined()
        expect(parent?.overviewTitle).not.toBe('')
      }
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
    expect(getDocumentationEntry('prospect', 'sample-shipping')?.title).toBe(
      'Prepare and ship samples',
    )
    expect(getDocumentationEntry('customer', 'sample-shipping')?.title).toBe(
      'Prepare and ship samples',
    )
    expect(getDocumentationEntry('phaeno', 'lab-operations')?.title).toBe(
      'Laboratory operations',
    )
    expect(
      getDocumentationEntry('phaeno', 'lab-protocol-execution')?.parentSlug,
    ).toBe('lab-operations')
    expect(
      getDocumentationEntry('phaeno', 'crm-portal-handoffs')?.parentSlug,
    ).toBe('crm')
    expect(
      getDocumentationEntry('phaeno', 'order-billing-payment-release')
        ?.parentSlug,
    ).toBe('order-operations')
    expect(
      getDocumentationEntry('phaeno', 'data-organization-grants')?.parentSlug,
    ).toBe('data-provisioning-and-accounts')
    expect(getDocumentationEntry('partner', 'lab-services')?.audience).toBe('partner')
    expect(getDocumentationEntry('customer', 'lab-services')?.audience).toBe('customer')
    expect(getDocumentationEntry('partner', 'lab-services')).not.toBe(
      getDocumentationEntry('customer', 'lab-services'),
    )
    expect(getDocumentationEntry('prospect', 'lab-services')).toBeUndefined()
  })
})
