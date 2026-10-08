import { ClipboardCheck, Dna, FileCheck2, Layers, PackageCheck, TestTubes } from 'lucide-react'
import type { LabPhase } from '#/api/lab-phases'
import { WorkflowProgress } from '#/components/ui/workflow-progress'
import { phaseSampleProgress } from './lab-phase-progress'

const icons = { received: PackageCheck, preparation: TestTubes, sequencing: Dna, assembly: Layers, review: ClipboardCheck, results: FileCheck2 }

export function LabPhaseSampleProgress({ phase, single }: { phase: LabPhase; single: boolean }) {
  const progress = phaseSampleProgress(phase)
  return <div className="space-y-3">
    <div><h4 className="font-semibold">Laboratory sample progress</h4><p className="mt-1 text-xs text-muted-foreground">Counts show samples that have finished each step. Results finish after release to your Portal.</p></div>
    <WorkflowProgress label={single ? 'Laboratory sample progress' : `${phase.name} laboratory sample progress`} steps={progress.map(step => ({
      ...step,
      icon: icons[step.id],
      metric: `${step.finished} of ${phase.sampleCount} samples`,
      description: step.here > 0 && !step.complete && step.id !== 'received' && step.id !== 'results'
        ? `${step.here} in this stage` : step.id === 'results' && (phase.stageCounts.AwaitingDelivery ?? 0) > 0
          ? `${phase.stageCounts.AwaitingDelivery} awaiting release` : undefined,
    }))} />
    {phase.heldSamples > 0 || phase.failedSamples > 0 ? <p className="text-xs text-muted-foreground">{phase.heldSamples} held · {phase.failedSamples} need review. Their saved progress remains visible.</p> : null}
  </div>
}
