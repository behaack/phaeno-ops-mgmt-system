import { api } from './client'

export type Performer = { id: string; name: string; isActive: boolean }
export type PerformanceProposal = { id: string; labProtocolExecutionId: string; stepRecordId: string; basedOnProposalId: string | null; requestedByUserId: string; requestedAtUtc: string; kind: string; reason: string; performanceJson: string; originalPerformanceJson: string }
export type PerformanceDecision = { id: string; reviewedByUserId: string; reviewedAtUtc: string; approved: boolean; reason: string }
export type PerformanceReviews = { canPropose: boolean; canReview: boolean; actorId: string; proposals: PerformanceProposal[]; decisions: PerformanceDecision[] }
export type PerformanceProposalInput = { requestId: string; executionId: string; stepRecordId: string; performedByUserId: string; performedAt: string; reason: string; basedOnProposalId: string | null }
const path = (work: string, specimen: string) => `/platform/lab-operations/work-orders/${work}/specimens/${specimen}/performance-reviews`
export const getPerformancePerformers = async () => (await api.get<{ data: Performer[] }>('/platform/lab-operations/performance-performers')).data.data
export const getPerformanceReviews = async (work: string, specimen: string) => (await api.get<{ data: PerformanceReviews }>(path(work, specimen))).data.data
export const proposePerformance = async (work: string, specimen: string, input: PerformanceProposalInput) => (await api.post(`${path(work, specimen)}`, input)).data
export const decidePerformance = async (work: string, specimen: string, proposal: string, approved: boolean, reason: string) => (await api.post(`${path(work, specimen)}/${proposal}/decision`, { approved, reason })).data
