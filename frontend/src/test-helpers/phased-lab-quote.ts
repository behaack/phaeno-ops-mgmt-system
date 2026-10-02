import type { Quote } from '#/api/order-management'
import { bundleLabDraft } from './bundled-orders'

// Synthetic quote snapshots for scope/pricing presentation checks. No API writes.
export const phaseQuoteSnapshot = [
  { id: 'phase-1', position: 1, name: 'Phase 1', sampleCount: 5, turnaroundBusinessDays: 14, acceptedSubtotal: 4750,
    scope: { sources: [{ biologicalSource: 'Heart tissue', specimenCount: 2 }, { biologicalSource: 'Liver tissue', specimenCount: 3 }], runsPerSample: 1, sequencingRunCount: 5 } },
  { id: 'phase-2', position: 2, name: 'Phase 2', sampleCount: 5, turnaroundBusinessDays: 21, acceptedSubtotal: 5250,
    scope: { sources: [{ biologicalSource: 'Brain tissue', specimenCount: 5 }], runsPerSample: 2, sequencingRunCount: 10 } },
]
export const phaseQuoteLines = [
  { catalogItemId: 'catalog-rna', phaseId: 'phase-2', pricingComponent: 'AdditionalRun', description: 'Additional sequencing runs from the prepared library', quantity: 5, unitPrice: 100 },
  { catalogItemId: 'catalog-rna', phaseId: 'phase-1', pricingComponent: 'StandardSample', description: 'Standard sample service (library preparation, one run and data assembly)', quantity: 5, unitPrice: 950 },
  { catalogItemId: 'catalog-rna', phaseId: 'phase-2', pricingComponent: 'StandardSample', description: 'Standard sample service (library preparation, one run and data assembly)', quantity: 5, unitPrice: 950 },
]
export const phasedLabQuote: Quote = {
  id: 'synthetic-quote', revision: 1, status: 'Issued', purpose: 'Initial', version: 1,
  issuedAt: '2026-10-01T12:00:00Z', expiresAt: '2099-10-31T12:00:00Z', acceptedAt: null,
  linesJson: JSON.stringify(phaseQuoteLines), phasePlanSnapshotJson: JSON.stringify(phaseQuoteSnapshot),
  catalogItemNames: { 'catalog-rna': 'PSeq RNA Sequencing' },
  subtotal: 10000, tax: 0, total: 10000, currency: 'USD', taxDecisionSnapshotJson: '{}', pricingDecision: 'PricedWithoutProposal',
}
export const phasedLabOrder = { ...bundleLabDraft, requestedSpecimenCount: 10, requestedSequencingRunCount: 15,
  description: 'Handle according to the recorded Sample type requirements.', sampleTypeName: 'Synthetic sample type',
  quotes: [phasedLabQuote], sourceGroups: [{ id: 'current-source', biologicalSource: 'Current source after a later amendment', specimenCount: 10, version: 2 }],
}
