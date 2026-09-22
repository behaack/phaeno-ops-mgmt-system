import { api } from './client'

export type AssemblyRecipe = { key: string; name: string; version: string; parametersJson: string }
export type AssemblyAvailability = { available: boolean; message: string; supportsCancellation: boolean; recipes: AssemblyRecipe[] }
export type AssemblyProgress = { percentage: number; receivedAtUtc: string; sequence: number | null }
export type AssemblyJob = {
  id: string; labWorkOrderId: string; labSpecimenId: string; sampleName: string; sequencingRunNumber: number
  state: string; requestedAtUtc: string; startedAtUtc: string | null; stoppedAtUtc: string | null; dispositionAtUtc: string | null
  durationSeconds: number | null; isTerminal: boolean; cancellationRequested: boolean; dispositionReason: string | null
  attentionReason: string | null; previousJobId: string | null; retryReason: string | null; labAnalysisRunId: string | null
  outputsDeclared: boolean; providerKey: string; providerJobId: string | null; requestedByUserId: string; version: number; progress: AssemblyProgress | null
}
export type AssemblyInputChoice = { id: string; labWorkOrderId: string; labSpecimenId: string; sampleName: string | null; sequencingRunNumber: number; labSpecimenAttemptId: string; providerRunReference: string; sampleMappingReference: string; sizeBytes: number; sha256: string }
export type AssemblyQueue = { availability: AssemblyAvailability; canOperate: boolean; jobs: AssemblyJob[] }
export type AssemblyDetail = {
  job: AssemblyJob; availability: AssemblyAvailability; canOperate: boolean; recipe: AssemblyRecipe
  inputs: { sequencingOutputId: string; externalFileReference: string; sha256: string; sizeBytes: number }[]
  events: { id: string; kind: string; recordedAtUtc: string; actorUserId: string | null; evidenceJson: string }[]
  analyses: { id: string; runReference: string; recordedAtUtc: string }[]
}
export type StartAssembly = { id: string; labSpecimenId: string; sequencingRunNumber: number; recipeKey: string; sequencingOutputIds: string[]; previousJobId?: string; reason?: string }
const root = '/platform/lab-operations'
async function get<T>(path: string, params?: object) { return (await api.get<{ data: T }>(root + path, { params })).data.data }
async function post<T>(path: string, body: object) { return (await api.post<{ data: T }>(root + path, body)).data.data }
export const getAssemblyJobs = (workOrderId?: string, specimenId?: string) => get<AssemblyQueue>('/assembly-jobs', { workOrderId, specimenId })
export const getAssemblyJob = (id: string) => get<AssemblyDetail>(`/assembly-jobs/${id}`)
export const getAssemblyInputs = (workOrderId?: string, specimenId?: string) => get<AssemblyInputChoice[]>('/assembly-jobs/inputs', { workOrderId, specimenId })
export const startAssembly = (workId: string, body: StartAssembly) => post<AssemblyJob>(`/work-orders/${workId}/assembly-jobs`, body)
export const cancelAssembly = (job: AssemblyJob, reason: string) => post<AssemblyJob>(`/work-orders/${job.labWorkOrderId}/assembly-jobs/${job.id}/cancel`, { version: job.version, reason })
export const linkAssemblyAnalysis = (job: AssemblyJob, analysisRunId: string) => post<AssemblyJob>(`/work-orders/${job.labWorkOrderId}/assembly-jobs/${job.id}/analysis`, { version: job.version, analysisRunId })
