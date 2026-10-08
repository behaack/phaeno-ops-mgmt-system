import type { PreparationDetail } from '#/api/lab-preparation'
export const preparationFixture = (): PreparationDetail => ({
  id: '11111111-1111-4111-8111-111111111111', name: 'TEST ONLY — mixed preparation tray', version: 4, status: 'InProgress', startedAtUtc: '2026-09-11T20:00:00Z', completedAtUtc: null,
  layout: { name: 'Small tray', rows: 2, columns: 3, labels: 'grid', unavailable: ['B3'] }, labServiceWorkflowVersionId: 'workflow', canOperate: true, canCorrect: true, roles: ['Operator', 'Supervisor'], records: [],
  stages: [{ id: 'stage', sequence: 1, name: 'Library preparation', requirement: 'Required', definition: { schemaVersion: 1, preparationBatchEnabled: true, steps: [{ key: 'qc', name: 'Assess preparation', instructions: 'Software fixture only. Record a shared value and any tube exceptions.', required: true, repeatable: true, operatorConfirmation: true, inputMaterials: [], preparedOutputs: [], equipmentTypes: [],
    captures: [{ key: 'temperature', label: 'Temperature', type: 'number', unit: '°C', required: true, scope: 'shared' }], qcGate: { scope: 'shared', criteria: 'Software fixture only: assess each covered tube.', outcomes: ['pass', 'fail', 'hold'] } }] } }],
  members: [0, 1].map(i => ({ id: `member-${i}`, position: `A${i + 1}`, barcode: `TEST-TUBE-${i + 1}`, attemptId: `attempt-${i}`, sequence: 1, workOrderId: `job-${i}`, jobName: `TEST-JOB-${i + 1}`, specimenId: `specimen-${i}`, specimenName: `TEST-SPECIMEN-${i + 1}`, state: 'InProgress', failureEvidence: null, blocker: null, stageSkips: [], output: null, library: null,
    executions: [{ id: `execution-${i}`, stageId: 'stage', status: 'InProgress', evidence: { records: [] }, blockers: ['Assess preparation: record evidence.'] }] })),
})
