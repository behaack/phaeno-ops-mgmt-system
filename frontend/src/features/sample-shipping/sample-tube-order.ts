import type { SampleShippingCrosswalkItem } from '#/api/sample-shipping'

// Sample IDs are identifiers: compare digits as text, not numeric quantities.
const sampleIdCollator = new Intl.Collator('en-US', { numeric: false, sensitivity: 'base' })
export function compareSampleIds(first: string, second: string) {
  return sampleIdCollator.compare(first, second)
}

export function orderedSampleTubes(items: SampleShippingCrosswalkItem[], sampleOrder?: string[]) {
  const ranks = new Map(sampleOrder?.map((id, index) => [id, index]))
  return [...items].sort((first, second) =>
    (ranks.get(first.submittedSpecimenId) ?? Number.MAX_SAFE_INTEGER) - (ranks.get(second.submittedSpecimenId) ?? Number.MAX_SAFE_INTEGER)
    || compareSampleIds(first.customerSampleId, second.customerSampleId)
    || (first.tubeOrdinal ?? 1) - (second.tubeOrdinal ?? 1)
    || (first.tubeSlotId ?? first.shipmentItemId).localeCompare(second.tubeSlotId ?? second.shipmentItemId))
}
