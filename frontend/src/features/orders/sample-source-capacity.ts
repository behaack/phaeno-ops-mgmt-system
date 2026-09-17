import { compareSampleIds } from '#/features/sample-shipping/sample-tube-order'
import type { LabSample, LabServiceOrder } from '#/api/order-management'

type SampleSourceOrder = Pick<LabServiceOrder, 'sourceGroups' | 'samples'>

export function normalizeBiologicalSource(source: string) {
  return source.trim().toLowerCase()
}

export function getSampleSourceGroups(order: SampleSourceOrder): Array<{
  id: string
  biologicalSource: string
  specimenCount: number
  samples: LabSample[]
}> {
  return order.sourceGroups.map(group => ({
    id: group.id,
    biologicalSource: group.biologicalSource,
    specimenCount: group.specimenCount,
    samples: order.samples.filter(sample => normalizeBiologicalSource(sample.biologicalSource) === normalizeBiologicalSource(group.biologicalSource)),
  }))
}

export function getSampleSourceAvailability(order: SampleSourceOrder, editing?: LabSample | null) {
  return getSampleSourceGroups(order).map(group => ({
    ...group,
    remaining: Math.max(0, group.specimenCount - group.samples.filter(sample => sample.id !== editing?.id).length),
    isOriginalSource: Boolean(editing && normalizeBiologicalSource(editing.biologicalSource) === normalizeBiologicalSource(group.biologicalSource)),
  }))
}

export function getSampleSourceCapacityError(order: SampleSourceOrder, biologicalSource: string, editing?: LabSample | null): string | null {
  const normalized = normalizeBiologicalSource(biologicalSource)
  // Existing unknown or overfull entries must remain editable for repair.
  if (editing && normalized === normalizeBiologicalSource(editing.biologicalSource)) return null
  const group = getSampleSourceAvailability(order, editing).find(item => normalizeBiologicalSource(item.biologicalSource) === normalized)
  if (!group) return 'Select a biological source accepted with this Job.'
  return group.remaining > 0 ? null : `${group.biologicalSource} is full (${group.samples.length} of ${group.specimenCount} samples). Choose a source with room for another sample.`
}

/** Readiness is based on the entire accepted roster, never the visible page. */
export function hasCompleteSampleIdentification(order: SampleSourceOrder & Pick<LabServiceOrder, 'requestedSpecimenCount'>) {
  if (!order.sourceGroups?.length || order.requestedSpecimenCount < 1 || order.samples.length !== order.requestedSpecimenCount) return false
  const ids = order.samples.map(sample => sample.customerSampleId.trim().toUpperCase())
  return ids.every(Boolean) && new Set(ids).size === ids.length
    && order.samples.every(sample => Number.isSafeInteger(sample.quantity) && sample.quantity > 0)
    && order.sourceGroups.reduce((total, group) => total + group.specimenCount, 0) === order.requestedSpecimenCount
    && getSampleSourceGroups(order).every(group => group.samples.length === group.specimenCount)
}

export function groupSampleRows(order: LabServiceOrder) {
  const accepted = getSampleSourceGroups(order).map(group => ({ ...group, unmatched: false }))
  const acceptedSources = new Set(accepted.map(group => normalizeBiologicalSource(group.biologicalSource)))
  const unmatched = new Map<string, typeof accepted[number]>()
  for (const sample of order.samples) {
    const source = normalizeBiologicalSource(sample.biologicalSource)
    if (acceptedSources.has(source)) continue
    let group = unmatched.get(source)
    if (!group) {
      group = { id: `unmatched-${source}`, biologicalSource: sample.biologicalSource, specimenCount: 0, samples: [], unmatched: true }
      unmatched.set(source, group)
    }
    group.samples.push(sample)
  }
  return [...accepted, ...unmatched.values()].map(group => ({
    ...group,
    samples: [...group.samples].sort((first, second) => compareSampleIds(first.customerSampleId, second.customerSampleId)),
  }))
}
