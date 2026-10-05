import { useQuery } from '@tanstack/react-query'
import { api } from '#/api/client'

// Temporarily suppressed by Product Owner direction; keep the workflow for later use.
export const customerSpecimenHoldsEnabled = false

export type SpecimenHold = { id: string; labSpecimenId: string; state: string; reason: string; response: string | null; version: number; requestedAtUtc: string }
export type SpecimenHoldWorkspace = {
  workOrderId: string | null; specimens: { id: string; sampleId: string; name: string }[]; holds: SpecimenHold[]
  history?: { id: string; labSpecimenId: string; occurredAtUtc: string; state: string; reason: string }[]
  canRequest: boolean; canDecide: boolean
}
export function useSpecimenHolds(orderId?: string, workOrderId?: string) {
  const url = workOrderId ? `/platform/lab-operations/work-orders/${workOrderId}/customer-holds` : `/lab-service-orders/${orderId}/specimen-holds`
  const query = useQuery({ queryKey: ['specimen-holds', url], queryFn: async () => (await api.get<{ data: SpecimenHoldWorkspace }>(url)).data.data,
    enabled: Boolean(workOrderId || customerSpecimenHoldsEnabled && orderId), refetchInterval: 15000 })
  return { url, query }
}
