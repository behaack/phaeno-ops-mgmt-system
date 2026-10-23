import { api } from './client'
import axios from 'axios'
import { requireRecordPage } from './record-page'

export function assemblyAttemptFromDispatchError(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null
  const envelope = error.response?.data as { error?: { code?: string; details?: unknown } } | undefined
  if (!['assembly_dispatch_failed', 'assembly_dispatch_unconfirmed'].includes(envelope?.error?.code ?? '')) return null
  const details = envelope?.error?.details
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null
  const id = (details as Record<string, unknown>).assemblyJobId
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null
}

export type AssemblyRecipe = { key: string; name: string; version: string; parametersJson: string; simulated: boolean }
export type AssemblyAvailability = { available: boolean; message: string; supportsCancellation: boolean; recipes: AssemblyRecipe[] }
export type AssemblyProgress = { percentage: number; receivedAtUtc: string; sequence: number | null }
export type AssemblyJob = {
  id: string; labWorkOrderId: string; labSpecimenId: string; sampleName: string; sequencingRunNumber: number
  state: string; requestedAtUtc: string; startedAtUtc: string | null; stoppedAtUtc: string | null; dispositionAtUtc: string | null
  durationSeconds: number | null; isTerminal: boolean; cancellationRequested: boolean; dispositionReason: string | null
  attentionReason: string | null; previousJobId: string | null; retryReason: string | null; labAnalysisRunId: string | null
  outputsDeclared: boolean; providerKey: string; providerJobId: string | null; requestedByUserId: string; version: number; progress: AssemblyProgress | null; simulated: boolean
}
export type AssemblyInputChoice = { libraryKey?: string; fileName?: string | null; id: string; labWorkOrderId: string; labSpecimenId: string; sampleName: string | null; sequencingRunNumber: number; labSpecimenAttemptId: string; providerRunReference: string; sampleMappingReference: string; sizeBytes: number; sha256: string }
export type AssemblyQueue = { availability: AssemblyAvailability; canOperate: boolean; jobs: AssemblyJob[] }
export type AssemblyDetail = {
  canReconcile: boolean
  reconciliation: AssemblyReconciliationReview
  simulatedOutputs: { artifactId: string; role: string; fileName: string; sizeBytes: number }[]
  delivery: { kind: string; attemptCount: number; lastAttemptAtUtc: string | null; nextAttemptAtUtc: string | null;
    receivedAtUtc: string | null; confirmedAtUtc: string | null; escalatedAtUtc: string | null; suppressed: boolean }[]
  job: AssemblyJob; availability: AssemblyAvailability; canOperate: boolean; recipe: AssemblyRecipe
  inputs: { sequencingOutputId: string; externalFileReference: string; sha256: string; sizeBytes: number }[]
  events: { id: string; kind: string; recordedAtUtc: string; actorUserId: string | null; evidenceJson: string }[]
  analyses: { id: string; runReference: string; recordedAtUtc: string }[]
}
export type StartAssembly = { id: string; labSpecimenId: string; sequencingRunNumber: number; recipeKey: string; sequencingOutputIds: string[]; previousJobId?: string; reason?: string }
export type AssemblyReceiptReview = {
  id: string; eventId: string; sequence: number; outcome: string; payloadSha256: string; conflictSha256: string | null
  occurredAtUtc: string; receivedAtUtc: string; state: string | null; providerJobId: string | null
  startedAtUtc: string | null; stoppedAtUtc: string | null; dispositionAtUtc: string | null; reason: string | null
}
export type AssemblyReconciliationReview = {
  hasUnresolvedConflict: boolean; eligible: boolean; ineligibleReason: string | null; evidenceFingerprint: string
  receipts: AssemblyReceiptReview[]
  additionalEvidence: { id: string; recordedAtUtc: string; eventId: string; payloadSha256: string; state: string | null;
    startedAtUtc: string | null; stoppedAtUtc: string | null; reason: string | null }[]
  decisions: { id: string; recordedAtUtc: string; actorUserId: string | null; decision: {
    reason: string; verificationEvidence: string; confirmedStopped: boolean; evidenceFingerprint: string
    savedExecution: { state: string; providerJobId: string | null; startedAtUtc: string | null; stoppedAtUtc: string | null;
      dispositionAtUtc: string | null; dispositionReason: string | null }
    providerObservation: { status: string; execution: { state: string } | null }; providerObservedAtUtc: string
  } }[]
}
export type ReconcileAssembly = { id: string; version: number; evidenceFingerprint: string; reason: string;
  verificationEvidence: string; confirmedStopped: boolean }
const root = '/platform/lab-operations'
async function get<T>(path: string, params?: object) { return (await api.get<{ data: T }>(root + path, { params })).data.data }
async function post<T>(path: string, body: object) { return (await api.post<{ data: T }>(root + path, body)).data.data }
export const getAssemblyJobs = (workOrderId?: string, specimenId?: string) => get<AssemblyQueue>('/assembly-jobs', { workOrderId, specimenId })
export async function getAssemblyJobsPage(search: string, page: number) {
  const data = await get<AssemblyQueue & { page: number; pageSize: number; totalCount: number }>('/assembly-jobs/page', { search,page })
  const checked = requireRecordPage({ items: data.jobs,page: data.page,pageSize: data.pageSize,totalCount: data.totalCount })
  return { ...data, jobs: checked.items }
}
export const getAssemblyJob = (id: string) => get<AssemblyDetail>(`/assembly-jobs/${id}`)
export const getAssemblyInputs = (workOrderId?: string, specimenId?: string) => get<AssemblyInputChoice[]>('/assembly-jobs/inputs', { workOrderId, specimenId })
export const startAssembly = (workId: string, body: StartAssembly) => post<AssemblyJob>(`/work-orders/${workId}/assembly-jobs`, body)
export const cancelAssembly = (job: AssemblyJob, reason: string) => post<AssemblyJob>(`/work-orders/${job.labWorkOrderId}/assembly-jobs/${job.id}/cancel`, { version: job.version, reason })
export const linkAssemblyAnalysis = (job: AssemblyJob, analysisRunId: string) => post<AssemblyJob>(`/work-orders/${job.labWorkOrderId}/assembly-jobs/${job.id}/analysis`, { version: job.version, analysisRunId })
export const reconcileAssembly = (job: AssemblyJob, body: ReconcileAssembly) => post<AssemblyJob>(`/work-orders/${job.labWorkOrderId}/assembly-jobs/${job.id}/reconcile`, body)
export async function downloadSimulatedAssemblyOutput(jobId: string, artifactId: string, fileName: string) {
  const response = await api.get<Blob>(`${root}/assembly-jobs/${jobId}/simulated-outputs/${artifactId}`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = `SIMULATED-${fileName}`
    link.click()
  } finally { URL.revokeObjectURL(url) }
}
