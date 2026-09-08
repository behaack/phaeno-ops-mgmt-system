import { api } from './client'
import type {
  AssemblyProfile,
  DataAssemblyRequest,
  LabServiceOrder,
  ReagentOrder,
} from './order-management'

export type CustomWorkInput = {
  service: 'PSeqLabService' | 'PSeqKit'
  subject: string
  description: string
  sourceOrderId?: string
}
export async function requestCustomWork(input: CustomWorkInput, key: string) {
  return read(
    (
      await api.post<
        Envelope<{
          opportunityId: string
          opportunityNumber: string
          departmentId: string
          status: 'Submitted'
        }>
      >('/order-catalog/custom-work', input, {
        headers: { 'Idempotency-Key': key },
      })
    ).data,
  )
}

export type LabServiceOffering = {
  id: string
  familyId: string
  offeringVersion: number
  name: string
  description: string
  catalogItemId: string
  catalogCode: string
  catalogName: string
  catalogItemVersion: number
  unitPrice: number
  currency: string
  analysisIds: string[]
  allowedMaterialTypes: string[]
  allowedBiologicalSources: string[]
  includedOutputContract: string
  minimumTurnaroundDays: number
  maximumTurnaroundDays: number
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  isSynthetic: boolean
  isAvailable: boolean
  version: number
}
export type LabServiceOfferingWrite = Pick<
  LabServiceOffering,
  | 'name'
  | 'description'
  | 'catalogItemId'
  | 'analysisIds'
  | 'allowedMaterialTypes'
  | 'allowedBiologicalSources'
  | 'includedOutputContract'
  | 'minimumTurnaroundDays'
  | 'maximumTurnaroundDays'
  | 'effectiveFrom'
  | 'effectiveTo'
  | 'isActive'
  | 'isSynthetic'
> & { version?: number }
export type LabServiceCommercialSnapshot = {
  offeringId: string
  familyId: string
  offeringVersion: number
  productName: string
  catalogItemId: string
  catalogCode: string
  catalogItemVersion: number
  currency: string
  unitPrice: number
  specimenCount: number
  subtotal: number
  tax: number
  total: number
  analysisIds: string[]
  includedOutputContract: string
  minimumTurnaroundDays: number
  maximumTurnaroundDays: number
  committedAtUtc: string
}
export type StandardLabOrderPreview = {
  reviewToken: string
  offering: LabServiceOffering
  specimenCount: number
  subtotal: number
  tax: number | null
  total: number | null
  currency: string
  canPlaceStandardOrder: boolean
  blockers: string[]
  orderVersion: number
  commercialProfileVersion: number | null
  departmentVersion: number
  organizationVersion: number
}
export type LabServiceTiming = {
  version: number
  canOverrideTiming: boolean
  firstReceivedAtUtc: string | null
  acceptedAtUtc: string | null
  originalTargetAtUtc: string | null
  expectedCompletionAtUtc: string | null
  completedAtUtc: string | null
  scheduleHealth: string
  changes: Array<{
    id: string
    previousExpectedAtUtc: string
    expectedAtUtc: string
    reason: string
    customerSafeNote: string | null
    internalNote: string | null
    actorUserId: string
    occurredAtUtc: string
    notificationRequired: boolean
    notificationStatus: string
  }>
}
export type KitUnit = {
  id: string
  label: string
  orderLineId: string
  status: string
  shippedAt: string | null
  expiresAt: string | null
  lotBatchNumber: string | null
  carrier: string | null
  trackingNumber: string | null
  replacesKitUnitId: string | null
  replacedByKitUnitId: string | null
  version: number
}
export type KitAssemblyCase = {
  id: string
  caseNumber: string
  originalKitUnitId: string
  currentKitUnitId: string
  status: string
  submissionDeadlineAt: string | null
  deadlineBasis: string
  assemblyRequestId: string | null
  assemblyRequestNumber: string | null
  assemblyRequestStatus: string | null
  profile: AssemblyProfile
  version: number
  canPrepare: boolean
  canExtend: boolean
  canReplace: boolean
  canCancel: boolean
  history: Array<{ id: string; eventType: string; at: string; reason: string }>
}
type Envelope<T> = {
  success: boolean
  data: T
  error: { message: string } | null
}
function read<T>(value: Envelope<T>) {
  if (!value.success)
    throw new Error(value.error?.message ?? 'The request failed.')
  return value.data
}
export async function listLabServiceOfferings(platform = false) {
  return read(
    (
      await api.get<Envelope<LabServiceOffering[]>>(
        platform
          ? '/platform/order-configuration/lab-service-offerings'
          : '/order-catalog/lab-service-offerings',
      )
    ).data,
  )
}
export async function saveLabServiceOffering(
  id: string | null,
  input: LabServiceOfferingWrite,
) {
  return read(
    (
      await api.post<Envelope<LabServiceOffering>>(
        `/platform/order-configuration/lab-service-offerings${id ? `/${id}/versions` : ''}`,
        input,
      )
    ).data,
  )
}
export async function updateLabServiceOfferingAvailability(
  id: string,
  input: Pick<
    LabServiceOffering,
    'version' | 'effectiveFrom' | 'effectiveTo' | 'isActive'
  >,
) {
  return read(
    (
      await api.patch<Envelope<LabServiceOffering>>(
        `/platform/order-configuration/lab-service-offerings/${id}/availability`,
        input,
      )
    ).data,
  )
}
export async function previewStandardLabOrder(id: string, offeringId: string) {
  return read(
    (
      await api.get<Envelope<StandardLabOrderPreview>>(
        `/lab-service-orders/${id}/standard-preview`,
        { params: { offeringId } },
      )
    ).data,
  )
}
export async function placeStandardLabOrder(
  id: string,
  input: {
    reviewToken: string
    version: number
    offeringId: string
    offeringVersion: number
    offeringRecordVersion: number
    catalogItemVersion: number
    commercialProfileVersion: number
    departmentVersion: number
    organizationVersion: number
    prohibitedDataConfirmed: boolean
    purchaseOrderNumber?: string
  },
  key: string,
) {
  return read(
    (
      await api.post<Envelope<LabServiceOrder>>(
        `/lab-service-orders/${id}/place-standard`,
        input,
        { headers: { 'Idempotency-Key': key } },
      )
    ).data,
  )
}
export async function overrideLabServiceTiming(
  id: string,
  input: {
    version: number
    expectedCompletionAtUtc: string
    reason: string
    customerSafeNote?: string
    internalNote?: string
  },
) {
  return read(
    (
      await api.post<Envelope<LabServiceTiming>>(
        `/platform/lab-service-orders/${id}/timing`,
        input,
      )
    ).data,
  )
}
export async function prepareKitAssemblyRequest(
  orderId: string,
  caseId: string,
  input: {
    version: number
    projectReference: string
    metadataJson: string
    requestedOutput: string
    processingNotes: string
    prohibitedDataConfirmed: boolean
  },
  key: string,
) {
  return read(
    (
      await api.post<Envelope<DataAssemblyRequest>>(
        `/reagent-orders/${orderId}/assembly-cases/${caseId}/request`,
        input,
        { headers: { 'Idempotency-Key': key } },
      )
    ).data,
  )
}
export type KitCaseActionInput = {
  version: number
  reason: string
  submissionDeadlineAt?: string
  lotBatchNumber?: string
  expiresAt?: string | null
  shippedAt?: string
  carrier?: string
  trackingNumber?: string
}
export async function changeKitAssemblyCase(
  orderId: string,
  caseId: string,
  action: 'extend' | 'cancel' | 'replace',
  input: KitCaseActionInput,
) {
  return read(
    (
      await api.post<Envelope<ReagentOrder>>(
        `/platform/reagent-orders/${orderId}/assembly-cases/${caseId}/${action}`,
        input,
      )
    ).data,
  )
}
