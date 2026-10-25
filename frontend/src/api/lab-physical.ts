import { api } from './client'
type ApiResponse<T> = { data: T }

export type StorageBox = { id: string; barcode: string; room: string; freezer: string; rack: string; shelf: string; version: number }
export type PhysicalEvent = { id: string; kind: string; actorUserId: string; occurredAtUtc: string; recordedAtUtc: string; reason: string; detailsJson: string }
export type BoxMove = { id: string; actorUserId: string; recordedAtUtc: string; reason: string; detailsJson: string }
export type PlacementLocation = { physicalEventId: string; labContainerId: string; storageBoxId: string; occurredAtUtc: string; sourceMoveId: string | null; locationRecordedAtUtc: string | null; location: { room: string; freezer: string; rack: string; shelf: string } | null; availability: string }
export type PhysicalState = { box: StorageBox | null; storagePosition: string | null; physicalHoldReason: string | null; retainUntilUtc: string | null; trialHold: boolean; trialTerms: { materialDisposition: string; returnDestination: string | null; returnHandling: string | null; returnShippingPayer: string | null } | null; history: { events: PhysicalEvent[]; boxMoves: BoxMove[]; locations: PlacementLocation[]; limited: boolean } }
const path = '/platform/lab-operations'
export const findStorageBoxes = async (barcode: string) => (await api.get<ApiResponse<StorageBox[]>>(`${path}/storage-boxes`, { params: { barcode } })).data.data!
export const saveStorageBox = async (input: { requestId: string; barcode: string; room: string; freezer: string; rack: string; shelf: string; reason: string; version?: number }) => (await api.post<ApiResponse<StorageBox>>(`${path}/storage-boxes`, input)).data.data!
export const getPhysicalState = async (id: string) => (await api.get<ApiResponse<PhysicalState>>(`${path}/containers/${id}/physical`)).data.data!
export type PhysicalInput = { requestId: string; version: number; kind: string; scannedBarcode: string; reason: string; occurredAt?: string; method?: string; destination?: string; trackingReference?: string; retainUntilUtc?: string | null; position?: string; measuredQuantityText?: string; measuredQuantityUnit?: string }
export const recordPhysicalEvent = async (id: string, input: PhysicalInput) => (await api.post(`${path}/containers/${id}/physical`, input)).data
