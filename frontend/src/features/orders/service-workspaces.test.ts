import { describe, expect, it } from 'vitest'
import { noSessionCapabilities } from '#/test-helpers/session'
import { getLabWorkspaceSections } from '#/features/lab-operations/LabOperationsSidebar'
import { getOrderLandingSection } from './order-sections'
import { parseServiceWorkspaceSearch } from './service-workspace-search'
import { commercialRecordRoute, getServiceWorkspaceSections, serviceSectionRoute } from './service-workspaces'

describe('Service workspace route and permission boundaries', () => {
  it('keeps all commercial record routes under Order Ops', () => {
    expect(commercialRecordRoute('lab')).toBe('/order-operations/lab-services/orders/$orderId')
    expect(commercialRecordRoute('reagent')).toBe('/order-operations/partner-services/pseq-kits/$orderId')
    expect(commercialRecordRoute('assembly')).toBe('/order-operations/partner-services/data-assembly/$orderId')
    expect(serviceSectionRoute('trials')).toBe('/order-operations/lab-services/trials')
  })

  it.each(['canManagePSeqBilling', 'canManagePSeqCash', 'canReconcilePSeqCash'] as const)('retains Finance landing without commercial queues for %s', capability => {
    const capabilities = { ...noSessionCapabilities, canViewAllOperationalOrders: true, [capability]: true }
    expect(getOrderLandingSection(capabilities)).toBe('finance')
    expect(serviceSectionRoute('finance')).toBe('/finance')
    expect(getServiceWorkspaceSections('lab-services', capabilities)).toEqual([])
    expect(getServiceWorkspaceSections('partner-services', capabilities)).toEqual([])
  })

  it('keeps Release Managers inside result release without general Lab access', () => {
    const capabilities = { ...noSessionCapabilities, canReleasePSeqResults: true, canViewAllOperationalOrders: true }
    expect(serviceSectionRoute(getOrderLandingSection(capabilities)!)).toBe('/lab-operations/result-release')
    expect(getLabWorkspaceSections(capabilities).map(item => item.value)).toEqual(['release'])
    expect(getServiceWorkspaceSections('partner-services', capabilities)).toEqual([])
  })

  it('retains legacy bookmark filters and validates calendar boundaries', () => {
    expect(parseServiceWorkspaceSearch({ orderSection: 'results', resultState: 'AwaitingRelease', intakePage: '2', queuePage: '-1', queueFrom: '2026-02-30', queueTo: '9999-12-31' })).toMatchObject({
      orderSection: 'results', resultState: 'AwaitingRelease', intakePage: 2, queuePage: 1, queueFrom: undefined, queueTo: undefined,
    })
    expect(parseServiceWorkspaceSearch({ orderSection: 'staging', queueFrom: '2026-10-01', queueTo: '2026-10-03' })).toMatchObject({ orderSection: 'intake', queueFrom: '2026-10-01', queueTo: '2026-10-03' })
  })
})
