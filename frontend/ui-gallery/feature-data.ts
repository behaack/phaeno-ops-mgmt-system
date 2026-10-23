import { api } from '#/api/client'
import { AxiosError } from 'axios'
import { workflowResponse } from './workflow-data'
import type { CrmCompany, CrmCompanyPerson } from '#/api/crm'
import type { RelationshipRequest } from '#/api/organization-management'
import type { AccountsReceivableCustomer } from '#/api/pseq-order-to-cash'
import type { AssemblyJob } from '#/api/lab-assembly'

export const stamp = '2026-10-22T16:00:00Z'
export const company: CrmCompany = {
  id: 'demo-company', name: 'DEMO — Example Research', websiteUrl: 'https://example.invalid', domainName: 'example.invalid', phone: null,
  industry: 'Research', description: 'Fictional guide example; no live accounts or provider activity.', addressLine1: null, addressLine2: null,
  city: null, region: null, postalCode: null, countryCode: 'US', employeeCount: 12, lifecycleState: 'Engaged', source: 'Demonstration', tags: [], aliases: [],
  mergedIntoCompanyId: null, ownerUserId: 'demo-author', ownerName: 'Demo Researcher', accessOrganizationId: null, setupOrganizationId: null,
  portalRelationship: null, portalReadiness: null, portalAccessStatus: 'NotEnabled', isActive: true, createdAt: stamp, updatedAt: stamp, version: 1,
}
export const person: CrmCompanyPerson = {
  recordKind: 'Contact', contactAssociationId: 'demo-association', contactId: 'demo-contact', contactVersion: 1, portalUserId: null,
  organizationMembershipId: null, invitationId: null, contactUserLinkId: null, contactUserLinkVersion: null, displayName: 'Alex Example',
  firstName: 'Alex', lastName: 'Example', email: 'alex@example.invalid', jobTitle: 'Research administrator', relationshipRole: 'Primary contact',
  isPrimaryCompany: true, isContactActive: true, portalAccessState: 'NotInvited', isOrganizationAdmin: false, departments: [],
  suggestedPortalUserId: null, suggestedInvitationId: null, requiresIdentityReview: false,
}
export const request = { id: 'demo-request', requestNumber: 'DEMO-PRQ-002', companyId: company.id, organizationId: 'demo-customer',
  candidateOrganizationName: company.name, requestType: 'ServiceChange', requestedOrganizationKind: 'Customer', requestedServices: ['PSeqLabService'],
  status: 'Approved', summary: 'Research Department — approved PSeq Lab Service scope.', decisionReason: 'Reviewed fictional scope.',
  applicationNotes: null, createdAt: stamp, updatedAt: stamp, version: 1,
} as RelationshipRequest
export const billing: AccountsReceivableCustomer = {
  organizationId: 'demo-customer', organizationName: company.name, billingContactName: 'Alex Example', billingContactEmail: 'billing@example.invalid',
  billingAddressJson: JSON.stringify({ line1: '100 Example Way', line2: null, city: 'Example City', region: 'CA', postalCode: '90000', countryCode: 'US' }),
  paymentTermsDays: 30, taxDecision: 'Exempt', approvedTaxRate: null, taxExemptionEvidence: 'DEMO — fictional exemption evidence; not a valid tax record', financeApprovedByUserId: null,
  financeApprovedAtUtc: null, financeApprovalNotes: null, configurationVersion: 1, profileVersion: 1,
}
const availability = { available: true, message: '', supportsCancellation: true, recipes: [{ key: 'demo', name: 'pseq_data_assembler', version: '0.1.0', parametersJson: '{}', simulated: true }] }
const job: AssemblyJob = { id: 'demo-job', labWorkOrderId: 'demo-work', labSpecimenId: 'demo-specimen', sampleName: 'DEMO-ASM-20261022', sequencingRunNumber: 1,
  state: 'Succeeded', requestedAtUtc: stamp, startedAtUtc: stamp, stoppedAtUtc: '2026-10-22T16:03:00Z', dispositionAtUtc: '2026-10-22T16:03:00Z', durationSeconds: 180,
  isTerminal: true, cancellationRequested: false, dispositionReason: null, attentionReason: null, previousJobId: null, retryReason: null, labAnalysisRunId: null,
  outputsDeclared: true, providerKey: 'simulation', providerJobId: 'demo', requestedByUserId: 'demo-author', version: 1, progress: null, simulated: true }

/** Strict in-memory transport: unknown requests throw; nothing reaches an API or email provider. */
export function installFeatureData(scene: string, state = 'ready') {
  let failedRead = false
  api.defaults.adapter = async config => {
    const path = (config.url ?? '').split('?')[0]
    const primary = /(?:\/invoices|\/sample-shipping\/page|\/trials\/trial-1|\/demo-job\/qc)$/.test(path)
    const write = !['get', 'head'].includes(config.method ?? 'get')
    if (state === 'loading' && primary || state === 'pending' && write) return new Promise(() => {})
    if (state === 'error' && primary && !failedRead || write && ['save-error','conflict'].includes(state)) {
      failedRead = true
      const status = state === 'conflict' ? 409 : 503
      throw new AxiosError('Fictional gallery request failed', 'ERR_BAD_RESPONSE', config, undefined, { config, status, statusText: 'Demonstration failure', headers: {}, data: { success: false, error: { code: status === 409 ? 'concurrency_conflict' : 'service_unavailable', message: status === 409 ? 'The record changed. Reload the current record and review your retained entries.' : 'The demonstration service is unavailable. Your entered values are retained.' } } })
    }
    let data: unknown; let raw = false
    const workflow = workflowResponse(path, state === 'empty', scene)
    if (path === '/platform/accounts-receivable/customers') data = [billing]
    else if (workflow !== undefined) data = workflow
    else if (path === '/platform/crm/companies/demo-company') data = company
    else if (path === '/platform/crm/companies/demo-company/people') data = [person]
    else if (/\/platform\/crm\/(?:companies\/demo-company\/(?:contacts|handoffs)|opportunities|owners)$/.test(path)) data = []
    else if (/\/departments$/.test(path)) { raw = true; data = [{ id: 'demo-department', organizationId: 'demo-customer', code: 'RES', name: 'Research', description: 'Fictional research unit', isActive: true, isDefault: true, activeMemberCount: 1, version: 1 }] }
    else if (/\/entitlements$/.test(path)) data = [{ id: 'demo-entitlement', organizationId: 'demo-customer', departmentId: 'demo-department', service: 'PSeqLabService', sourceRequestId: request.id, configurationStatus: 'Ready', effectiveFrom: '2026-10-01T00:00:00Z', effectiveTo: null, isUsable: true, isEffective: true, version: 1 }]
    else if (/\/handoffs$/.test(path)) data = []
    else if (/\/summary$/.test(path)) data = { organizationId: 'demo-customer', organizationName: company.name, organizationKind: 'Customer', isActive: true, administratorStatus: 'Active', portalReadiness: 'Ready' }
    else if (/\/completion-readiness$/.test(path)) data = { canComplete: scene !== '09-work-needed', completesAutomatically: false, blockers: [] }
    else if (/\/operational-readiness$/.test(path)) data = { state: scene === '09-work-needed' ? 'Blocked' : 'Ready', canPlaceLabServiceOrders: scene !== '09-work-needed', blockers: scene === '09-work-needed' ? [{ code: 'ActivePSeqOfferingRequired', label: 'Active laboratory offering', nextAction: 'Review and activate the approved shared laboratory offering in Order settings.' }, { code: 'BillingRequired', label: 'Complete billing and Finance approval', nextAction: 'Review the Customer billing profile and obtain Finance approval.' }] : [], checks: [], services: [] }
    else if (path === '/invitations/preview') { raw = true; data = { email: person.email, firstName: person.firstName, lastName: person.lastName, organizationName: company.name, expiresAt: '2026-10-29T16:00:00Z', version: 1, isOrganizationAdmin: false, departments: [{ departmentId: 'demo-department', departmentName: 'Research', isDepartmentAdmin: true }] } }
    else if (/\/assembly-jobs\/inputs$/.test(path)) data = [1,2].map(n => ({ id: `demo-input-${n}`, labWorkOrderId: job.labWorkOrderId, labSpecimenId: job.labSpecimenId, sampleName: job.sampleName, sequencingRunNumber: 1, labSpecimenAttemptId: 'demo-attempt', providerRunReference: 'DEMO-RUN-001', sampleMappingReference: 'DEMO-MAP-001', sizeBytes: 1024, sha256: 'a'.repeat(64) }))
    else if (/\/assembly-jobs(?:\/page)?$/.test(path)) data = { availability, canOperate: true, jobs: [job, { ...job, id: 'demo-cancelled', state: 'CancelledBeforeStart', startedAtUtc: null, stoppedAtUtc: null, durationSeconds: null, dispositionAtUtc: '2026-10-22T16:01:00Z' }], page: 1, pageSize: 25, totalCount: 2 }
    else if (/\/source-samples\/demo-source$/.test(path)) data = { id: 'demo-source', label: 'DEMO — source sample', description: 'Fictional de-identified source', biologicalContext: 'Synthetic reference sample', assayContext: 'PSeq demonstration', analysisSummary: 'Illustration only', qcStatus: 'Reviewed example', provenance: 'Fictional training fixture', ownershipBasis: 'Synthetic content', ownershipEvidenceReference: null, deidentificationMethod: 'No personal information', deidentificationNotes: null, status: 'Draft', files: [], version: 1, createdAt: stamp, updatedAt: stamp }
    else if (path === '/curated-data') data = []
    else if (/^\/curated-data\//.test(path)) data = { items: [], page: 1, pageSize: 25, totalCount: 0 }
    else if (/\/sample-shipping\/configuration$/.test(path)) data = { sampleTypes: [], destinations: [], procedures: [], containerSizes: [], defaultDestinationVersion: 0 }
    else if (/\/sample-shipping\/container-types$/.test(path) || /\/shipping-container-definitions$/.test(path)) data = []
    else if (/\/lab-service-offerings$/.test(path) || /\/sample-types$/.test(path)) data = []
    else if (path === '/platform/lab-service-orders/customer-options') data = [{ id: 'demo-customer', name: company.name }]
    else if (path === '/platform/lab-service-orders/pricing-catalog') data = [{ id: 'demo-service', name: 'DEMO — PSeq Lab Service', isActive: true, isPSeqLabService: true, salesUnit: 'Specimen' }]
    else if (path === '/platform/lab-operations') data = { protocols: [{ id: 'demo-protocol', name: 'DEMO — sample preparation', protocolType: 'SamplePreparation', latestVersion: 0, version: 1, versions: [] }], equipment: [], reagents: [], masterMixes: [], suppliers: [], productTypes: [] }
    else { throw new Error(`Unregistered fictional request: ${config.method} ${path}`) }
    return { config, status: 200, statusText: 'OK', headers: {}, data: raw ? structuredClone(data) : { success: true, data: structuredClone(data), error: null } }
  }
}
