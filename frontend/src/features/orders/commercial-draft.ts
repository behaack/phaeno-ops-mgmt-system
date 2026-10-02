import { z } from 'zod'
import { sampleServicePricing } from './sample-service-pricing'

export const commercialDraftSchema = z.object({
  jobName: z.string().trim().min(1, 'Enter a Job name before saving.').max(255),
  sampleTypeDefinitionId: z.string().nullable(),
  catalogItemId: z.string().uuid('Select an available catalog service.').nullable().optional(),
  storageRequirements: z.string().max(2000).nullable(), safetyDeclaration: z.string().max(2000), notes: z.string().max(2000),
  usesPhases: z.boolean(),
  phases: z.array(z.object({
    name: z.string().max(150),
    sources: z.array(z.object({ biologicalSource: z.string().max(500), specimenCount: z.number().int().min(0).max(10000) })).max(100),
    runsPerSample: z.number().int().min(1).max(10000).nullable(),
    turnaroundBusinessDays: z.number().int().min(1).max(365).nullable(),
    proposePrice: z.boolean(), proposedUnitPrice: z.number().positive().multipleOf(0.01).nullable(),
    proposedAdditionalRunPrice: z.number().positive().multipleOf(0.01).nullable(), pricingNote: z.string().max(1000),
  })).min(1).max(100),
}).superRefine((draft, context) => {
  if (draft.usesPhases ? draft.phases.length < 2 : draft.phases.length !== 1) context.addIssue({ code: 'custom', path: ['phases'], message: 'Use one scope, or enable phases and choose at least two phases.' })
  const totals = draftTotals(draft)
  if (totals.samples > 10000 || totals.runs > 10000) context.addIssue({ code: 'custom', path: ['phases'], message: 'Use no more than 10,000 samples or sequencing runs per order.' })
})
export type CommercialDraftForm = z.infer<typeof commercialDraftSchema>
export function newDraftPhase(position: number): CommercialDraftForm['phases'][number] {
  return { name: `Phase ${position}`, sources: [{ biologicalSource: '', specimenCount: 1 }], runsPerSample: 1, turnaroundBusinessDays: null, proposePrice: false, proposedUnitPrice: null, proposedAdditionalRunPrice: null, pricingNote: '' }
}
export function phaseTotals(phase: CommercialDraftForm['phases'][number]) {
  const samples = phase.sources.reduce((total, source) => total + (source.specimenCount || 0), 0)
  const runs = samples * (phase.runsPerSample || 0)
  const pricing = sampleServicePricing(samples, runs, phase.proposedUnitPrice, phase.proposedAdditionalRunPrice)
  return { samples, runs, ...pricing, proposed: !phase.proposePrice || phase.runsPerSample === null ? null : pricing.subtotal }
}
export function draftTotals(draft: Pick<CommercialDraftForm, 'phases'>) {
  return draft.phases.reduce((total, phase) => { const scope = phaseTotals(phase); return {
    samples: total.samples + scope.samples, runs: total.runs + scope.runs, proposed: total.proposed + (scope.proposed ?? 0), pricedPhases: total.pricedPhases + Number(scope.proposed !== null),
  } }, { samples: 0, runs: 0, proposed: 0, pricedPhases: 0 })
}
export function submissionIssues(draft: CommercialDraftForm): Array<{ path: string; message: string }> {
  const issues: Array<{ path: string; message: string }> = []
  if (!draft.catalogItemId) issues.push({ path: 'catalogItemId', message: 'Select a catalog service before submitting for pricing.' })
  if (!draft.sampleTypeDefinitionId) issues.push({ path: 'sampleTypeDefinitionId', message: 'Select a Sample type before submitting for pricing.' })
  if (draft.storageRequirements !== null && !draft.storageRequirements.trim()) issues.push({ path: 'storageRequirements', message: 'Enter the different storage requirements, or use the Sample type requirements.' })
  if (!draft.safetyDeclaration.trim()) issues.push({ path: 'safetyDeclaration', message: 'Enter the safety declaration.' })
  const names = new Set<string>()
  draft.phases.forEach((phase, index) => {
    const name = phase.name.trim().toLocaleLowerCase()
    if (!name || names.has(name)) issues.push({ path: `phases.${index}.name`, message: 'Enter a distinct phase name.' })
    names.add(name)
    if (!phase.runsPerSample) issues.push({ path: `phases.${index}.runsPerSample`, message: 'Enter runs per sample.' })
    if (phase.proposePrice && phase.proposedUnitPrice === null) issues.push({ path: `phases.${index}.proposedUnitPrice`, message: 'Enter the proposed price per sample, or clear Propose a price.' })
    if (phase.proposePrice && (phase.runsPerSample ?? 0) > 1 && phase.proposedAdditionalRunPrice === null) issues.push({ path: `phases.${index}.proposedAdditionalRunPrice`, message: 'Enter the price per additional sequencing run.' })
    if (!phase.sources.length) issues.push({ path: `phases.${index}.sources`, message: 'Add at least one biological source.' })
    const sources = new Set<string>()
    phase.sources.forEach((source, sourceIndex) => {
      const normalized = source.biologicalSource.trim().toLocaleLowerCase()
      if (!normalized || sources.has(normalized)) issues.push({ path: `phases.${index}.sources.${sourceIndex}.biologicalSource`, message: 'Enter a distinct biological source within this phase.' })
      sources.add(normalized)
      if (source.specimenCount < 1) issues.push({ path: `phases.${index}.sources.${sourceIndex}.specimenCount`, message: 'Enter a positive sample count.' })
    })
  })
  return issues
}
