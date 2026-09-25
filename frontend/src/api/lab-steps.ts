import { api } from './client'
export type LabStepVersion = { id: string; stepVersion: number; status: string; definitionJson: string; authoredByUserId: string; authoredAtUtc: string; approvedByUserId: string | null; approvedAtUtc: string | null; approvalOverrideReason: string | null }
export type LabStep = { id: string; key: string; name: string; description: string | null; latestVersion: number; version: number; retiredAtUtc: string | null; retirementReason: string | null; versions: LabStepVersion[]; usedBy: { protocolId: string; protocolName: string; protocolVersionId: string; protocolVersion: number; status: string; occurrenceKey: string; stepVersionId: string }[] }
type Envelope<T> = { data: T }
const base = '/platform/lab-operations/steps'
export const getLabSteps = async () => (await api.get<Envelope<LabStep[]>>(base)).data.data
export const createLabStep = async (input: { name: string; description?: string }) => (await api.post<Envelope<LabStep>>(base, input)).data.data
export const updateLabStep = async (id: string, input: { name: string; description?: string; version: number }) => (await api.put<Envelope<LabStep>>(`${base}/${id}`, input)).data.data
export const saveLabStepVersion = async (id: string, input: { definitionJson: string; version: number; draftId?: string }) => (await api.post<Envelope<LabStep>>(`${base}/${id}/versions`, input)).data.data
export const transitionLabStep = async (id: string, input: { action: string; version: number; versionId?: string; reason?: string; approvalOverrideReason?: string }) => (await api.post<Envelope<LabStep>>(`${base}/${id}/transition`, input)).data.data
