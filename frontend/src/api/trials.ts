import { api } from './client'

export type TrialChoice = { id: string; name: string; version: number }
export type TrialDeliverable = { id: string; revision: number; key: string; name: string }
export type TrialAnalysis = { id: string; version: number; name: string; instructions: string; requiredInputsJson: string; resultContractJson: string }
export type TrialScopeValues = {
  name: string; objective: string; sampleAllowance: number; submissionOpensAtUtc: string; submissionClosesAtUtc: string
  workflowVersionId: string; analyses: TrialAnalysis[]; deliverables: TrialDeliverable[]; submissionInstructions: string
  successCriteria: string; estimatedRetailValue: number; anticipatedInternalCost: number; residualRetentionDays: number
  materialDisposition: 'Destroy' | 'Return'; returnDestination: string | null; returnHandling: string | null; returnShippingPayer: string | null; terms: string
}
export type TrialScope = Omit<TrialScopeValues, 'workflowVersionId' | 'estimatedRetailValue' | 'anticipatedInternalCost'> & {
  revision: number; internalValues: TrialScopeValues | null; termsVersion: string; ruoStatement: string
  decisions: { domain: string; decision: string; reason: string | null; actorUserId: string | null; asDelegate: boolean | null; atUtc: string }[]
}
export type TrialRow = { salesOwnerUserId?: string; salesOwnerName?: string; requestedAtUtc?: string; dueAtUtc?: string; id: string; number: string; name: string; companyName: string; status: string; isOnHold: boolean; sampleCount: number; sampleAllowance: number | null; submissionClosesAtUtc: string | null; updatedAtUtc: string; version: number }
export type TrialRelease = { id: string; releaseVersion: number; scopeRevision: number; isCompletePackage: boolean; isWithdrawn: boolean; releasedAtUtc: string; retentionSnapshotId: string | null; files: { id: string; fileName: string; fileKind: string; sizeBytes: number; sha256: string }[] }
export type TrialDetail = {
  crmPendingMilestones?: number; canRecordCommercialOutcome?: boolean; canDeactivateProspect?: boolean; canReleaseResults?: boolean; id: string; number: string; companyName: string; companyId: string; opportunityId: string; organizationId: string | null; departmentId: string | null
  status: string; version: number; isStaff: boolean; canManage: boolean; canAccept: boolean; canSubmit: boolean; submissionBlocker: string | null
  approvalDomains: string[]; originalSamplesRemaining: number; isOnHold: boolean; holdReason: string | null; scheduleEstimate: string | null
  closureReason: string | null; closedAtUtc: string | null; residualRetainUntilUtc: string | null; actualMaterialDisposition: string | null
  commercialOutcome: string | null; commercialOutcomeReason: string | null; followUpOwnerUserId: string | null; followUpAtUtc: string | null
  approvedScopeRevision: number | null; acceptedScopeRevision: number | null; scope: TrialScope | null; scopeHistory: TrialScope[]
  samples: { id: string; reference: string; biologicalSource: string; tubeCount: number; status: string; labMilestone: string | null; customerSafeSummary: string | null; labWorkOrderId: string | null; replacesSampleId: string | null; outcomeReason: string | null; submittedAtUtc: string }[]
  replacements: { id: string; originalSampleId: string; phaenoCausedFailure: boolean; reason: string; usedBySampleId: string | null }[]
  releases: TrialRelease[]; timeline: { kind: string; summary: string; atUtc: string }[]
}
export type TrialConfiguration = {
  canManageConfiguration: boolean; canAssignPrimary: boolean; primaryDomains: string[]
  handoffs: { id: string; companyName: string; opportunityName: string; summary: string }[]
  analyses: TrialChoice[]; workflows: TrialChoice[]; deliverables: TrialDeliverable[]; defaultDeliverableIds: string[]
  departments: TrialChoice[]; destinations: TrialChoice[]; sampleTypes: TrialChoice[]; staff: TrialChoice[]
  authorities: { id: string; userId: string; userName: string; domain: string; isPrimary: boolean; primaryAuthorityId: string | null; designatedByUserId?: string; effectiveAtUtc?: string; reason?: string; revocationReason?: string; revokedAtUtc: string | null; version: number }[]
}
export type TrialOutputPackage = { id: string; trialSampleId: string; packageVersion: number; state: string; scientificApprovalId: string | null; artifacts: { id: string; logicalRole: string; fileName: string; scanState: string }[] }
type Envelope<T> = { data: T }
export const listTrials = async (search: string, status?: string, ownerId?: string) => (await api.get<Envelope<TrialRow[]>>('/trials', { params: { search, status: status || undefined, ownerId: ownerId || undefined } })).data.data
export const getTrial = async (id: string) => (await api.get<Envelope<TrialDetail>>(`/trials/${id}`)).data.data
export const getTrialConfiguration = async (companyId?: string) => (await api.get<Envelope<TrialConfiguration>>('/trials/configuration', { params: { companyId } })).data.data
export const getTrialOutputPackages = async (id: string) => (await api.get<Envelope<TrialOutputPackage[]>>(`/trials/${id}/results/candidates`)).data.data
export const changeTrial = async <T = TrialDetail>(path: string, payload: unknown, key: string) =>
  (await api.post<Envelope<T>>(`/trials${path}`, payload, { headers: { 'Idempotency-Key': key } })).data.data
export async function downloadTrial(path: string, fallbackName: string) {
  const result = await api.get<Blob>(`/trials${path}`, { responseType: 'blob' })
  const link = document.createElement('a'); const url = URL.createObjectURL(result.data)
  link.href = url; link.download = fallbackName; document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
