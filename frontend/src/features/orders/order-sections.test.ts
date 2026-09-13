import { describe, expect, it } from 'vitest'
import type { SessionCapabilities } from '#/api/session'
import { canAccessOperationalAttention, getOrderLandingSection, getOrderSections } from './order-sections'

function capabilities(values: Partial<SessionCapabilities>): SessionCapabilities {
  return { canViewAllOperationalOrders: true, ...values } as SessionCapabilities
}

describe('Order operations role navigation', () => {
  it('keeps administrator CRM recovery separate from assigned-role Attention queues', () => {
    const roles = capabilities({ canManageOrderConfiguration: true })
    expect(canAccessOperationalAttention(roles)).toBe(false)
    expect(getOrderSections(roles).map(item => item.value)).toContain('attention')
    expect(getOrderLandingSection(roles, 'attention')).toBe('attention')
    expect(canAccessOperationalAttention(capabilities({ canReleasePSeqResults: true }))).toBe(true)
  })
  it('lands a reviewer/release manager on results without administrator queues', () => {
    const roles = capabilities({ canReviewLabWork: true, canReleasePSeqResults: true, canViewTrialProjects: true })
    expect(getOrderSections(roles).map(item => item.value)).toEqual(['trials', 'attention', 'results'])
    expect(getOrderLandingSection(roles)).toBe('results')
    expect(getOrderLandingSection(roles, 'intake')).toBe('results')
    expect(getOrderLandingSection(roles, 'attention')).toBe('attention')
    expect(getOrderLandingSection(roles, 'trials')).toBe('trials')
  })
  it.each(['canManagePSeqBilling', 'canManagePSeqCash', 'canReconcilePSeqCash'] as const)('lands %s on Finance', role => {
    const roles = capabilities({ [role]: true })
    expect(getOrderSections(roles).map(item => item.value)).toEqual(['attention', 'finance'])
    expect(getOrderLandingSection(roles, 'integrations')).toBe('finance')
  })
  it('retains administrator commercial queues and explicit navigation', () => {
    const roles = capabilities({ canManageOrderConfiguration: true, canReleasePSeqResults: true })
    expect(getOrderSections(roles).map(item => item.value)).toEqual(['intake', 'reagent', 'assembly', 'attention', 'results', 'integrations'])
    expect(getOrderLandingSection(roles)).toBe('intake')
    expect(getOrderLandingSection(roles, 'integrations')).toBe('integrations')
  })
  it('does not treat a commercial business role as platform administration', () => {
    const roles = capabilities({ canOperateCommercialWork: true, canAccessCrm: true })
    expect(getOrderSections(roles).map(item => item.value)).toEqual(['attention'])
    expect(getOrderLandingSection(roles)).toBe('attention')
  })
  it('preserves trial-only navigation and handles no available sections', () => {
    expect(getOrderLandingSection(capabilities({ canViewTrialProjects: true }))).toBe('trials')
    expect(getOrderSections(capabilities({}))).toEqual([])
    expect(getOrderLandingSection(capabilities({}))).toBeUndefined()
    expect(getOrderLandingSection()).toBeUndefined()
  })
})
