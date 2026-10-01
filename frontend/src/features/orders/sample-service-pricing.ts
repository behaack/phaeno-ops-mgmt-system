/** One standard service per sample; later runs reuse its prepared library. */
export function sampleServicePricing(samples: number, totalRuns: number, samplePrice: number | null | undefined, additionalRunPrice: number | null | undefined) {
  const additionalRuns = Math.max(0, totalRuns - samples)
  const standardSubtotal = samplePrice == null ? null : Math.round(samples * samplePrice * 100) / 100
  const additionalSubtotal = additionalRuns === 0 ? 0 : additionalRunPrice == null ? null : Math.round(additionalRuns * additionalRunPrice * 100) / 100
  return { additionalRuns, standardSubtotal, additionalSubtotal,
    subtotal: standardSubtotal === null || additionalSubtotal === null ? null : Math.round((standardSubtotal + additionalSubtotal) * 100) / 100 }
}
