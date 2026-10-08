import type { LabPhasePlan } from '#/api/lab-phases'
import type { LabSample, LabSampleTubeWorkspace } from '#/api/order-management'
import { phasedLabOrder, phaseQuoteSnapshot } from './phased-lab-quote'
import { shippingFixture, shippingTube } from './sample-shipping'

export const shippingPhasePlan: LabPhasePlan = {
  orderId: phasedLabOrder.id, revision: 1, sampleCount: 10, acceptedSubtotal: 9500, currency: 'USD', samples: [], proposals: [], cancellations: [],
  phases: [1, 2].map(position => ({
    id: `phase-${position}`, position, name: `Phase ${position}`, sampleCount: 5, turnaroundBusinessDays: 14,
    acceptedSubtotal: 4750, carriedInvoicedSubtotal: 0, invoicedSubtotal: 0, lifecycle: 'Planned',
    mixedProgress: false, stageCounts: { AwaitingReceipt: 5 }, heldSamples: 0, failedSamples: 0,
    containerCount: 0, sentContainers: 0, arrivedContainers: 0, expectedTubes: 5, receivedTubes: 0, accessionedTubes: 0,
    deliveredSamples: 0, firstReceiptAtUtc: null, completeReceiptAtUtc: null, originalDueAtUtc: null, dueAtUtc: null,
    startedAtUtc: null, firstDeliveredAtUtc: null, calendarPending: false, cancellationEligible: true,
    cancellationPending: false, sampleIds: [], priceLinesJson: '[]',
  })),
}

export const emptyPhasePairs: LabSampleTubeWorkspace = {
  pairs: [], kits: [], preparationPhaseIds: ['phase-1', 'phase-2'], preparedPhaseIds: [], preparationSources: [],
  expectedSampleCount: 10, expectedSequencingRunCount: 15, isFinalized: false, minimumSampleAmount: null, sampleAmountUnit: null,
}

const shippingSample: LabSample = {
  id: 'sample', customerSampleId: 'Synthetic sample', materialType: 'RNA', biologicalSource: 'Liver tissue',
  quantity: 100, quantityUnit: 'µL', storageRequirements: 'Keep frozen', safetyDeclaration: 'No known hazards',
  collectionDate: null, concentration: null, notes: null, analysisDefinitionIdsJson: '[]', accessionId: null,
  status: 'AwaitingReceipt', replacementForSampleId: null, receivedAt: null, receiptCondition: null,
  carrier: null, trackingNumber: null, customerShippedAt: null, tenantSafeReason: null, internalNote: null, version: 1,
}
export const phaseShippingOrder = { ...phasedLabOrder, phaseCount: 2, usesPairedPreparation: true, placedAt: '2026-10-01T12:00:00Z',
  samples: [1, 2].flatMap(phase => Array.from({ length: 5 }, (_, index) => ({ ...shippingSample, id: `phase-${phase}-sample-${index + 1}`, phaseId: `phase-${phase}`, customerSampleId: `P${phase}-S${index + 1}`, biologicalSource: phase === 2 ? 'Brain tissue' : index < 2 ? 'Heart tissue' : 'Liver tissue' }))),
}
export const sentPhaseShipment = { ...shippingFixture, authorizationSourceId: phasedLabOrder.id, status: 'Shipped' as const, shippedAt: '2026-10-01T12:00:00Z',
  crosswalk: Array.from({ length: 5 }, (_, index) => shippingTube(index + 1, { submittedSpecimenId: `phase-1-sample-${index + 1}` })),
}
export const shippedPhasePairs = { ...emptyPhasePairs, preparedPhaseIds: ['phase-1'] }

// An accepted single-sample order before any tube or shipment identity exists.
const singleScope = { sources: [{ biologicalSource: 'Human liver', specimenCount: 1 }], runsPerSample: 1, sequencingRunCount: 1 }
export const singleShippingOrder = { ...phaseShippingOrder, phaseCount: 1, requestedSpecimenCount: 1, requestedSequencingRunCount: 1,
  samples: [], sourceGroups: [{ id: 'single-source', biologicalSource: 'Human liver', specimenCount: 1, version: 1 }],
  phaseScopes: [{ ...phaseQuoteSnapshot[0], id: 'phase-1', sampleCount: 1, scope: singleScope, proposedUnitPrice: null, proposedAdditionalRunPrice: null, pricingNote: null }],
}
export const singleShippingPlan: LabPhasePlan = { ...shippingPhasePlan, sampleCount: 1,
  phases: [{ ...shippingPhasePlan.phases[0], sampleCount: 1, expectedTubes: 0, scope: singleScope, stageCounts: { AwaitingReceipt: 1 } }],
}
export const singleShippingPairs = { ...emptyPhasePairs, preparationPhaseIds: ['phase-1'], expectedSampleCount: 1, expectedSequencingRunCount: 1 }
