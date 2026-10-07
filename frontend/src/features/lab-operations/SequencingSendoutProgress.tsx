import { Ban, Building2, Files, Package, Truck } from 'lucide-react'
import type { LabBatchDetail } from '#/api/lab-operations'
import { WorkflowProgress } from '#/components/ui/workflow-progress'

const steps = [
  { label: 'Prepare shipment', icon: Package },
  { label: 'Shipped', icon: Truck },
  { label: 'Vendor received', icon: Building2 },
  { label: 'Results received', icon: Files },
] as const

export function SequencingSendoutProgress({ batch, sendout }: Pick<LabBatchDetail, 'batch' | 'sendout'>) {
  const completed = [
    Boolean(sendout),
    Boolean(sendout?.shippedAtUtc),
    Boolean(sendout?.providerReceivedAtUtc),
    Boolean(sendout?.resultsReceivedAtUtc) || sendout?.runNotPerformed === true,
  ]
  const closed = batch.status === 'Complete' || batch.sendoutStatus === 'Complete'
  const current = closed ? -1 : !sendout ? 0 : ({
    Preparing: 1,
    Shipped: 2,
    ReceivedByProvider: 3,
  } as Record<string, number>)[batch.sendoutStatus ?? ''] ?? -1

  return <WorkflowProgress label="Sequencing send-out progress" steps={steps.map((step, index) => {
    const active = current === index
    const inProgress = index === 0 && batch.status === 'InProgress'
    return {
      ...step,
      ...(index === 3 && sendout?.runNotPerformed === true ? { label: 'Run not performed', icon: Ban } : {}),
      id: step.label,
      complete: completed[index],
      current: active,
      status: active && inProgress ? 'In progress' : closed ? 'Not recorded' : undefined,
    }
  })} />
}
