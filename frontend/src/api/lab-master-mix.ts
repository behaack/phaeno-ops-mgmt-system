import { api } from './client'

type Envelope<T> = { data: T }
const base = '/platform/lab-operations'
const get = async <T>(path: string) => (await api.get<Envelope<T>>(`${base}${path}`)).data.data
const post = async <T>(path: string, input: unknown) => (await api.post<Envelope<T>>(`${base}${path}`, input)).data.data
const put = async <T>(path: string, input: unknown) => (await api.put<Envelope<T>>(`${base}${path}`, input)).data.data

export type MasterMixStep = { key: string; name: string; instructions: string }
export type MasterMixRecipeIngredient = { materialDefinitionId: string; name: string; quantity: number; quantityText?: string | null; quantityUnit: string }
export type MasterMixWorkflowRevision = { revision: number; name: string; quantityUnit: string; steps: MasterMixStep[]; ingredients: MasterMixRecipeIngredient[]; status: string; authoredByUserId: string; approvedByUserId: string | null; approvedAtUtc: string | null; approvalOverrideReason: string | null }
export type MasterMixWorkflow = { id: string; name: string; quantityUnit: string; steps: MasterMixStep[]; ingredients: MasterMixRecipeIngredient[]; revision: number; status: 'Draft' | 'Approved' | 'Retired'; authoredByUserId: string; approvedByUserId: string | null; approvedAtUtc: string | null; approvalOverrideReason: string | null; version: number; revisions: MasterMixWorkflowRevision[] }
export type MasterMixSummary = { id: string; barcode: string; workflowId: string; workflowRevision: number; workflowName: string; quantityUnit: string; status: 'Preparing' | 'Ready' | 'Discarded'; version: number; remainingQuantity: number | null; remainingQuantityText: string | null; startedAtUtc: string; useByUtc: string }
export type MasterMixPage = { items: MasterMixSummary[]; page: number; pageSize: number; total: number }
export type MasterMixCorrection = { id: string; targetEntryId: string; targetKind: 'Ingredient' | 'TrayUse'; action: 'VerifiedVoid' | 'Discrepancy'; reason: string; recordedByUserId: string; recordedAtUtc: string }
export type MasterMix = MasterMixSummary & { preparedQuantity: number | null; preparedQuantityText: string | null; usedQuantity: number; usedQuantityText: string; measuredDiscardQuantityText: string | null; startedByUserId: string; preparedByUserId: string | null; preparedAtUtc: string | null; discardedByUserId: string | null; discardedAtUtc: string | null; measuredDiscardQuantity: number | null; discardReason: string | null; recipeDeviationReason: string | null; recipeDeviationApprovedByUserId: string | null; recipeDeviationApprovedAtUtc: string | null; recipeDeviationApprovalCurrent: boolean; recipeMatches: boolean; steps: MasterMixStep[]; recipeIngredients: MasterMixRecipeIngredient[]; recordedSteps: { id: string; sequence: number; notes: string; performedByUserId: string; performedAtUtc: string }[]; ingredients: { id: string; sourceMaterialLotId: string; sourceName: string; sourceLotNumber: string; quantity: number; quantityText: string; quantityUnit: string; materialExhausted: boolean; recordedByUserId: string; recordedAtUtc: string; voidedByUserId: string | null; voidedAtUtc: string | null }[]; trayUses: { id: string; labPreparationBatchId: string; trayName: string; labPreparationRecordId: string; fieldKey: string; quantity: number; quantityText: string; quantityUnit: string; recordedByUserId: string; recordedAtUtc: string; voidedByUserId: string | null; voidedAtUtc: string | null }[]; corrections: MasterMixCorrection[]; actors: { id: string; name: string }[] }

export const masterMixWorkflowsKey = ['lab-master-mix-workflows'] as const
export const masterMixesKey = ['lab-master-mixes'] as const
export const listMasterMixWorkflows = () => get<MasterMixWorkflow[]>('/master-mix-workflows')
export const createMasterMixWorkflow = (input: { name: string; quantityUnit: string; steps: MasterMixStep[]; ingredients?: MasterMixRecipeIngredient[] }) => post<MasterMixWorkflow>('/master-mix-workflows', input)
export const reviseMasterMixWorkflow = (item: MasterMixWorkflow, input: { name: string; quantityUnit: string; steps: MasterMixStep[]; ingredients?: MasterMixRecipeIngredient[] }) => put<MasterMixWorkflow>(`/master-mix-workflows/${item.id}`, { ...input, version: item.version })
export const approveMasterMixWorkflow = (item: MasterMixWorkflow, approvalOverrideReason?: string) => post<MasterMixWorkflow>(`/master-mix-workflows/${item.id}/approve`, { version: item.version, approvalOverrideReason })
export const retireMasterMixWorkflow = (item: MasterMixWorkflow) => post<MasterMixWorkflow>(`/master-mix-workflows/${item.id}/retire`, { version: item.version })
export const searchMasterMixes = (search = '', status = '', page = 1) => get<MasterMixPage>(`/master-mixes?${new URLSearchParams({ search, status, page: String(page) })}`)
export const listReadyMasterMixes = () => get<MasterMixSummary[]>('/master-mixes/ready')
export const listMasterMixes = listReadyMasterMixes
export const getMasterMix = (id: string) => get<MasterMix>(`/master-mixes/${id}`)
export const startMasterMix = (workflowId: string, workflowRevision: number, requestId: string) => post<MasterMix>('/master-mixes', { workflowId, workflowRevision, requestId })
export const recordMasterMixStep = (item: MasterMix, sequence: number, notes: string, requestId: string) => post<MasterMix>(`/master-mixes/${item.id}/steps`, { sequence, notes, requestId, version: item.version })
export const recordMasterMixIngredient = (item: MasterMix, input: { sourceMaterialLotId: string; quantityUnit: string; materialExhausted: boolean } & ({ quantityText: string } | { quantity: number }), requestId: string) => post<MasterMix>(`/master-mixes/${item.id}/ingredients`, { ...input, quantity: 'quantityText' in input ? 0 : input.quantity, requestId, version: item.version })
export const completeMasterMix = (item: MasterMix, amount: string | number) => post<MasterMix>(`/master-mixes/${item.id}/complete`, { preparedQuantity: typeof amount === 'number' ? amount : 0, preparedQuantityText: typeof amount === 'string' ? amount : null, version: item.version })
export const approveMasterMixDeviation = (item: MasterMix, reason: string) => post<MasterMix>(`/master-mixes/${item.id}/approve-deviation`, { reason, version: item.version })
export const discardMasterMix = (item: MasterMix, reason: string, amount: string | number | null) => post<MasterMix>(`/master-mixes/${item.id}/discard`, { reason, measuredDiscardQuantity: typeof amount === 'number' ? amount : null, measuredDiscardQuantityText: typeof amount === 'string' ? amount : null, version: item.version })
export const recordMasterMixCorrection = (item: MasterMix, input: { requestId: string; targetEntryId: string; targetKind: 'Ingredient' | 'TrayUse'; action: 'VerifiedVoid' | 'Discrepancy'; reason: string; confirmedNoPhysicalUse: boolean }) => post<MasterMix>(`/master-mixes/${item.id}/corrections`, { ...input, version: item.version })
