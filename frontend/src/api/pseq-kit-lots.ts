import { api } from './client'
import type { PagedResult } from './order-management'

export type PSeqKitLot = {
  id: string; catalogItemId: string; productName: string; lotNumber: string
  expirationDate: string | null; isRecalled: boolean; recallReason: string | null
  recallChangedAt: string | null; version: number
}
export type KitLotAssessment = {
  lotId: string; lotNumber: string; expirationDate: string | null
  isRecalled: boolean; recallReason: string | null; isExpired: boolean
  expirationUnknown: boolean; assessedOn: string; lotVersion: number
}
export type KitLotSubmission = {
  id: string; enteredLotNumber: string; usedOn: string | null; checkedAt: string; version: number
  savedAssessment: KitLotAssessment; currentAssessment: KitLotAssessment
}
type Envelope<T> = { success: boolean; data: T; error: { message: string } | null }
function read<T>(envelope: Envelope<T>) {
  if (!envelope.success) throw new Error(envelope.error?.message ?? 'The lot could not be loaded.')
  return envelope.data
}
const base = '/platform/order-configuration/kit-lots'
export async function listPSeqKitLots(params: { catalogItemId?: string; search?: string; page?: number }) {
  return read((await api.get<Envelope<PagedResult<PSeqKitLot>>>(base, { params })).data)
}
export async function getPSeqKitLot(id: string) {
  return read((await api.get<Envelope<PSeqKitLot>>(`${base}/${id}`)).data)
}
export async function createPSeqKitLot(input: { catalogItemId: string; lotNumber: string; expirationDate: string | null }, key: string) {
  return read((await api.post<Envelope<PSeqKitLot>>(base, input, { headers: { 'Idempotency-Key': key } })).data)
}
export async function setPSeqKitRecall(id: string, input: { version: number; isRecalled: boolean; reason: string }, key: string) {
  return read((await api.post<Envelope<PSeqKitLot>>(`${base}/${id}/recall`, input, { headers: { 'Idempotency-Key': key } })).data)
}
export async function submitPartnerKitLot(orderId: string, caseId: string,
  input: { caseVersion: number; version: number | null; lotNumber: string; usedOn: string | null }, key: string) {
  return read((await api.post<Envelope<KitLotSubmission>>(`/reagent-orders/${orderId}/assembly-cases/${caseId}/lot`, input,
    { headers: { 'Idempotency-Key': key } })).data)
}
