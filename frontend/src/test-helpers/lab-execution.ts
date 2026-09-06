import type { LabExecutionDetail, LabExecutionStep } from '#/api/lab-operations'

export const executionId = '11111111-1111-4111-8111-111111111111'
export const executionWorkId = '22222222-2222-4222-8222-222222222222'
export const recordingUserId = '33333333-3333-4333-8333-333333333333'

const step = (key: string, name: string): LabExecutionStep => ({
  definition: { key, name, instructions: 'Follow the approved bench procedure and record the observed evidence.', required: true, repeatable: false, operatorConfirmation: true, requiredRole: 'Operator', captures: [], inputMaterials: [], preparedOutputs: [], equipmentTypes: [] },
  records: [], completionBlocker: `${name}: record the step or an allowed skip decision.`, canRecord: false, canRepeat: false, canCorrect: false, actionBlocker: null,
})

export function labExecutionFixture(): LabExecutionDetail {
  const identity = step('identity', 'Verify sample identity')
  identity.definition.captures = [{ key: 'barcode', label: 'Source barcode', type: 'barcode', required: true }]
  const qc = step('qc', 'Review library QC')
  qc.definition.requiredRole = 'Supervisor'
  qc.definition.repeatable = true
  qc.definition.operatorConfirmation = false
  qc.definition.qcGate = { criteria: 'Compare the measured concentration with the approved acceptance criteria.', outcomes: ['pass', 'fail', 'hold'] }
  qc.definition.captures = [
    { key: 'concentration', label: 'Library concentration', type: 'number', required: true, unit: 'ng/µL' },
    { key: 'measured', label: 'Measurement date', type: 'date', required: true },
    { key: 'method', label: 'Measurement method', type: 'choice', required: true, options: ['Fluorometry', 'Approved alternate'] },
    { key: 'file', label: 'QC file reference', type: 'fileReference', required: true },
    { key: 'note', label: 'Observation', type: 'text', required: false },
  ]
  const optional = step('additional-review', 'Additional review')
  optional.definition.required = false
  optional.definition.condition = 'When the supervisor requests an additional review.'
  return {
    execution: { id: executionId, labSpecimenId: 'specimen', labProtocolVersionId: 'protocol-version', assignedToUserId: recordingUserId, status: 'Planned', capturedResultsJson: '{}', deviationNote: null, startedAtUtc: null, completedAtUtc: null, version: 1, labServiceWorkflowStageId: 'workflow-stage' },
    workOrderId: executionWorkId, protocolName: 'Synthetic library preparation', protocolVersion: 2, accessionNumber: 'TRAINING-001', steps: [identity, qc, optional],
    recorders: [{ id: recordingUserId, name: 'Training Operator' }], materialUse: [], equipmentUse: [], completionBlockers: [identity.completionBlocker!, qc.completionBlocker!, optional.completionBlocker!], recoveryMessage: null, canOperate: true, canAbandon: true,
  }
}
