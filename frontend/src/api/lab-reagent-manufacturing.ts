import { api } from './client'

type Envelope<T> = { data: T }
const base = '/platform/lab-operations'
const get = async <T>(path: string) => (await api.get<Envelope<T>>(`${base}${path}`)).data.data
const post = async <T>(path: string, input: unknown) => (await api.post<Envelope<T>>(`${base}${path}`, input)).data.data
const put = async <T>(path: string, input: unknown) => (await api.put<Envelope<T>>(`${base}${path}`, input)).data.data

export type ReagentWorkflowStep = { key: string; name: string; instructions: string }
export type ReagentWorkflow = {
  id: string; name: string; materialDefinitionId: string; materialName: string; outputUnit: string | null
  steps: ReagentWorkflowStep[]; revision: number; status: 'Draft' | 'Approved' | 'Retired'
  authoredByUserId: string; approvedByUserId: string | null; approvedAtUtc: string | null
  approvalOverrideReason: string | null; version: number
}
export type ReagentRunStep = { sequence: number; stepKey: string; name: string; instructions: string; notes: string; performedByUserId: string; performedAtUtc: string }
export type ReagentMaterialUse = { id: string; sourceMaterialLotId: string; sourceName: string; sourceLotNumber: string; quantity: number; quantityUnit: string; materialExhausted: boolean; recordedByUserId: string; recordedAtUtc: string }
export type ReagentRun = {
  id: string; workflowId: string; workflowRevision: number; workflowName: string
  materialLotId: string; materialName: string; lotNumber: string
  storageLocationId: string; storageLocation: string; quantityUnit: string
  availableQuantity: number; qcDisposition: string; status: 'InProgress' | 'Completed' | 'Abandoned'
  steps: ReagentWorkflowStep[]; recordedSteps: ReagentRunStep[]; materialUses: ReagentMaterialUse[]
  startedByUserId: string; startedAtUtc: string; finishedByUserId: string | null
  finishedAtUtc: string | null; abandonmentReason: string | null; version: number
}
export type SaveReagentWorkflow = {
  name: string; materialDefinitionId: string | null; newMaterialName: string | null
  steps: ReagentWorkflowStep[]; version?: number; outputUnit: string
}

export const reagentWorkflowsKey = ['lab-reagent-workflows'] as const
export const reagentRunsKey = ['lab-reagent-runs'] as const
export const listReagentWorkflows = () => get<ReagentWorkflow[]>('/reagent-workflows')
export const createReagentWorkflow = (input: SaveReagentWorkflow) => post<ReagentWorkflow>('/reagent-workflows', input)
export const reviseReagentWorkflow = (id: string, input: SaveReagentWorkflow) => put<ReagentWorkflow>(`/reagent-workflows/${id}`, input)
export const approveReagentWorkflow = (workflow: ReagentWorkflow, approvalOverrideReason?: string) =>
  post<ReagentWorkflow>(`/reagent-workflows/${workflow.id}/approve`, { version: workflow.version, approvalOverrideReason })
export const retireReagentWorkflow = (workflow: ReagentWorkflow) =>
  post<ReagentWorkflow>(`/reagent-workflows/${workflow.id}/retire`, { version: workflow.version })
export const listReagentRuns = () => get<ReagentRun[]>('/reagent-runs')
export const getReagentRun = (id: string) => get<ReagentRun>(`/reagent-runs/${id}`)
export const startReagentRun = (input: { materialDefinitionId: string; storageLocationId: string }) =>
  post<ReagentRun>('/reagent-runs', input)
export const recordReagentStep = (run: ReagentRun, input: { sequence: number; notes: string }) =>
  post<ReagentRun>(`/reagent-runs/${run.id}/steps`, { ...input, version: run.version })
export const recordReagentUse = (run: ReagentRun, input: { sourceMaterialLotId: string; quantity: number; quantityUnit: string; materialExhausted: boolean }) =>
  post<ReagentRun>(`/reagent-runs/${run.id}/materials`, { ...input, version: run.version })
export const completeReagentRun = (run: ReagentRun, input: { producedQuantity: number; expirationOrRetestDate: string | null }) =>
  post<ReagentRun>(`/reagent-runs/${run.id}/complete`, { ...input, version: run.version })
export const abandonReagentRun = (run: ReagentRun, reason: string) =>
  post<ReagentRun>(`/reagent-runs/${run.id}/abandon`, { reason, version: run.version })
