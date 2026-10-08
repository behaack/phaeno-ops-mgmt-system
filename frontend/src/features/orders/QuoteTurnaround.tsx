import type { Quote } from '#/api/order-management'

export function QuoteTurnaround({ quote }: { quote: Quote }) {
  const phases = readQuotePhases(quote)
  if (phases.length > 1) return <section className="mt-3 rounded-md border bg-muted/40 p-3 text-sm" aria-label="Quoted phase turnaround"><p className="font-medium">Turnaround by phase</p><ul className="mt-2 space-y-1">{phases.map((phase, index) => <li key={index}>{phase.name}: {phase.turnaroundBusinessDays} business days · {phase.sampleCount} samples</li>)}</ul><p className="mt-2">Each target starts when Phaeno physically receives every required sample for that phase. Business days exclude Phaeno holidays.</p></section>
  return quote.deliveryTargetBusinessDays ? <p className="mt-3 rounded-md border bg-muted/40 p-3 text-sm"><strong>Delivery target: {quote.deliveryTargetBusinessDays} business days</strong> after Phaeno physically receives every required tube for all samples. Business days exclude Phaeno holidays.</p> : null
}
export function readQuotePhases(quote: Quote): Array<{ name: string; sampleCount: number; turnaroundBusinessDays: number }> {
  if (!quote.phasePlanSnapshotJson) return []
  try { const phases: unknown = JSON.parse(quote.phasePlanSnapshotJson); return Array.isArray(phases) ? phases.filter((phase): phase is { name: string; sampleCount: number; turnaroundBusinessDays: number } => Boolean(phase && typeof phase.name === 'string' && Number.isInteger(phase.sampleCount) && Number.isInteger(phase.turnaroundBusinessDays))) : [] } catch { return [] }
}
