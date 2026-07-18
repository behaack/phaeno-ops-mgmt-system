import axios from 'axios'

import { api } from './client'

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: null | { code: string; message: string; details?: unknown }
}

export type LabRoleAssignment = { id: string; userId: string; userName: string; email: string; role: string; isActive: boolean; version: number }
export type LabWorkOrderSummary = { id: string; authorizationId: string; commercialOrderId: string | null; commercialOrderNumber: string | null; submittingOrganizationId: string; serviceKey: string; status: string; specimenCount: number; openExceptionCount: number; updatedAt: string; version: number }
export type LabProtocolVersion = { id: string; protocolVersion: number; status: string; definitionJson: string; authoredByUserId: string; authoredAtUtc: string; approvedByUserId: string | null; approvedAtUtc: string | null }
export type LabProtocol = { id: string; key: string; name: string; description: string | null; latestVersion: number; versions: LabProtocolVersion[]; version: number }
export type LabMaterialDefinition = { id: string; key: string; name: string; kind: string; isActive: boolean }
export type LabSupplier = { id: string; name: string; isActive: boolean }
export type LabStorageLocation = { id: string; name: string; isActive: boolean }
export type LabPreparedReagentComponent = { id: string; componentMaterialLotId: string; materialKey: string; materialName: string; lotNumber: string; quantity: number; quantityUnit: string }
export type LabMaterialLot = { id: string; kind: string; materialDefinitionId: string; materialKey: string; name: string; lotNumber: string; supplierId: string | null; supplier: string | null; expirationOrRetestDate: string | null; storageLocationId: string; storageLocation: string; availableQuantity: number; quantityUnit: string; qcDisposition: string; qcPerformedOn: string | null; qcFailureReason: string | null; components: LabPreparedReagentComponent[]; version: number }
export type LabEquipment = { id: string; assetCode: string; name: string; equipmentType: string; location: string; status: string; lastCalibrationAtUtc: string | null; calibrationDueAtUtc: string | null; version: number }
export type LabBatch = { id: string; batchNumber: string; batchType: string; status: string; notes: string | null; memberCount: number; sendoutId: string | null; sendoutStatus: string | null; sendoutVersion: number | null; version: number }
export type LabOperationsDashboard = { workOrders: LabWorkOrderSummary[]; protocols: LabProtocol[]; materialLots: LabMaterialLot[]; materialDefinitions: LabMaterialDefinition[]; suppliers: LabSupplier[]; storageLocations: LabStorageLocation[]; equipment: LabEquipment[]; batches: LabBatch[]; roleAssignments: LabRoleAssignment[] }
export type CreateLabMaterialLotInput = {
  kind: 'SupplierLot' | 'PreparedReagent'
  materialDefinitionId: string | null
  newMaterialName: string | null
  lotNumber: string
  supplierId: string | null
  newSupplierName: string | null
  storageLocationId: string | null
  newStorageLocationName: string | null
  expirationOrRetestDate: string | null
  availableQuantity: number
  quantityUnit: string
  components: Array<{ componentMaterialLotId: string; quantity: number; quantityUnit: string }>
}

export type LabSpecimen = { id: string; submittedSpecimenId: string; accessionNumber: string | null; receivedAtUtc: string | null; intakeDisposition: string; receiptCondition: string | null; intakeReasonCode: string | null; currentLocation: string | null; version: number }
export type LabContainer = { id: string; labSpecimenId: string | null; parentContainerId: string | null; kind: string; barcode: string; label: string; labelPrintCount: number; location: string; quantity: number | null; quantityUnit: string | null; status: string; retainUntilUtc: string | null; version: number }
export type LabContainerScan = { labWorkOrderId: string; commercialOrderNumber: string | null; accessionNumber: string | null; parentBarcode: string | null; labLibraryId: string | null; libraryStatus: string | null; container: LabContainer }
export type LabLabelPrintEvent = { id: string; labContainerId: string; outcome: string; reason: string; failureDetails: string | null; printNumber: number | null; actorUserId: string | null; occurredAtUtc: string }
export type LabContainerLabel = { labWorkOrderId: string; commercialOrderNumber: string | null; accessionNumber: string | null; parentBarcode: string | null; container: LabContainer; printHistory: LabLabelPrintEvent[] }
export type LabExecution = { id: string; labSpecimenId: string | null; labProtocolVersionId: string; assignedToUserId: string | null; status: string; capturedResultsJson: string; deviationNote: string | null; startedAtUtc: string | null; completedAtUtc: string | null; version: number }
export type LabLibrary = { id: string; labSpecimenId: string; sourceContainerId: string; libraryContainerId: string; preparationExecutionId: string; libraryKey: string; status: string; qcResultsJson: string | null; version: number }
export type LabException = { id: string; labSpecimenId: string | null; labProtocolExecutionId: string | null; audience: string; categoryCode: string; title: string; internalDescription: string; customerSafeSummary: string | null; isBlocking: boolean; status: string; responseDueAtUtc: string | null; resolvedAtUtc: string | null; version: number }
export type LabScientificApproval = { id: string; approvalVersion: number; releaseDefinitionKey: string; releaseDefinitionVersion: number; approvedByUserId: string; approvedAtUtc: string; projectionVersion: number }
export type LabWorkOrderDetail = { workOrder: LabWorkOrderSummary; specimens: LabSpecimen[]; containers: LabContainer[]; executions: LabExecution[]; libraries: LabLibrary[]; exceptions: LabException[]; scientificApprovals: LabScientificApproval[] }

export const getLabOperationsDashboard = () => get<LabOperationsDashboard>('/platform/lab-operations')
export const getLabWorkOrder = (id: string) => get<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${id}`)
export const setLabRole = (userId: string, role: string, input: { isActive: boolean; version?: number }) => put<LabRoleAssignment>(`/platform/lab-operations/roles/${userId}/${role}`, input)
export const createLabProtocol = (input: { name: string; description?: string }) => post<LabProtocol>('/platform/lab-operations/protocols', input)
export const createLabProtocolVersion = (id: string, input: { definitionJson: string; protocolVersion: number }) => post<LabProtocol>(`/platform/lab-operations/protocols/${id}/versions`, input)
export const updateLabProtocolVersion = (id: string, input: { definitionJson: string; protocolVersion: number }) => put<LabProtocol>(`/platform/lab-operations/protocol-versions/${id}`, input)
export const transitionLabProtocolVersion = (id: string, input: { action: string; protocolVersion: number }) => post<LabProtocol>(`/platform/lab-operations/protocol-versions/${id}/transition`, input)
export const setLabMilestone = (id: string, status: string, version: number) => post<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${id}/milestone`, { status, version })
export const receiveLabSpecimen = (workId: string, specimenId: string, input: object) => post<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${workId}/specimens/${specimenId}/receipt`, input)
export const accessionLabSpecimen = (workId: string, specimenId: string, input: object) => post<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${workId}/specimens/${specimenId}/accession`, input)
export const setLabSpecimenDisposition = (workId: string, specimenId: string, input: object) => post<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${workId}/specimens/${specimenId}/disposition`, input)
export const createLabContainer = (workId: string, input: object) => post<LabContainer>(`/platform/lab-operations/work-orders/${workId}/containers`, input)
export const scanLabContainer = (barcode: string) => get<LabContainerScan>(`/platform/lab-operations/containers/scan?barcode=${encodeURIComponent(barcode)}`)
export const getLabContainerLabel = (id: string) => get<LabContainerLabel>(`/platform/lab-operations/containers/${id}/label`)
export const recordLabContainerLabelPrint = (id: string, input: { reason: string; outcome: 'Succeeded' | 'Failed'; failureDetails?: string | null }) => post<LabContainerLabel>(`/platform/lab-operations/containers/${id}/label-print`, input)
export const createLabExecution = (workId: string, input: object) => post<LabExecution>(`/platform/lab-operations/work-orders/${workId}/executions`, input)
export const transitionLabExecution = (id: string, input: object) => post<LabExecution>(`/platform/lab-operations/executions/${id}/transition`, input)
export const createLabMaterialLot = (input: CreateLabMaterialLotInput) => post<LabMaterialLot>('/platform/lab-operations/material-lots', input)
export const recordLabMaterialQc = (id: string, input: {
  version: number
  disposition: 'Passed' | 'Failed'
  performedOn: string
  failureReason: string | null
  resultsJson: string
}) => post<LabMaterialLot>(`/platform/lab-operations/material-lots/${id}/qc`, input)
export const consumeLabMaterial = (executionId: string, input: object) => post<LabExecution>(`/platform/lab-operations/executions/${executionId}/material-consumptions`, input)
export const createLabEquipment = (input: object) => post<LabEquipment>('/platform/lab-operations/equipment', input)
export const recordLabEquipmentUsage = (executionId: string, input: object) => post<LabExecution>(`/platform/lab-operations/executions/${executionId}/equipment-usages`, input)
export const createLabLibrary = (workId: string, input: object) => post<LabLibrary>(`/platform/lab-operations/work-orders/${workId}/libraries`, input)
export const recordLabLibraryQc = (id: string, input: object) => post<LabLibrary>(`/platform/lab-operations/libraries/${id}/qc`, input)
export const createLabBatch = (input: { batchType: string; notes?: string | null }) => post<LabBatch>('/platform/lab-operations/batches', input)
export const addLabBatchMember = (id: string, input: object) => post<LabBatch>(`/platform/lab-operations/batches/${id}/members`, input)
export const transitionLabBatch = (id: string, input: object) => post<LabBatch>(`/platform/lab-operations/batches/${id}/transition`, input)
export const createLabSendout = (id: string, input: object) => post<LabBatch>(`/platform/lab-operations/batches/${id}/sendout`, input)
export const transitionLabSendout = (id: string, input: object) => post<LabBatch>(`/platform/lab-operations/sendouts/${id}/transition`, input)
export const recordLabCustody = (id: string, input: object) => post<LabBatch>(`/platform/lab-operations/sendouts/${id}/custody-events`, input)
export const createLabException = (workId: string, input: object) => post<LabException>(`/platform/lab-operations/work-orders/${workId}/exceptions`, input)
export const resolveLabException = (id: string, input: object) => post<LabException>(`/platform/lab-operations/exceptions/${id}/resolve`, input)
export const approveLabScientificReview = (workId: string, input: object) => post<LabWorkOrderDetail>(`/platform/lab-operations/work-orders/${workId}/scientific-approval`, input)

async function get<T>(url: string) { return unwrap((await api.get<ApiEnvelope<T>>(url)).data) }
async function post<T>(url: string, data: unknown) { return unwrap((await api.post<ApiEnvelope<T>>(url, data)).data) }
async function put<T>(url: string, data: unknown) { return unwrap((await api.put<ApiEnvelope<T>>(url, data)).data) }
function unwrap<T>(envelope: ApiEnvelope<T>) { if (!envelope.success) throw new Error(envelope.error?.message ?? 'The laboratory request failed.'); return envelope.data }
export function getLabOperationsError(error: unknown, fallback: string) { if (axios.isAxiosError<ApiEnvelope<unknown>>(error)) return error.response?.data.error?.message ?? fallback; return error instanceof Error ? error.message : fallback }
