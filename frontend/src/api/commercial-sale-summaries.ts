import { api } from './client'
import type { PagedResult } from './order-management'

export type CommercialSaleSummary = {
  id: string
  orderId: string
  workflowType: string
  productSummary: string
  projectionStatus: 'Published' | 'Pending' | 'NeedsAttention'
  version: number
}
type Envelope<T> = { success: boolean; data: T; error: { message: string } | null }
function unwrap<T>(result: Envelope<T>) {
  if (!result.success) throw new Error(result.error?.message ?? 'The commercial summary could not be loaded.')
  return result.data
}
export async function listSaleSummaryFailures(page: number) {
  return unwrap((await api.get<Envelope<PagedResult<CommercialSaleSummary>>>('/platform/commercial-sale-summaries', {
    params: { needsAttention: true, page, pageSize: 10 },
  })).data)
}
export async function retrySaleSummary(summary: CommercialSaleSummary) {
  return unwrap((await api.post<Envelope<CommercialSaleSummary>>(`/platform/commercial-sale-summaries/${summary.id}/retry`, {
    version: summary.version,
  })).data)
}
