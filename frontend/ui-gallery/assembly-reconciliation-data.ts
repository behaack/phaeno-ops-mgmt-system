import type { AssemblyDetail } from '#/api/lab-assembly'

/** Fictional data for actual-component keyboard/reflow checks; never a provider or scientific claim. */
export const assemblyReconciliationDetail: AssemblyDetail = {
  job: { id: 'demo-assembly-review', labWorkOrderId: 'demo-work', labSpecimenId: 'demo-sample', sampleName: 'DEMO — Assembly review',
    sequencingRunNumber: 1, state: 'Failed', requestedAtUtc: '2026-10-22T16:00:00Z', startedAtUtc: '2026-10-22T16:00:01.123740Z',
    stoppedAtUtc: '2026-10-22T16:01:00Z', dispositionAtUtc: '2026-10-22T16:01:00Z', durationSeconds: 59,
    isTerminal: true, cancellationRequested: false, dispositionReason: 'Fictional first processing failure',
    attentionReason: 'Conflicting processing evidence requires Operations reconciliation. Saved execution facts remain unchanged.',
    previousJobId: null, retryReason: null, labAnalysisRunId: null, outputsDeclared: false, providerKey: 'demo-provider',
    providerJobId: 'demo-execution', requestedByUserId: 'demo-operator', version: 6, progress: null, simulated: true },
  canOperate: false, canReconcile: true, inputs: [], analyses: [], events: [], delivery: [], simulatedOutputs: [],
  availability: { available: true, message: '', supportsCancellation: true, recipes: [] },
  recipe: { key: 'demo', name: 'Fictional simulated recipe', version: '1', parametersJson: '{}', simulated: true },
  reconciliation: { hasUnresolvedConflict: true, eligible: true, ineligibleReason: null, evidenceFingerprint: 'A'.repeat(64),
    additionalEvidence: [], decisions: [], receipts: [
      { id: 'demo-original', eventId: 'demo-original-failure-event', sequence: 151, outcome: 'Applied', payloadSha256: 'B'.repeat(64),
        conflictSha256: null, occurredAtUtc: '2026-10-22T16:01:00Z', receivedAtUtc: '2026-10-22T16:01:00Z', state: 'Failed',
        providerJobId: 'demo-execution', startedAtUtc: '2026-10-22T16:00:01.123740Z', stoppedAtUtc: '2026-10-22T16:01:00Z',
        dispositionAtUtc: '2026-10-22T16:01:00Z', reason: 'Fictional first processing failure' },
      { id: 'demo-conflict', eventId: 'demo-conflicting-failure-event', sequence: 305, outcome: 'Conflict', payloadSha256: 'C'.repeat(64),
        conflictSha256: null, occurredAtUtc: '2026-10-22T16:02:10Z', receivedAtUtc: '2026-10-22T16:02:10Z', state: 'Failed',
        providerJobId: 'demo-execution', startedAtUtc: '2026-10-22T16:00:01Z', stoppedAtUtc: '2026-10-22T16:02:10Z',
        dispositionAtUtc: '2026-10-22T16:02:10Z', reason: 'Fictional conflicting processing failure' },
    ] },
}
