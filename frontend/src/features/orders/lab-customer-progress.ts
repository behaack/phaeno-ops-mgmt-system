import type { LabCustomerProgress } from '#/api/order-management'

export const customerLabStages = ['Received', 'LibraryPrep', 'Sequencing', 'DataAssembly', 'QualityReview', 'ResultsAvailable'] as const

export const customerLabStageLabels: Record<string, string> = {
  Received: 'Received', LibraryPrep: 'Library Prep', Sequencing: 'Sequencing',
  DataAssembly: 'Data Assembly', QualityReview: 'Quality Review', ResultsAvailable: 'Results Available',
  AwaitingReceipt: 'Awaiting receipt', OnHold: 'On Hold', NeedsAttention: 'Needs attention', Cancelled: 'Cancelled',
}

export function customerLabStatus(status: string, progress?: LabCustomerProgress | null) {
  return progress && ['PlacedAwaitingSamples', 'InProgress', 'ResultsAvailable'].includes(status)
    && progress.currentStage !== 'AwaitingReceipt' ? progress.currentStage : status
}
