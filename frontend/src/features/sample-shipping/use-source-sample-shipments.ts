import { useQuery } from '@tanstack/react-query'
import { getSourceSampleShipments } from '#/api/sample-shipping'
import { usePhaenoSession } from '#/features/auth/session-context'

type SampleReceipt = { name: string; counts?: { total: number; received: number } }

export function useSourceSampleShipments(sourceId: string, staff = false) {
  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const allowed = Boolean(staff ? session?.capabilities.canManageLabOperations : session?.capabilities.canViewSampleShipping)
  const enabled = allowed && authProvider !== 'mock'
  const shipments = useQuery({
    queryKey: [staff ? 'platform-sample-shipments' : 'sample-shipments', selectedOrganizationId, selectedDepartmentId, 'source', sourceId],
    queryFn: () => getSourceSampleShipments(sourceId, staff),
    enabled,
  })
  const data = enabled ? shipments.data : undefined
  const retired = data?.filter(value => value.authorizationSourceId === sourceId && value.status === 'Cancelled' && !value.isPackingPool) ?? []
  const related = data?.filter(value => value.authorizationSourceId === sourceId && value.status !== 'Cancelled' && !(value.isPackingPool && value.crosswalk.length === 0)) ?? []
  const sampleReceipts = new Map<string, SampleReceipt>()
  const sampleSlots = new Map<string, { total?: number; matched: Set<string> }>()
  for (const shipment of related) for (const item of shipment.crosswalk) {
    const earlier = sampleReceipts.get(item.submittedSpecimenId)
    const total = item.totalSampleTubeCount
    const received = item.receivedTubeCount
    // These are family-wide counts repeated on each tube slot, not quantities to add.
    const counts = typeof total === 'number' && Number.isInteger(total) && total > 0
      && typeof received === 'number' && Number.isInteger(received) && received >= 0 && received <= total
      ? { total: Math.max(earlier?.counts?.total ?? 0, total), received: Math.max(earlier?.counts?.received ?? 0, received) }
      : earlier?.counts
    sampleReceipts.set(item.submittedSpecimenId, { name: item.customerSampleId, counts })
    const slots = sampleSlots.get(item.submittedSpecimenId) ?? { matched: new Set<string>() }
    if (typeof total === 'number' && Number.isInteger(total) && total > 0) slots.total = Math.max(slots.total ?? 0, total)
    if (item.supplierTubeBarcode) slots.matched.add(item.tubeSlotId ?? `${shipment.id}:${item.shipmentItemId}:${item.tubeOrdinal ?? 1}`)
    sampleSlots.set(item.submittedSpecimenId, slots)
  }
  const sampleMatches = new Map<string, { matched: number; total: number }>()
  for (const [id, slots] of sampleSlots) if (slots.total !== undefined && slots.matched.size <= slots.total) {
    sampleMatches.set(id, { matched: slots.matched.size, total: slots.total })
  }
  const receiptState: 'loading' | 'unavailable' | 'ready' = enabled && shipments.isFetching ? 'loading'
    : !enabled || shipments.error || !data || shipments.fetchStatus === 'paused' ? 'unavailable' : 'ready'
  return { allowed, shipments, related, retired, sampleReceipts, sampleMatches, receiptState }
}
