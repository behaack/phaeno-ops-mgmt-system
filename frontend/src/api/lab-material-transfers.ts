import { api } from './client'
import type { LabContainer, LabStepPerformanceInput } from './lab-operations'

export type MaterialTransfer = {
  id: string; sourceContainerId: string; sourceBarcode: string; destinationContainerId: string; destinationBarcode: string;
  quantity: number; quantityText?: string; quantityUnit: string;
  sourceQuantityBefore: number | null; sourceQuantityBeforeText?: string | null;
  sourceQuantityAfter: number | null; sourceQuantityAfterText?: string | null;
  sourceQuantityBasis: string | null; exhaustedOverride: boolean;
  balanceAdjustmentQuantity: number | null; balanceAdjustmentQuantityText?: string | null;
  performedByUserId: string; performedAtUtc: string; recordedByUserId: string; recordedAtUtc: string;
}
export type SequencingTubeMember = { id: string; labWorkOrderId: string; labLibraryId: string; libraryKey: string; source: LabContainer; sequencingTube: LabContainer | null; transfer: MaterialTransfer | null }
export type SequencingTubeWorkspace = { batchId: string; batchVersion: number; batchStatus: string; hasSendout: boolean; members: SequencingTubeMember[] }
export type SequencingTubeCommand = {
  requestId: string; batchVersion: number; action: 'allocate' | 'transfer'; barcodeSource?: 'Manufacturer' | 'PhaenoGenerated'; barcode?: string;
  location?: string; quantity?: number; quantityText?: string; quantityUnit?: string; materialExhausted?: boolean; sourceVersion?: number; destinationVersion?: number;
  confirmedSourceBarcode?: string; confirmedDestinationBarcode?: string; performance?: LabStepPerformanceInput;
}
export const getSequencingTubes = async (batchId: string) =>
  (await api.get<{ data: SequencingTubeWorkspace }>(`/platform/lab-operations/batches/${batchId}/sequencing-tubes`)).data.data
export const applySequencingTubeCommand = async (batchId: string, memberId: string, input: SequencingTubeCommand) =>
  (await api.post<{ data: SequencingTubeWorkspace }>(`/platform/lab-operations/batches/${batchId}/members/${memberId}/sequencing-tube`, input)).data.data
export const getContainerMaterialTransfers = async (workId: string, containerId: string) =>
  (await api.get<{ data: MaterialTransfer[] }>(`/platform/lab-operations/work-orders/${workId}/containers/${containerId}/material-transfers`)).data.data
