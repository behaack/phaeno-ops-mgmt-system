import { api } from './client'
import type { CompletionForecast } from './lab-forecasts'
import type { DeadlineStatus, JobStatus, JobView } from '#/features/lab-operations/job-deadlines'

export type LabJob = {
  id: string; name: string; customerReference: string | null; organizationName: string; operationalStatus: string
  freezerBoxBarcodes: string[]
  sampleCount: number; deliveredSampleCount: number; dueAtUtc: string | null; originalDueAtUtc: string | null
  expectedCompletionAtUtc: string | null; forecastAdjusted: boolean; dueDateAdjusted: boolean
  nextSampleDueAtUtc: string | null; firstDeliveredAtUtc: string | null; completedAtUtc: string | null
  isComplete: boolean; hasAcceptedSamples: boolean; isBlocked: boolean; completionDeadlineAtUtc: string | null
  orderCreatedAtUtc: string; turnaroundDays: number | null; turnaroundPolicyKey: string; serviceVersion: number; version: number
}
export type JobQueueItem = { forecast?: CompletionForecast | null; job: LabJob; deadlineStatus: DeadlineStatus; jobStatus: JobStatus | 'Delivered' | 'Cancelled' | 'Mixed'; reason: string; phaseId?: string | null; phaseName?: string | null; lifecycle?: string; stageCounts: Record<string, number>; heldSamples: number; failedSamples: number; containerCount: number; sentContainers: number; arrivedContainers: number; expectedTubes: number; receivedTubes: number; accessionedTubes: number }
export type JobQueue = { items: JobQueueItem[]; totalCount: number; page: number; pageSize: number; counts: Partial<Record<DeadlineStatus, number>>; evaluatedAtUtc: string }
export type JobDeadline = { phases?: JobQueueItem[]; summary: JobQueueItem; changes: { id: string; previousDueAtUtc: string | null; dueAtUtc: string; reason: string; actorUserId: string; actorName: string; occurredAtUtc: string; phaseId?: string | null }[] }
type Envelope<T> = { success: boolean; data: T; error: { message: string } | null }
function unwrap<T>(value: Envelope<T>) { if (!value.success) throw new Error(value.error?.message ?? 'Unable to load jobs.'); return value.data }
export async function getLabJobs(params: { grouping?: 'Phases' | 'Jobs'; search?: string; deadlineStatus?: string; view: JobView; jobStatus?: JobStatus; outcome?: string; fromUtc?: string; toExclusiveUtc?: string; page?: number }) {
  const result = unwrap((await api.get<Envelope<JobQueue>>('/platform/lab-operations/jobs', { params })).data)
  if (result.items.some(item => !item.jobStatus || !item.job.orderCreatedAtUtc || !Array.isArray(item.job.freezerBoxBarcodes))) {
    throw new Error('The updated Jobs list is not available yet. Please refresh after the service update is complete.')
  }
  return result
}
export async function getJobDeadline(id: string) {
  return unwrap((await api.get<Envelope<JobDeadline>>(`/platform/lab-operations/work-orders/${id}/deadline`)).data)
}
export async function adjustJobDeadline(id: string, input: { version: number; dueAtUtc: string; reason: string; phaseId?: string }) {
  return unwrap((await api.post<Envelope<JobDeadline>>(`/platform/lab-operations/work-orders/${id}/deadline`, input)).data)
}
