import { api } from './client'

export type PhaseSample = { id: string; phaseId: string | null; name: string; stage: string; canRephase: boolean; held: boolean; failed: boolean }
export type LabPhase = {
  scope?: { sources: Array<{ biologicalSource: string; specimenCount: number }>; runsPerSample: number | null; sequencingRunCount: number } | null; proposedUnitPrice?: number | null; proposedAdditionalRunPrice?: number | null; priceProposalNote?: string | null;
  id: string; position: number; name: string; sampleCount: number; turnaroundBusinessDays: number | null
  acceptedSubtotal: number; carriedInvoicedSubtotal: number; invoicedSubtotal: number; lifecycle: string
  mixedProgress: boolean; stageCounts: Record<string, number>; heldSamples: number; failedSamples: number
  containerCount: number; sentContainers: number; arrivedContainers: number; expectedTubes: number; receivedTubes: number; accessionedTubes: number
  deliveredSamples: number; firstReceiptAtUtc: string | null; completeReceiptAtUtc: string | null
  originalDueAtUtc: string | null; dueAtUtc: string | null; startedAtUtc: string | null; firstDeliveredAtUtc: string | null
  calendarPending: boolean; cancellationEligible: boolean; cancellationPending: boolean; sampleIds: string[]; priceLinesJson: string
}
export type PhaseProposal = { id: string; beforeJson: string; afterJson: string; reason: string; status: string; proposedAtUtc: string; decidedAtUtc: string | null; decisionReason: string | null; version: number }
export type PhaseCancellation = { id: string; phaseId: string; reason: string; status: string; decisionReason: string | null; requestedAtUtc: string; version: number }
export type LabPhasePlan = { orderId: string; revision: number; sampleCount: number; acceptedSubtotal: number; currency: string; phases: LabPhase[]; samples: PhaseSample[]; proposals: PhaseProposal[]; cancellations: PhaseCancellation[] }
export type PhasePlanItem = { id: string | null; name: string; sampleCount: number; turnaroundBusinessDays: number; acceptedSubtotal: number; carriedInvoicedSubtotal: number; sampleIds: string[] }
export type PhaseBillingPlan = Pick<LabPhasePlan, 'orderId' | 'revision' | 'currency'> & { phases: Pick<LabPhase, 'id' | 'name' | 'lifecycle' | 'acceptedSubtotal' | 'invoicedSubtotal'>[] }
export type PhaseBillingJob = { id: string; orderNumber: string; jobName: string; organizationName: string }
type Envelope<T> = { success: boolean; data: T; error: { message: string } | null }
function unwrap<T>(value: Envelope<T>) { if (!value.success) throw new Error(value.error?.message ?? 'The phase operation failed.'); return value.data }
function root(orderId: string, internal: boolean) { return `${internal ? '/platform' : ''}/lab-service-orders/${orderId}/phases` }
export async function getLabPhasePlan(orderId: string, internal: boolean) { return unwrap((await api.get<Envelope<LabPhasePlan>>(root(orderId, internal))).data) }
export async function getPhaseBillingJobs(search: string, organizationId: string, page: number) {
  return unwrap((await api.get<Envelope<{ items: PhaseBillingJob[]; hasMore: boolean }>>('/platform/accounts-receivable/phase-jobs', { params: { search, organizationId: organizationId || undefined, page } })).data)
}
export async function getPhaseBillingPlan(orderId: string) { return unwrap((await api.get<Envelope<PhaseBillingPlan>>(`/platform/accounts-receivable/phase-jobs/${orderId}/phases`)).data) }
export async function writeLabPhases(orderId: string, internal: boolean, path: string, input: unknown, key: string) {
  return unwrap((await api.post<Envelope<LabPhasePlan>>(`${root(orderId, internal)}/${path}`, input, { headers: { 'Idempotency-Key': key } })).data)
}
