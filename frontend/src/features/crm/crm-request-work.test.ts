import { describe, expect, it } from 'vitest'
import type { CrmHandoff } from '#/api/crm'
import type { OrganizationSummary, RelationshipRequest, ServiceEntitlement } from '#/api/organization-management'
import type { TrialDetail } from '#/api/trials'
import { buildRequestWork } from './crm-request-work'

const request = { id: 'request-1', requestType: 'Onboarding', requestedOrganizationKind: 'Customer', organizationId: 'org-1', requestedServices: [] } as unknown as RelationshipRequest
const summary = { isActive: true, organizationKind: 'Customer', administratorStatus: 'Missing' } as OrganizationSummary
const statuses = (steps: ReturnType<typeof buildRequestWork>) => Object.fromEntries(steps.map(step => [step.id, step.status]))

describe('request work requirements', () => {
  it('distinguishes missing, invited and active administrators without adding service requirements to access-only requests', () => {
    const initial = buildRequestWork(request, { summary })
    expect(initial.find(step => step.id === 'invite-admin')?.label).toBe('Invite an organization or department administrator')
    expect(statuses(initial)).toEqual({ 'company-access': 'done', 'invite-admin': 'todo', 'activate-admin': 'todo' })
    expect(statuses(buildRequestWork(request, { summary: { ...summary, administratorStatus: 'Invited' } })))
      .toEqual({ 'company-access': 'done', 'invite-admin': 'done', 'activate-admin': 'waiting' })
    expect(Object.values(statuses(buildRequestWork(request, { summary: { ...summary, administratorStatus: 'Active' } })))).toEqual(['done', 'done', 'done'])
    // Expiration/revocation returns the live summary to Missing; no optimistic checkbox remains.
    expect(statuses(buildRequestWork(request, { summary }))['invite-admin']).toBe('todo')
  })

  it('requires the requested service to be linked to this request and distinguishes future dates from usable access', () => {
    const serviceRequest = { ...request, requestType: 'ServiceChange' as const, requestedServices: ['PSeqLabService' as const] }
    const entitlement = { service: 'PSeqLabService', sourceRequestId: 'another-request', isUsable: true } as ServiceEntitlement
    expect(statuses(buildRequestWork(serviceRequest, { summary, entitlements: [entitlement] }))['service-PSeqLabService']).toBe('todo')
    expect(statuses(buildRequestWork(serviceRequest, { summary, entitlements: [{ ...entitlement, sourceRequestId: request.id }] }))['service-PSeqLabService']).toBe('done')
    expect(statuses(buildRequestWork(serviceRequest, { summary, entitlements: [{ ...entitlement, sourceRequestId: request.id, isUsable: false, isEffective: false, configurationStatus: 'Ready', effectiveFrom: '2999-01-01T00:00:00Z' }] }))['service-PSeqLabService']).toBe('waiting')
  })

  it('keeps offboarding review explicit and checks inactive access without claiming billing or retention was reviewed', () => {
    const offboarding = { ...request, requestType: 'Offboarding' as const }
    expect(statuses(buildRequestWork(offboarding, { summary }))['disable-access']).toBe('todo')
    expect(statuses(buildRequestWork(offboarding, { summary: { ...summary, isActive: false } })))
      .toEqual({ 'review-work': 'review', 'review-obligations': 'review', 'disable-access': 'done' })
  })

  it('shows a relationship conversion as work until the target relationship is present', () => {
    const conversion = { ...request, requestType: 'RelationshipChange' as const }
    expect(statuses(buildRequestWork(conversion, { summary: { ...summary, organizationKind: 'Prospect' } }))['relationship']).toBe('todo')
    expect(statuses(buildRequestWork(conversion, { summary }))['relationship']).toBe('done')
  })

  it('keeps order-start readiness distinct from creating the exact requested order', () => {
    const orderRequest = { ...request, requestType: 'SalesAssistedOrder' as const, requestedServices: ['PSeqLabService' as const] }
    const handoff = { canStartCustomerOrder: true, orderId: null } as CrmHandoff
    expect(statuses(buildRequestWork(orderRequest, { summary, handoff })))
      .toEqual({ 'company-access': 'done', 'order-eligibility': 'done', 'order-created': 'todo' })
    expect(statuses(buildRequestWork(orderRequest, { summary, handoff: { ...handoff, orderId: 'order-1' } }))['order-created']).toBe('done')
    expect(statuses(buildRequestWork({ ...orderRequest, requestedServices: [] }, { summary }))['custom-work']).toBe('review')
  })

  it('follows current Trial scope decisions and acceptance instead of prior-revision approval', () => {
    const evaluation = { ...request, requestType: 'Evaluation' as const }
    const handoff = { type: 'TrialProject', trialProjectId: 'trial-1' } as CrmHandoff
    const trial = { status: 'UnderReview', approvedScopeRevision: 1, acceptedScopeRevision: 1,
      scope: { revision: 2, decisions: [{ domain: 'Commercial', decision: 'Approve', atUtc: '2026-09-19T12:00:00Z' },
        { domain: 'Commercial', decision: 'RequestChanges', atUtc: '2026-09-19T13:00:00Z' }] } } as TrialDetail
    const steps = buildRequestWork(evaluation, { summary, handoff, trial })
    expect(statuses(steps)['trial-Commercial']).not.toBe('done')
    expect(statuses(steps)['trial-accepted']).not.toBe('done')
    expect(steps.find(step => step.id === 'trial-Commercial')?.detail).toContain('requested changes')
    expect(buildRequestWork(evaluation, { summary }).some(step => step.id.startsWith('trial-'))).toBe(false)
  })
})