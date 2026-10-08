import type { LabPhasePlan } from '#/api/lab-phases'
import type { LabServiceOrder } from '#/api/order-management'

export function hasMultipleLabPhases(order: LabServiceOrder, plan?: LabPhasePlan) {
  return (plan?.phases.length ?? order.phaseCount ?? order.phaseScopes?.length ?? 1) > 1
}

export function labSampleCount(count: number) {
  return `${count} ${count === 1 ? 'sample' : 'samples'}`
}
