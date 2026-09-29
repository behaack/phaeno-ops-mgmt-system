import { api } from './client'

type Envelope<T> = { success: boolean; data: T; error: { message: string } | null }
function read<T>(response: Envelope<T>): T { if (!response.success) throw new Error(response.error?.message ?? 'The kit assembly request failed.'); return response.data }
const path = '/platform/lab-operations/kit-assembly'

export type KitAssemblyStep = { labStepVersionId: string; name: string; instructions: string }
export type KitAssemblyComponent = { supplierProductId: string; quantity: number; kind: 'Tube' | 'ShippingContainer' | 'Other'; supplierName: string; productNumber: string; productDescription: string }
export type KitAssemblyComponentUse = { supplierProductId: string; quantity: number; sourceMaterialLotId: string | null }
export type KitAssemblyRevision = { id: string; revision: number; status: 'Draft' | 'Approved' | 'Retired' | 'Discarded'; steps: KitAssemblyStep[]; authoredByUserId: string; authoredAtUtc: string; approvedByUserId: string | null; approvedAtUtc: string | null }
export type KitAssemblyWorkflow = { id: string; name: string; version: number; revisions: KitAssemblyRevision[] }
export type KitAssemblyRun = { id: string; stockKitId: string; kitNumber: string; status: 'InProgress' | 'Completed' | 'Abandoned'; version: number; workflowRevisionId: string; steps: KitAssemblyStep[]; components: KitAssemblyComponent[]; uses: Array<{ id: string; supplierProductId: string; sourceMaterialLotId: string | null; quantity: number; quantityUnit: string; recordedByUserId: string; recordedAtUtc: string }>; stepRecords: Array<{ sequence: number; labStepVersionId: string; notes: string; performedByUserId: string; performedAtUtc: string }>; startedAtUtc: string; finishedAtUtc: string | null; abandonmentReason: string | null; draftNotes?: string | null; draftVerificationBarcodes?: string[]; labelPrintRequestedAtUtc?: string | null; labelPrintRequestedByUserId?: string | null; containerBarcodeVerifiedAtUtc?: string | null; containerBarcodeVerifiedByUserId?: string | null }

export const kitAssemblyWorkflowsKey = ['kit-assembly-workflows'] as const
export async function getKitAssemblyWorkflows() { return read((await api.get<Envelope<KitAssemblyWorkflow[]>>(`${path}/workflows`)).data) }
export async function saveKitAssemblyWorkflow(input: { name: string; stepVersionIds: string[]; workflowVersion?: number; workflowId?: string }) { return read((await api.post<Envelope<KitAssemblyWorkflow>>(`${path}/workflows`, input)).data) }
export async function renameKitAssemblyWorkflow(workflowId: string, name: string, workflowVersion: number) { return read((await api.put<Envelope<KitAssemblyWorkflow>>(`${path}/workflows/${workflowId}/title`, { name, workflowVersion })).data) }
export async function discardKitAssemblyWorkflowDraft(workflowId: string, revisionId: string, workflowVersion: number) { return read((await api.post<Envelope<KitAssemblyWorkflow>>(`${path}/workflows/${workflowId}/revisions/${revisionId}/discard`, { workflowVersion })).data) }
export async function approveKitAssemblyWorkflow(workflowId: string, revisionId: string, workflowVersion: number, overrideReason?: string) { return read((await api.post<Envelope<KitAssemblyWorkflow>>(`${path}/workflows/${workflowId}/revisions/${revisionId}/approve`, { workflowVersion, overrideReason })).data) }
export async function getKitAssemblyRun(stockKitId: string) { return read((await api.get<Envelope<KitAssemblyRun>>(`${path}/stock-kits/${stockKitId}`)).data) }
export async function recordKitAssemblyStep(stockKitId: string, input: { version: number; sequence: number; notes: string }) { return read((await api.post<Envelope<KitAssemblyRun>>(`${path}/stock-kits/${stockKitId}/steps`, input)).data) }
export async function recordKitPackedContents(stockKitId: string, input: { version: number; stockKitVersion: number; supplierBarcodes: string[]; components: KitAssemblyComponentUse[]; assemblyNotes: string | null }) { return read((await api.post<Envelope<KitAssemblyRun>>(`${path}/stock-kits/${stockKitId}/packed-contents`, input)).data) }
export async function completeKitAssembly(stockKitId: string, version: number) { return read((await api.post<Envelope<KitAssemblyRun>>(`${path}/stock-kits/${stockKitId}/complete`, { version })).data) }
export async function abandonKitAssembly(stockKitId: string, version: number, reason: string) { return read((await api.post<Envelope<KitAssemblyRun>>(`${path}/stock-kits/${stockKitId}/abandon`, { version, reason })).data) }

export type KitAssemblySessionInput = { version: number; stockKitVersion: number; supplierBarcodes: string[]; components: KitAssemblyComponentUse[]; assemblyNotes: string | null; complete: boolean; verificationBarcodes?: string[]; containerBarcode: string | null }
export async function saveKitAssemblySession(stockKitId: string, input: KitAssemblySessionInput) { return read((await api.post<Envelope<KitAssemblyRun>>(`${path}/stock-kits/${stockKitId}/session`, input)).data) }
export async function requestKitAssemblyLabelPrint(stockKitId: string, version: number) { return read((await api.post<Envelope<KitAssemblyRun>>(`${path}/stock-kits/${stockKitId}/print-label`, { version })).data) }