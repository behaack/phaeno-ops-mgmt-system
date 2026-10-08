import { describe, expect, it } from 'vitest'
import type { PreparationDetail, PreparationMember, PreparationStage } from '#/api/lab-preparation'
import { preparationProgress, preparationWorkflowProgress } from './preparation-progress'

const member = (overrides: Partial<PreparationMember> = {}): PreparationMember => ({ id: 'member', position: 'A1', barcode: 'TUBE', attemptId: 'attempt', sequence: 1, workOrderId: 'job', jobName: 'JOB', specimenId: 'specimen', specimenName: 'Sample', state: 'Planned', failureEvidence: null, blocker: null, stageSkips: [], executions: [], output: null, library: null, ...overrides })
const batch = (overrides: Partial<PreparationDetail> = {}): PreparationDetail => ({ id: 'batch', name: 'Batch', status: 'Draft', version: 1, startedAtUtc: null, completedAtUtc: null, layout: { name: 'Tray', rows: 1, columns: 2, labels: 'grid', unavailable: [] }, labServiceWorkflowVersionId: 'workflow', members: [], stages: [], records: [], canOperate: true, canCorrect: false, roles: ['Operator'], ...overrides })
const passing = member({ state: 'Succeeded', library: { id: 'library', libraryKey: 'LIB', status: 'QcPassed', sequencing: null } })

const workflowStep = (key: string): PreparationStage['definition']['steps'][number] => ({ key, name: key, instructions: key, required: true, repeatable: true, operatorConfirmation: true, captures: [], inputMaterials: [], preparedOutputs: [], equipmentTypes: [] })
const workflowStages: PreparationStage[] = [
  { id: 'first', name: 'Readiness', sequence: 1, requirement: 'Required', definition: { schemaVersion: 1, steps: [workflowStep('identity'), workflowStep('qc')] } },
  { id: 'second', name: 'Preparation', sequence: 2, requirement: 'Required', definition: { schemaVersion: 1, steps: [workflowStep('identity')] } },
]
const record = (stepKey: string, overrides: Partial<PreparationMember['executions'][number]['evidence']['records'][number]> = {}): PreparationMember['executions'][number]['evidence']['records'][number] => ({ id: stepKey, stepKey, action: 'record', outcome: 'recorded', captures: {}, operatorConfirmed: true, resourcesConfirmed: false, qcOutcome: null, reason: null, recordedByUserId: 'operator', recordedAtUtc: '2026-09-17T12:00:00Z', ...overrides })
const execution = (stageId: string, records: ReturnType<typeof record>[], status = 'InProgress'): PreparationMember['executions'][number] => ({ id: stageId, stageId, status, evidence: { records }, blockers: [] })

describe('workflow step and protocol counts', () => {
  it('counts each configured step and protocol once across all stages and waits for full tube coverage', () => {
    const first = member({ executions: [execution('first', [record('identity'), record('qc')], 'Completed')] })
    const second = member({ id: 'second', executions: [execution('first', [record('identity')])] })
    const data = batch({ stages: workflowStages, members: [first, second] })
    expect(preparationWorkflowProgress(data)).toEqual({ completedSteps: 1, totalSteps: 3, completedProtocols: 0, totalProtocols: 2 })
    second.executions[0].evidence.records.push(record('qc'))
    expect(preparationWorkflowProgress(data).completedSteps).toBe(2)
    expect(preparationWorkflowProgress(data).completedProtocols).toBe(0)
    second.executions[0].status = 'Completed'
    expect(preparationWorkflowProgress(data).completedProtocols).toBe(1)
  })

  it('keeps QC holds and stale downstream evidence incomplete until resolved', () => {
    const stages = [{ ...workflowStages[0], definition: { ...workflowStages[0].definition, steps: [workflowStep('identity'), { ...workflowStep('qc'), qcGate: { scope: 'tube' as const, criteria: 'Pass', outcomes: ['pass', 'fail', 'hold'] as ['pass', 'fail', 'hold'] } }] } }]
    const tube = member({ executions: [execution('first', [record('identity'), record('qc', { qcOutcome: 'hold', reason: 'Review' })])] })
    const data = batch({ stages, members: [tube] })
    expect(preparationWorkflowProgress(data).completedSteps).toBe(1)
    tube.executions[0].evidence.records.push(record('qc', { action: 'repeat', qcOutcome: 'pass' }))
    expect(preparationWorkflowProgress(data).completedSteps).toBe(2)
    tube.executions[0].evidence.records.push(record('identity', { action: 'correct' }))
    expect(preparationWorkflowProgress(data).completedSteps).toBe(1)
  })

  it('excludes failed tubes without treating failure or an empty batch as completed work', () => {
    const active = member({ executions: [execution('first', [record('identity')])] })
    const failed = member({ id: 'failed', state: 'Failed' })
    expect(preparationWorkflowProgress(batch({ stages: workflowStages, members: [active, failed] })).completedSteps).toBe(1)
    expect(preparationWorkflowProgress(batch({ stages: workflowStages, members: [failed] }))).toEqual({ completedSteps: 0, totalSteps: 3, completedProtocols: 0, totalProtocols: 2 })
    expect(preparationWorkflowProgress(batch({ stages: workflowStages })).completedSteps).toBe(0)
    expect(preparationWorkflowProgress(batch()).totalProtocols).toBe(0)
  })

  it('counts permitted step and protocol skips as resolved workflow work', () => {
    const stages = [{ ...workflowStages[0], definition: { schemaVersion: 1 as const, steps: [{ ...workflowStep('optional'), required: false }] } }, { ...workflowStages[1], requirement: 'Optional' }]
    const tube = member({ executions: [execution('first', [record('optional', { outcome: 'skipped', reason: 'Not needed' })], 'Completed')], stageSkips: [{ stageId: 'second', reason: 'Not needed' }] })
    expect(preparationWorkflowProgress(batch({ stages, members: [tube] }))).toEqual({ completedSteps: 2, totalSteps: 2, completedProtocols: 2, totalProtocols: 2 })
  })
})

describe('guided preparation progress', () => {
  it('requires assembled contents and durable confirmation before offering start', () => {
    expect(preparationProgress(batch()).phase).toBe(0)
    expect(preparationProgress(batch({ trayBarcode: 'TRAY' })).phase).toBe(0)
    expect(preparationProgress(batch({ trayBarcode: 'TRAY', members: [member()] })).phase).toBe(0)
    expect(preparationProgress(batch({ trayBarcode: 'TRAY', members: [member()], trayConfirmed: true })).phase).toBe(1)
    expect(preparationProgress(batch({ status: 'InProgress', members: [member()] })).phase).toBe(1)
  })

  it('keeps handoff hidden until the batch closes and allows mixed passed/failed outcomes', () => {
    const members = [passing, member({ id: 'failed', state: 'Failed' })]
    const active = preparationProgress(batch({ status: 'InProgress', members }))
    expect(active.readyToClose).toBe(true)
    expect(active.phase).toBe(2)
    expect(active.handoffVisible).toBe(false)
    const complete = preparationProgress(batch({ status: 'Complete', members }))
    expect(complete.handoffVisible).toBe(true)
    expect(complete.libraries).toEqual([passing])
    expect(complete.phase).toBe(3)
  })

  it('does not invent sequencing readiness for all-failed or cancelled batches', () => {
    expect(preparationProgress(batch({ status: 'Complete', members: [member({ state: 'Failed' })] })).handoffVisible).toBe(false)
    expect(preparationProgress(batch({ status: 'Cancelled', members: [passing] })).phase).toBe(-1)
    expect(preparationProgress(batch({ status: 'Cancelled', members: [passing] })).handoffVisible).toBe(false)
    expect(preparationProgress(batch({ status: 'InProgress', members: [member({ state: 'Blocked' })] })).readyToClose).toBe(false)
  })

  it('marks handoff complete only when all passing libraries are assigned', () => {
    const assigned = member({ ...passing, library: { ...passing.library!, status: 'Batched', sequencing: { id: 'seq', name: 'Sequencing', batchNumber: 'SEQ' } } })
    expect(preparationProgress(batch({ status: 'Complete', members: [assigned, passing] })).handoffDone).toBe(false)
    const progress = preparationProgress(batch({ status: 'Complete', members: [assigned] }))
    expect(progress.handoffDone).toBe(true)
    expect(progress.phase).toBe(-1)
  })

  it('waits for final output confirmation and never advances blocked evidence', () => {
    const stage: PreparationStage = { id: 'stage', name: 'Preparation', sequence: 1, requirement: 'Required', definition: { schemaVersion: 1, steps: [] } }
    const active = member({ state: 'InProgress', executions: [{ id: 'execution', stageId: stage.id, status: 'InProgress', evidence: { records: [] }, blockers: [] }] })
    const data = batch({ status: 'InProgress', stages: [stage], members: [active] })
    expect(preparationProgress(data).readyToAdvance).toBe(false)
    active.output = { id: 'output', barcode: 'LIB', quantity: 10, quantityUnit: 'uL', confirmed: true }
    expect(preparationProgress(data).readyToAdvance).toBe(true)
    active.executions[0].blockers = ['Resolve QC Hold']
    expect(preparationProgress(data).readyToAdvance).toBe(false)
    expect(preparationProgress(data).readyToClose).toBe(false)
  })
})
