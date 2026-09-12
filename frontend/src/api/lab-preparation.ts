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
export type PreparationMember = { id: string; position: string; barcode: string; attemptId: string; sequence: number; workOrderId: string; jobName: string; specimenId: string; specimenName: string; state: string; failureEvidence: string | null; blocker: string | null;
  stageSkips: { stageId: string; reason: string }[]; executions: PreparationExecution[];
  output: { id: string; barcode: string; quantity: number; quantityUnit: string; confirmed: boolean } | null;
  availableOutputs?: { id: string; barcode: string; quantity: number; quantityUnit: string }[];
  library: { id: string; libraryKey: string; status: string; sequencing: { id: string; batchNumber: string; name: string } | null } | null }
export type PreparationDetail = PreparationSummary & { notes?: string | null; layout: TrayLayout; labServiceWorkflowVersionId: string; stages: PreparationStage[]; members: PreparationMember[]; canOperate: boolean; canCorrect: boolean; roles: string[];
  records: { id: string; action: string; recordedAtUtc: string; actorUserId: string; details: PreparationCommand }[] }
export type PreparationTube = { id: string; barcode: string; location: string | null; specimenId: string; specimenName: string; jobName: string }
export type PreparationStepInput = { stageId: string; stepKey: string; action: 'record' | 'repeat' | 'correct'; outcome: 'recorded' | 'skipped'; coveredMemberIds: string[]; sharedCaptures: Record<string, unknown>;
  tubes: { memberId: string; captures: Record<string, unknown>; qcOutcome: string | null; reason: string | null }[];
  sharedQcOutcome: string | null; reason: string | null; coverageConfirmed: boolean; operatorConfirmed: boolean; resourcesConfirmed: boolean }
export type PreparationCommand = { requestId: string; version: number; action: string; memberId?: string; position?: string; barcode?: string; confirmed?: boolean; stageId?: string;
  reason?: string; reasonCode?: string; step?: PreparationStepInput; resourceId?: string; resourceVersion?: number; quantity?: number; quantityUnit?: string; location?: string; coveredMemberIds?: string[]; outputContainerId?: string }
const base = '/platform/lab-operations/preparation'
export const getPreparationIndex = async () => (await api.get<Envelope<PreparationIndex>>(base)).data.data
export const getPreparation = async (id: string) => (await api.get<Envelope<PreparationDetail>>(`${base}/batches/${id}`)).data.data
export const findPreparationTubes = async (id: string, query: string) => (await api.get<Envelope<PreparationTube[]>>(`${base}/batches/${id}/tubes`, { params: { query: query || undefined } })).data.data
export const saveTrayFormat = async (input: { id: string; version: number; layout: TrayLayout; isActive: boolean }) => (await api.post<Envelope<PreparationIndex>>(`${base}/tray-formats`, input)).data.data
export const createPreparation = async (input: { requestId: string; notes?: string; trayFormatId: string; workflowVersionId: string }) => (await api.post<Envelope<PreparationDetail>>(`${base}/batches`, input)).data.data
export const applyPreparation = async (id: string, input: PreparationCommand) => (await api.post<Envelope<PreparationDetail>>(`${base}/batches/${id}/commands`, input)).data.data
export const trayPositions = (layout: TrayLayout) => Array.from({ length: layout.rows * layout.columns }, (_, i) => layout.labels === 'numeric' ? String(i + 1) : `${String.fromCharCode(65 + Math.floor(i / layout.columns))}${i % layout.columns + 1}`)
