import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import type { Quote } from '#/api/order-management'

export function QuoteTurnaround({ quote }: { quote: Quote }) {
  const __customerText = useCustomerText()

  const phases = readQuotePhases(quote)
  if (phases.length > 1) return <section className="mt-3 rounded-md border bg-muted/40 p-3 text-sm" aria-label={__customerText('m_6c7e92b69c46')}><p className="font-medium"><CustomerText message="m_705ff0516a95" /></p><ul className="mt-2 space-y-1">{phases.map((phase, index) => <li key={index}>{phase.name}: {phase.turnaroundBusinessDays} <CustomerText message="m_8535a9ce1abc" />{phase.sampleCount} <CustomerText message="m_686dd98cc6fc" /></li>)}</ul><p className="mt-2"><CustomerText message="m_17c3cfa63195" /></p></section>
  return quote.deliveryTargetBusinessDays ? <p className="mt-3 rounded-md border bg-muted/40 p-3 text-sm"><strong><CustomerText message="m_d5b76e17a87c" />{quote.deliveryTargetBusinessDays} <CustomerText message="m_678280fdac01" /></strong> <CustomerText message="m_945e47816898" /></p> : null
}
export function readQuotePhases(quote: Quote): Array<{ name: string; sampleCount: number; turnaroundBusinessDays: number }> {
  if (!quote.phasePlanSnapshotJson) return []
  try { const phases: unknown = JSON.parse(quote.phasePlanSnapshotJson); return Array.isArray(phases) ? phases.filter((phase): phase is { name: string; sampleCount: number; turnaroundBusinessDays: number } => Boolean(phase && typeof phase.name === 'string' && Number.isInteger(phase.sampleCount) && Number.isInteger(phase.turnaroundBusinessDays))) : [] } catch { return [] }
}
