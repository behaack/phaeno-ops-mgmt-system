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
