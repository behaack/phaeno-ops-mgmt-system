import { z } from 'zod'
import type { Quote } from '#/api/order-management'

const lineSchema = z.object({
  description: z.string(), quantity: z.number().finite().positive(), unitPrice: z.number().finite().nonnegative(),
  catalogItemId: z.string().optional(), phaseId: z.string().nullable().optional(), pricingComponent: z.string().nullable().optional(),
})
const phaseSchema = z.object({
  id: z.string().min(1), position: z.number().int().positive(), name: z.string(),
  sampleCount: z.number().int().nonnegative(), turnaroundBusinessDays: z.number().int().positive(),
  acceptedSubtotal: z.number().finite().nonnegative(),
  scope: z.object({
    sources: z.array(z.object({ biologicalSource: z.string(), specimenCount: z.number().int().nonnegative() })),
    runsPerSample: z.number().int().positive().nullable(), sequencingRunCount: z.number().int().nonnegative(),
  }).nullable().optional(),
})
export type QuoteReviewLine = z.infer<typeof lineSchema>
export type QuoteReviewPhase = z.infer<typeof phaseSchema> & { lines: QuoteReviewLine[] }

export function readQuoteLines(json: string): QuoteReviewLine[] {
  try { return z.array(lineSchema).parse(JSON.parse(json)) } catch { return [] }
}

export function readQuoteService(quote: Quote): { name: string; quantity: number } | null {
  const services = new Map<string, { name: string; quantity: number }>()
  for (const line of readQuoteLines(quote.linesJson)) {
    if (line.pricingComponent === 'AdditionalRun') continue
    const name = (line.catalogItemId ? quote.catalogItemNames?.[line.catalogItemId] : undefined) ?? line.description
    const id = line.catalogItemId ?? name
    services.set(id, { name, quantity: (services.get(id)?.quantity ?? 0) + line.quantity })
  }
  // An ambiguous quote must keep its charges without advertising a guessed service.
  return services.size === 1 ? [...services.values()][0] : null
}

export function readPhaseRunBreakdown(phase: QuoteReviewPhase): { includedRuns: number; additionalRuns: number; additionalRunsPerSample: number | null } | null {
  if (!phase.scope || phase.sampleCount === 0) return null
  const includedRuns = phase.lines.filter(line => line.pricingComponent === 'StandardSample').reduce((total, line) => total + line.quantity, 0)
  const additionalRuns = phase.lines.filter(line => line.pricingComponent === 'AdditionalRun').reduce((total, line) => total + line.quantity, 0)
  const { sequencingRunCount, runsPerSample } = phase.scope
  // Explain only a breakdown supported by both the frozen scope and quoted quantities.
  if (includedRuns !== phase.sampleCount || includedRuns + additionalRuns !== sequencingRunCount
    || (runsPerSample !== null && phase.sampleCount * runsPerSample !== sequencingRunCount)) return null
  return { includedRuns, additionalRuns, additionalRunsPerSample: runsPerSample === null ? null : runsPerSample - 1 }
}

export function readQuotePhaseReview(quote: Quote): QuoteReviewPhase[] {
  if (!quote.phasePlanSnapshotJson) return []
  try {
    const phases = z.array(phaseSchema).min(2).parse(JSON.parse(quote.phasePlanSnapshotJson))
    const ids = new Set(phases.map(phase => phase.id))
    const lines = readQuoteLines(quote.linesJson)
    // Only pair prices with scope when every line has an exact frozen phase identity.
    if (ids.size !== phases.length || !lines.length || lines.some(line => !line.phaseId || !ids.has(line.phaseId))) return []
    const grouped = new Map(phases.map(phase => [phase.id, [] as QuoteReviewLine[]]))
    for (const line of lines) grouped.get(line.phaseId!)!.push(line)
    const componentOrder = (line: QuoteReviewLine) => line.pricingComponent === 'StandardSample' ? 0 : line.pricingComponent === 'AdditionalRun' ? 1 : 2
    return phases.sort((left, right) => left.position - right.position).map(phase => ({ ...phase,
      lines: grouped.get(phase.id)!.sort((left, right) => componentOrder(left) - componentOrder(right)) }))
  } catch { return [] }
}
