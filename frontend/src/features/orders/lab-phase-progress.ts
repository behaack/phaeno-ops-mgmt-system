import { humanizeStatus } from './OrderStatusBadge'
import type { LabPhase } from '#/api/lab-phases'

const laboratorySteps = [
  { id: 'received', label: 'Received', completedAt: 0, stages: ['AwaitingAcceptance', 'ReadyForPreparation'] },
  { id: 'preparation', label: 'Library preparation', completedAt: 2, stages: ['LibraryPreparation'] },
  { id: 'sequencing', label: 'Sequencing', completedAt: 3, stages: ['Sequencing'] },
  { id: 'assembly', label: 'Data assembly', completedAt: 4, stages: ['DataProcessing'] },
  { id: 'review', label: 'Quality review', completedAt: 5, stages: ['QualityReview'] },
  { id: 'results', label: 'Results available', completedAt: 6, stages: ['Delivered'] },
] as const

// These are the current, sample-scoped stage keys returned by LabPhaseFacts.
// A stage in progress is not proof that its work has finished.
const recordedStagePosition: Record<string, number> = {
  AwaitingAcceptance: 0,
  ReadyForPreparation: 0,
  LibraryPreparation: 1,
  Sequencing: 2,
  DataProcessing: 3,
  QualityReview: 4,
  AwaitingDelivery: 5,
  Delivered: 6,
}

export function phaseSampleProgress(phase: Pick<LabPhase, 'sampleCount' | 'stageCounts' | 'lifecycle'>) {
  const inactive = ['Cancelled', 'Superseded'].includes(phase.lifecycle)
  const counts = Object.entries(phase.stageCounts).filter(([, count]) => Number.isInteger(count) && count > 0)
  const progress = laboratorySteps.map(step => {
    const finished = counts.reduce((total, [stage, count]) =>
      total + (recordedStagePosition[stage] !== undefined && recordedStagePosition[stage] >= step.completedAt ? count : 0), 0)
    const here = counts.reduce((total, [stage, count]) => total + (step.stages.some(value => value === stage) ? count : 0), 0)
    return { id: step.id, label: step.label, finished, here, complete: phase.sampleCount > 0 && finished === phase.sampleCount }
  })
  const firstIncomplete = inactive ? -1 : progress.findIndex(step => !step.complete)
  return progress.map((step, index) => {
    const current = index === firstIncomplete
    let status = current ? step.id === 'received' ? 'Awaiting samples' : 'Next step' : 'Upcoming'
    if (step.here > 0 && !step.complete) status = step.id === 'results' ? 'Partially available' : 'In progress'
    if (step.id === 'results' && step.here === 0 && (phase.stageCounts.AwaitingDelivery ?? 0) > 0) status = 'Awaiting release'
    if (inactive) status = humanizeStatus(phase.lifecycle)
    return { ...step, current, status }
  })
}

export function customerStage(stage: string, internal: boolean) {
  if (!internal && ['AwaitingAcceptance', 'ReadyForPreparation'].includes(stage)) return 'Received'
  return humanizeStatus(stage)
}
export function phaseProgress(counts: Record<string, number>, internal: boolean) {
  const grouped: Record<string, number> = {}
  for (const [stage, count] of Object.entries(counts)) {
    const label = customerStage(stage, internal)
    grouped[label] = (grouped[label] ?? 0) + count
  }
  return Object.entries(grouped).map(([label, count]) => `${count} ${label}`).join(' · ')
}
