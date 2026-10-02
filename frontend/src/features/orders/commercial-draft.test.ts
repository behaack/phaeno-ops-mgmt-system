import { describe, expect, it } from 'vitest'
import { commercialDraftSchema, draftTotals, newDraftPhase, submissionIssues, type CommercialDraftForm } from './commercial-draft'

function incompleteDraft(): CommercialDraftForm {
  return { jobName: 'Study', sampleTypeDefinitionId: null, storageRequirements: '', safetyDeclaration: '', notes: '', usesPhases: false, phases: [newDraftPhase(1)] }
}

describe('commercial Draft scope', () => {
  it('allows incomplete save while identifying fields needed for pricing', () => {
    const draft = incompleteDraft()
    expect(commercialDraftSchema.safeParse(draft).success).toBe(true)
    expect(submissionIssues(draft).map(issue => issue.path)).toEqual(expect.arrayContaining([
      'catalogItemId', 'sampleTypeDefinitionId', 'storageRequirements', 'safetyDeclaration', 'phases.0.sources.0.biologicalSource',
    ]))
  })

  it('totals phases with different run counts and leaves partial proposals explicit', () => {
    const first = { ...newDraftPhase(1), sources: [{ biologicalSource: 'Human PBMC', specimenCount: 2 }], proposePrice: true, proposedUnitPrice: 12.5 }
    const second = { ...newDraftPhase(2), sources: [{ biologicalSource: 'Human PBMC', specimenCount: 3 }], runsPerSample: 3 }
    expect(draftTotals({ phases: [first, second] })).toEqual({ samples: 5, runs: 11, proposed: 25, pricedPhases: 1 })
    expect(draftTotals({ phases: [first, { ...second, proposePrice: true, proposedUnitPrice: 20 }] }).pricedPhases).toBe(1)
    expect(draftTotals({ phases: [first, { ...second, proposePrice: true, proposedUnitPrice: 20, proposedAdditionalRunPrice: 5 }] }).proposed).toBe(115)
  })

  it('retains Sample type storage mode and distinguishes an unfinished override', () => {
    const draft: CommercialDraftForm = { ...incompleteDraft(), catalogItemId: '00000000-0000-4000-8000-000000000010', sampleTypeDefinitionId: 'type', storageRequirements: null, safetyDeclaration: 'No known hazards',
      phases: [{ ...newDraftPhase(1), sources: [{ biologicalSource: 'Human PBMC', specimenCount: 1 }] }] }
    expect(commercialDraftSchema.parse(draft).storageRequirements).toBeNull()
    expect(submissionIssues(draft)).toEqual([])
    draft.storageRequirements = ''
    expect(commercialDraftSchema.safeParse(draft).success).toBe(true)
    expect(submissionIssues(draft).map(issue => issue.path)).toContain('storageRequirements')
    draft.storageRequirements = 'Store at 4 °C for this study.'
    expect(submissionIssues(draft)).toEqual([])
  })

  it('accepts the same source across phases and rejects duplicates within one phase', () => {
    const draft = { ...incompleteDraft(), catalogItemId: '00000000-0000-4000-8000-000000000010', sampleTypeDefinitionId: 'type', storageRequirements: 'Frozen', safetyDeclaration: 'No known hazards', usesPhases: true,
      phases: [1, 2].map(position => ({ ...newDraftPhase(position), sources: [{ biologicalSource: 'Human PBMC', specimenCount: 2 }] })) }
    expect(submissionIssues(draft)).toEqual([])
    draft.phases[0].sources.push({ biologicalSource: ' human pbmc ', specimenCount: 1 })
    expect(submissionIssues(draft).map(issue => issue.path)).toContain('phases.0.sources.1.biologicalSource')
  })

  it('blocks an unfinished enabled proposal and excessive purchased runs', () => {
    const draft = incompleteDraft()
    draft.phases[0].proposePrice = true
    expect(submissionIssues(draft).map(issue => issue.path)).toContain('phases.0.proposedUnitPrice')
    draft.phases[0].proposedUnitPrice = 100
    draft.phases[0].runsPerSample = 3
    expect(submissionIssues(draft).map(issue => issue.path)).toContain('phases.0.proposedAdditionalRunPrice')
    draft.phases[0].proposedAdditionalRunPrice = 20
    expect(submissionIssues(draft).map(issue => issue.path)).not.toContain('phases.0.proposedAdditionalRunPrice')
    draft.phases[0].sources[0].specimenCount = 10000
    draft.phases[0].runsPerSample = 2
    expect(commercialDraftSchema.safeParse(draft).success).toBe(false)
  })
})
