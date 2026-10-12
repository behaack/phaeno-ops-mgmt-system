import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { ClipboardCheck, Dna, FileCheck2, Layers, PackageCheck, TestTubes } from 'lucide-react'
import type { LabPhase } from '#/api/lab-phases'
import { WorkflowProgress } from '#/components/ui/workflow-progress'
import { phaseSampleProgress } from './lab-phase-progress'

const icons = { received: PackageCheck, preparation: TestTubes, sequencing: Dna, assembly: Layers, review: ClipboardCheck, results: FileCheck2 }

export function LabPhaseSampleProgress({ phase, single }: { phase: LabPhase; single: boolean }) {
  const __customerText = useCustomerText()

  const progress = phaseSampleProgress(phase)
  return <div className="space-y-3">
    <div><h4 className="font-semibold"><CustomerText message="m_9e07bda57de2" /></h4><p className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_feeed51e9546" /></p></div>
    <WorkflowProgress label={single ? "Laboratory sample progress" : __customerText('m_21212a0ea8c5', { p0: String(phase.name) })} steps={progress.map(step => ({
      ...step,
      icon: icons[step.id],
      metric: `${step.finished} of ${phase.sampleCount} samples`,
      description: step.here > 0 && !step.complete && step.id !== 'received' && step.id !== 'results'
        ? `${step.here} in this stage` : step.id === 'results' && (phase.stageCounts.AwaitingDelivery ?? 0) > 0
          ? `${phase.stageCounts.AwaitingDelivery} awaiting release` : undefined,
    }))} />
    {phase.heldSamples > 0 || phase.failedSamples > 0 ? <p className="text-xs text-muted-foreground">{phase.heldSamples} <CustomerText message="m_97c2c47609fc" />{phase.failedSamples} <CustomerText message="m_1b4c32b97b11" /></p> : null}
  </div>
}
