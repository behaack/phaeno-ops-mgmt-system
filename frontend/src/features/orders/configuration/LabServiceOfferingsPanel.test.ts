import { describe, expect, it } from 'vitest'
import { offeringSchema } from './LabServiceOfferingsPanel'

const definition = {
  name: 'PSeq Lab Service',
  description: 'Configured scientific scope',
  catalogItemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  analysisIds: ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
  allowedMaterialTypes: 'extracted_rna',
  supportedSampleTypeIds: [],
  availabilityOnly: false,
  allowedBiologicalSources: 'Human PBMC',
  includedOutputContract: 'Reviewed results',
  minimumTurnaroundDays: 7,
  maximumTurnaroundDays: 14,
  effectiveFrom: '2026-09-18',
  effectiveTo: '',
  isActive: false,
  isSynthetic: false,
}

describe('scientific definition sample scope', () => {
  it('requires explicit sample revisions even when material text is present', () => {
    const result = offeringSchema.safeParse(definition)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(issue => issue.path[0] === 'supportedSampleTypeIds')).toBe(true)
    expect(offeringSchema.safeParse({ ...definition, supportedSampleTypeIds: ['cccccccc-cccc-4ccc-8ccc-cccccccccccc'] }).success).toBe(true)
  })

  it('allows staff to withdraw legacy availability without inventing assignments', () => {
    expect(offeringSchema.safeParse({ ...definition, availabilityOnly: true }).success).toBe(true)
  })
})
