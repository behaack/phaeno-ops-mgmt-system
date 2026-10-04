import { z } from 'zod'

export const trialSourceRow = z.object({ biologicalSource: z.string().trim().max(500), specimenCount: z.number().int('Use a whole number.').min(1, 'Enter at least one sample.').nullable() })
export const sourceKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()
export function validateTrialSources(sources: z.infer<typeof trialSourceRow>[], context: z.RefinementCtx, complete: boolean) {
  if (complete && !sources.length) context.addIssue({ code: 'custom', path: ['sources'], message: 'Add at least one biological source and quantity.' })
  if (sources.reduce((total, source) => total + (source.specimenCount ?? 0), 0) > 2147483647) context.addIssue({ code: 'custom', path: ['sources'], message: 'The total sample quantity is too large.' })
  const seen = new Set<string>()
  sources.forEach((source, index) => {
    const key = sourceKey(source.biologicalSource)
    if (complete && !key) context.addIssue({ code: 'custom', path: ['sources', index, 'biologicalSource'], message: 'Enter a biological source.' })
    if (complete && source.specimenCount === null) context.addIssue({ code: 'custom', path: ['sources', index, 'specimenCount'], message: 'Enter at least one sample.' })
    if (key && seen.has(key)) context.addIssue({ code: 'custom', path: ['sources', index, 'biologicalSource'], message: 'Use a distinct biological source.' })
    seen.add(key)
  })
}
