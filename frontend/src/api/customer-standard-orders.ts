import { api } from './client'
import type { LabServiceOrder } from './order-management'
import type { StandardLabOrderPreview } from './order-bundles'

export type CustomerStandardDraft = {
  jobName: string
  offeringId: string | null
  sampleTypeDefinitionId: string | null
  sources: { biologicalSource: string; specimenCount: number }[]
  storageRequirements: string | null
  safetyDeclaration: string
  notes: string
}
type Envelope<T> = { success: boolean; data: T; error?: { message?: string } }
function read<T>(result: Envelope<T>) {
  if (!result.success) throw new Error(result.error?.message ?? 'The order could not be saved.')
  return result.data
}
export async function createCustomerStandardDraft(draft: CustomerStandardDraft, key: string) {
  return read((await api.post<Envelope<LabServiceOrder>>('/lab-service-orders/customer-drafts', { draft }, { headers: { 'Idempotency-Key': key } })).data)
}
export async function saveCustomerStandardDraft(id: string, draft: CustomerStandardDraft, version: number) {
  return read((await api.patch<Envelope<LabServiceOrder>>(`/lab-service-orders/${id}/customer-draft`, { draft, version })).data)
}
export async function reviewCustomerStandardDraft(id: string, version: number) {
  return read((await api.post<Envelope<{ order: LabServiceOrder; preview: StandardLabOrderPreview }>>(`/lab-service-orders/${id}/customer-review`, { version })).data)
}
