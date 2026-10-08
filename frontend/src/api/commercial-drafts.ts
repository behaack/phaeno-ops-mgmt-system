import { api } from './client'
import type { CommercialDraftForm } from '#/features/orders/commercial-draft'
import type { LabServiceOrder } from './order-management'
type ApiEnvelope<T> = { success: boolean; data: T; error: { message: string } | null }

export type CommercialDraftWrite = { organizationId: string; departmentId: string; draft: CommercialDraftForm; sourceRequestId?: string | null; version?: number }
export async function saveCommercialDraft(orderId: string | undefined, input: CommercialDraftWrite, key: string) {
  const url = orderId ? `/platform/lab-service-orders/${orderId}/draft` : '/platform/lab-service-orders'
  const response = orderId
    ? await api.put<ApiEnvelope<LabServiceOrder>>(url, input, { headers: { 'Idempotency-Key': key } })
    : await api.post<ApiEnvelope<LabServiceOrder>>(url, input, { headers: { 'Idempotency-Key': key } })
  if (!response.data.success) throw new Error(response.data.error?.message ?? 'The Draft was not saved.')
  return response.data.data
}
export async function submitCommercialDraft(orderId: string, version: number, key: string) {
  const response = await api.post<ApiEnvelope<LabServiceOrder>>(`/platform/lab-service-orders/${orderId}/submit-for-pricing`, { version }, { headers: { 'Idempotency-Key': key } })
  if (!response.data.success) throw new Error(response.data.error?.message ?? 'The Draft was not submitted.')
  return response.data.data
}
