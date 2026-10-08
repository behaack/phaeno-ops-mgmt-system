import type { PreparationDetail } from '#/api/lab-preparation'

export function preparationWorkflowProgress(batch: PreparationDetail) {
  const continuing = batch.members.filter(member => !['Failed', 'Cancelled'].includes(member.state))
  // If every attempt failed, retain only progress supported by their actual evidence.
  const members = continuing.length ? continuing : batch.members.filter(member => member.state !== 'Cancelled')
  let completedSteps = 0
  let totalSteps = 0
  let completedProtocols = 0
  for (const stage of batch.stages) {
    const skippedStage = (member: PreparationDetail['members'][number]) => stage.requirement !== 'Required' && member.stageSkips.some(skip => skip.stageId === stage.id)
    if (members.length > 0 && members.every(member => skippedStage(member) || member.executions.some(execution => execution.stageId === stage.id && execution.status === 'Completed'))) completedProtocols++
    totalSteps += stage.definition.steps.length
    stage.definition.steps.forEach((step, stepIndex) => {
      const complete = members.length > 0 && members.every(member => {
        if (skippedStage(member)) return true
        const records = member.executions.find(execution => execution.stageId === stage.id)?.evidence.records ?? []
        const latest = new Map(records.map((record, index) => [record.stepKey, index]))
        const recordIndex = latest.get(step.key) ?? -1
        const record = records[recordIndex]
        if (!record || record.outcome === 'skipped' && step.required) return false
        if (record.outcome === 'recorded' && step.qcGate && record.qcOutcome !== 'pass') return false
        // Match the protocol's freshness rule after an earlier step is corrected/repeated.
        return !stage.definition.steps.slice(0, stepIndex).some(earlier => (latest.get(earlier.key) ?? -1) > recordIndex)
      })
      if (complete) completedSteps++
    })
  }
  return { completedSteps, totalSteps, completedProtocols, totalProtocols: batch.stages.length }
}

export function preparationProgress(batch: PreparationDetail) {
  const participants = batch.members.filter(m => !['Failed', 'Succeeded', 'Cancelled'].includes(m.state))
  const stage = batch.stages.find(s => participants.some(m => m.executions.some(e => e.stageId === s.id && ['InProgress', 'Blocked'].includes(e.status))))
  const stageMembers = participants.filter(m => m.executions.some(e => e.stageId === stage?.id && ['InProgress', 'Blocked'].includes(e.status)))
  const readyToClose = batch.status === 'InProgress' && batch.members.length > 0 && batch.members.every(m => m.state === 'Failed' || m.state === 'Succeeded' && Boolean(m.library))
  const libraries = batch.members.filter(m => m.state === 'Succeeded' && (m.library?.status === 'QcPassed' || Boolean(m.library?.sequencing)))
  const handoffVisible = batch.status === 'Complete' && libraries.length > 0
  const handoffDone = handoffVisible && libraries.every(m => Boolean(m.library?.sequencing))
  const finalStage = stage?.id === batch.stages.at(-1)?.id
  const evidenceReady = stageMembers.length > 0 && stageMembers.every(m => !m.blocker && !m.executions.find(e => e.stageId === stage?.id)?.blockers.length)
  const outputsReady = stageMembers.every(m => m.output?.confirmed)
  const readyToAdvance = evidenceReady && (!finalStage || outputsReady)
  const nextStep = stage?.definition.steps.find(step => stageMembers.some(m => {
    const execution = m.executions.find(e => e.stageId === stage.id)
    return !m.blocker && !execution?.stepPrerequisites?.[step.key]?.length && !execution?.evidence.records.some(r => r.stepKey === step.key)
  }))
  const phase = batch.status === 'Cancelled' ? -1
    : batch.status === 'Complete' ? handoffVisible && !handoffDone ? 3 : -1
      : batch.status === 'InProgress' ? readyToClose ? 2 : 1
        : batch.trayConfirmed ? 1 : 0
  return { participants, stage, stageMembers, readyToClose, libraries, handoffVisible, handoffDone, finalStage, evidenceReady, outputsReady, readyToAdvance, nextStep, phase, ...preparationWorkflowProgress(batch) }
}
