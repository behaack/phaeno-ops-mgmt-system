import { Building2, ClipboardCheck, Dna, Files, Package, Truck } from 'lucide-react'
import type { LabBatchDetail } from '#/api/lab-operations'
import { WorkflowProgress } from '#/components/ui/workflow-progress'

const steps = [
  { label: 'Prepare shipment', icon: Package },
  { label: 'Shipped', icon: Truck },
  { label: 'Vendor received', icon: Building2 },
  { label: 'Sequencing', icon: Dna },
  { label: 'Results received', icon: Files },
  { label: 'Success / Failure', icon: ClipboardCheck },
] as const

export function SequencingSendoutProgress({ batch, sendout }: Pick<LabBatchDetail, 'batch' | 'sendout'>) {
  const completed = [
    Boolean(sendout),
    Boolean(sendout?.shippedAtUtc),
    Boolean(sendout?.providerReceivedAtUtc),
    Boolean(sendout?.sequencingStartedAtUtc && sendout.resultsReceivedAtUtc),
    Boolean(sendout?.resultsReceivedAtUtc),
    Boolean(sendout?.outcome),
  ]
  const closed = batch.status === 'Complete' || batch.sendoutStatus === 'Complete'
  const current = closed ? -1 : !sendout ? 0 : ({
    Preparing: 1,
    Shipped: 2,
    ReceivedByProvider: 3,
    Sequencing: 3,
    ResultsReceived: 5,
  } as Record<string, number>)[batch.sendoutStatus ?? ''] ?? -1

  return <WorkflowProgress label="Sequencing send-out progress" steps={steps.map((step, index) => {
    const active = current === index
    const inProgress = index === 3 && batch.sendoutStatus === 'Sequencing'
      || index === 0 && batch.status === 'InProgress'
    return {
      ...step,
      id: step.label,
      label: index === 5 && sendout?.outcome ? sendout.outcome : step.label,
      complete: completed[index],
      current: active,
      status: active && inProgress ? 'In progress' : closed ? 'Not recorded' : undefined,
      tone: index === 5 && sendout?.outcome === 'Failure' ? 'destructive' : undefined,
    }
  })} />
}
