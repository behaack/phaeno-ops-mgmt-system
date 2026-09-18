import { api } from './client'
import type { LabExecutionStepRecord, LabServiceWorkflow } from './lab-operations'
import type { ProtocolDefinition } from '#/features/lab-operations/protocol-definition'

type Envelope<T> = { data: T }
export type TrayLayout = { name: string; rows: number; columns: number; labels: 'grid' | 'numeric'; unavailable: string[] }
export type TrayFormat = { id: string; version: number; isActive: boolean; layout: TrayLayout }
export type PreparationSummary = { id: string; name: string; status: string; version: number; startedAtUtc: string | null; completedAtUtc: string | null }
export type PreparationIndex = { formats: TrayFormat[]; batches: PreparationSummary[]; workflows: LabServiceWorkflow[]; compatibleWorkflowVersionIds: string[]; canOperate: boolean; canConfigure: boolean }
export type PreparationStage = { id: string; name: string; sequence: number; requirement: string; definition: ProtocolDefinition }
export type PreparationExecution = { id: string; stageId: string; status: string; evidence: { records: (LabExecutionStepRecord & { preparationRecordId?: string })[] }; blockers: string[]; stepPrerequisites?: Record<string, string[]> }
export type PreparationMember = { id: string; position: string; barcode: string; attemptId: string; sequence: number; workOrderId: string; jobName: string; specimenId: string; specimenName: string; state: string; failureEvidence: string | null; operationalHold?: boolean; blocker: string | null;
  customerSampleId?: string | null; biologicalSource?: string | null; safetyInformation?: string | null;
  stageSkips: { stageId: string; reason: string }[]; executions: PreparationExecution[];
  output: { id: string; barcode: string; quantity: number; quantityUnit: string; confirmed: boolean } | null;
  availableOutputs?: { id: string; barcode: string; quantity: number; quantityUnit: string }[];
  library: { id: string; libraryKey: string; status: string; sequencing: { id: string; batchNumber: string; name: string } | null } | null }
export type PreparationDetail = PreparationSummary & { inlineResourceFields?: boolean; configuredMaterials?: boolean; automaticSkipAvailable?: boolean; automaticSpecimenReferences?: boolean; optionalQcReports?: boolean; optionalPreparationReports?: boolean; bulkOutputs?: boolean; trayBarcode?: string | null; trayConfirmed?: boolean; notes?: string | null; layout: TrayLayout; labServiceWorkflowVersionId: string; stages: PreparationStage[]; members: PreparationMember[]; canOperate: boolean; canCorrect: boolean; roles: string[];
  records: { id: string; action: string; recordedAtUtc: string; actorUserId: string; details: PreparationCommand & { automatic?: boolean; outputResults?: { memberId: string; outputContainerId: string; barcode: string }[]; qcReport?: { fileName: string; contentType: string; sizeBytes: number; sha256: string; scanStatus: string }; preparationReport?: { fileName: string; contentType: string; sizeBytes: number; sha256: string; scanStatus: string } } }[] }
export type PreparationTube = { id: string; barcode: string; location: string | null; specimenId: string; specimenName: string; jobName: string }
export type PreparationTubePage = { items: PreparationTube[]; totalCount: number; page: number; pageSize: number; totalPages: number }
export type PreparationStepInput = { stageId: string; stepKey: string; action: 'record' | 'repeat' | 'correct'; outcome: 'recorded' | 'skipped'; coveredMemberIds: string[]; sharedCaptures: Record<string, unknown>;
  tubes: { memberId: string; captures: Record<string, unknown>; qcOutcome: string | null; reason: string | null }[];
  sharedQcOutcome: string | null; reason: string | null; coverageConfirmed: boolean; operatorConfirmed: boolean; resourcesConfirmed: boolean; resourceEntries?: PreparationResourceInput[] }
export type PreparationResourceInput = { fieldKey: string; memberId?: string; resourceId?: string; resourceVersion?: number; productId?: string; name?: string; vendor?: string; quantity?: number; quantityUnit?: string; location?: string; runReference?: string; amountUnknown?: boolean; exceptionReason?: string; disposition?: 'continue' | 'hold' | 'fail' }
export type PreparationOutputInput = { memberId: string; quantity: number; quantityUnit: string; location: string }
export type PreparationCommand = { requestId: string; version: number; action: string; memberId?: string; position?: string; barcode?: string; confirmed?: boolean; stageId?: string;
  reason?: string; reasonCode?: string; step?: PreparationStepInput; resourceId?: string; resourceVersion?: number; quantity?: number; quantityUnit?: string; location?: string; coveredMemberIds?: string[]; outputContainerId?: string; outputs?: PreparationOutputInput[] }
const base = '/platform/lab-operations/preparation'
export const getPreparationIndex = async () => (await api.get<Envelope<PreparationIndex>>(base)).data.data
export const getPreparation = async (id: string) => (await api.get<Envelope<PreparationDetail>>(`${base}/batches/${id}`)).data.data
export const findPreparationTubes = async (id: string, query: string, freezerBox = '', page = 1) => {
  const result = (await api.get<Envelope<PreparationTubePage>>(`${base}/batches/${id}/tubes`, { params: { page, pageSize: 10, query: query.trim() || undefined, freezerBox: freezerBox.trim() || undefined } })).data.data
  if (!result || !Array.isArray(result.items)) throw new Error('The eligible-tube list could not be loaded. Refresh and try again.')
  return result
}
export const saveTrayFormat = async (input: { id: string; version: number; layout: TrayLayout; isActive: boolean }) => (await api.post<Envelope<PreparationIndex>>(`${base}/tray-formats`, input)).data.data
export const createPreparation = async (input: { requestId: string; notes?: string; trayFormatId: string; workflowVersionId: string }) => (await api.post<Envelope<PreparationDetail>>(`${base}/batches`, input)).data.data
export const applyPreparation = async (id: string, input: PreparationCommand) => (await api.post<Envelope<PreparationDetail>>(`${base}/batches/${id}/commands`, input)).data.data
export const applyPreparationWithQcReport = async (id: string, input: PreparationCommand, report: File, preparationReport = false) => {
  const data = new FormData()
  data.append('payload', JSON.stringify(input))
  data.append('file', report)
  return (await api.post<Envelope<PreparationDetail>>(`${base}/batches/${id}/commands/${preparationReport ? 'with-report' : 'with-qc-report'}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data
}
export const downloadPreparationQcReport = async (batchId: string, recordId: string, preparationReport = false) => (await api.get<Blob>(`${base}/batches/${batchId}/records/${recordId}/${preparationReport ? 'report' : 'qc-report'}`, { responseType: 'blob' })).data
export const trayPositions = (layout: TrayLayout) => Array.from({ length: layout.rows * layout.columns }, (_, i) => layout.labels === 'numeric' ? String(i + 1) : `${String.fromCharCode(65 + Math.floor(i / layout.columns))}${i % layout.columns + 1}`)
