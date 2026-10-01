import { describe, expect, it } from 'vitest'
import { customerDraftPayload, customerDraftSchema, customerDraftValues, mergeCustomerDraft } from './customer-standard-order-form'

describe('Customer standard order Draft', () => {
  it('preserves source rows as a whole when another editor reorders them', () => {
    const baseline = { ...customerDraftValues(), sources: [{ biologicalSource: 'Human', specimenCount: 1 }, { biologicalSource: 'Mouse', specimenCount: 2 }] }
    const entered = { ...baseline, sources: [{ biologicalSource: 'Human', specimenCount: 3 }, baseline.sources[1]] }
    const latest = { ...baseline, jobName: 'Server Job', sources: [...baseline.sources].reverse() }
    expect(mergeCustomerDraft(baseline, entered, latest)).toMatchObject({ jobName: 'Server Job', sources: entered.sources })
  })
  it('retains an incomplete scope and uses the Sample type storage default', () => {
    const parsed = customerDraftSchema.parse({ ...customerDraftValues(), jobName: 'Study', sources: [{ biologicalSource: '', specimenCount: 0 }] })
    const payload = customerDraftPayload(parsed)
    expect(payload).toMatchObject({ jobName: 'Study', offeringId: null, sampleTypeDefinitionId: null, storageRequirements: null, sources: [{ biologicalSource: '', specimenCount: 0 }] })
    expect(payload).not.toHaveProperty('usesPhases')
    expect(payload).not.toHaveProperty('sequencingRunCount')
    expect(payload).not.toHaveProperty('proposedUnitPrice')
  })
  it('preserves a storage exception and multiple source quantities across reopening', () => {
    const draft = { jobName: 'Study', offeringId: 'service', sampleTypeDefinitionId: 'sample-type', sources: [{ biologicalSource: 'Human PBMC', specimenCount: 4 }, { biologicalSource: 'Mouse liver', specimenCount: 2 }], storageRequirements: 'Frozen; do not thaw', safetyDeclaration: 'No known hazards', notes: 'Study notes' }
    expect(customerDraftPayload(customerDraftSchema.parse(customerDraftValues(draft)))).toEqual(draft)
  })
})
