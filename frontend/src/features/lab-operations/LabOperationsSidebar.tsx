import { useNavigate } from '@tanstack/react-router'
import { ClipboardList, FileCheck2, FlaskConical, Layers3, Microscope, PackageCheck, Pipette, TestTubeDiagonal, Truck, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SessionCapabilities } from '#/api/session'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'
import { usePhaenoSession } from '#/features/auth/session-context'
import type { LabSection } from './lab-sections'

const sections: ReadonlyArray<WorkspaceSidebarItem<LabSection>> = [
  { value: 'jobs', label: 'Jobs', description: 'Open jobs, delivery deadlines, and specimens', icon: Microscope },
  { value: 'specimens', label: 'Specimens', description: 'Trace active and historical specimens from receipt to delivery', icon: TestTubeDiagonal },
  { value: 'receipt', label: 'Sample receipt & accession', group: 'SAMPLE PROCESSING', description: 'Receive sample shipments and accession tubes', icon: Truck },
  { value: 'work', label: 'Library prep', group: 'SAMPLE PROCESSING', description: 'Source tubes, preparation, and library QC', icon: ClipboardList },
  { value: 'batches', label: 'Sequencing batches', group: 'SAMPLE PROCESSING', description: 'Group libraries and track sequencing', icon: Layers3 },
  { value: 'assembly', label: 'Data assembly', group: 'SAMPLE PROCESSING', description: 'PSeq Service sequencing inputs and assembly jobs', icon: Workflow },
  { value: 'results', label: 'Results & scientific review', group: 'RESULTS', description: 'Result evidence, scientific review, and release readiness', icon: ClipboardList },
  { value: 'release', label: 'Result release', group: 'RESULTS', description: 'Governed, sample-level PSeq delivery', icon: FileCheck2 },
  { value: 'master-mixes', label: 'Master mixes', group: 'LAB PREPARATIONS', description: 'Prepare one mix for several library trays', icon: Pipette },
  { value: 'reagent-runs', label: 'Reagent manufacturing', group: 'LAB PREPARATIONS', description: 'Make and document Phaeno reagent lots', icon: FlaskConical },
  { value: 'kit-requests', label: 'Transportation kit requests', group: 'KITS & FULFILLMENT', description: 'Fulfill requests and track kits sent to Customers', icon: Truck },
  { value: 'transportation-kits', label: 'Transportation kit inventory', group: 'KITS & FULFILLMENT', description: 'Assemble kits, receive purchased kits, and review stock', icon: PackageCheck },
  { value: 'kits', label: 'PSeq kit fulfillment', group: 'KITS & FULFILLMENT', description: 'Prepare, ship, and fulfill PSeq kit orders', icon: PackageCheck },
]

export function getLabWorkspaceSections(capabilities?: SessionCapabilities) {
  return sections.filter(item => item.value === 'release' ? capabilities?.canReleasePSeqResults : capabilities?.canManageLabOperations)
}

export function LabOperationsSidebar({ section, children }: { section: LabSection; children: ReactNode }) {
  const { session } = usePhaenoSession()
  const navigate = useNavigate()
  return <WorkspaceSidebar workspaceLabel="Lab operations" items={getLabWorkspaceSections(session?.capabilities)} value={section} onValueChange={value => {
    if (value === 'release') void navigate({ to: '/lab-operations/result-release' })
    else void navigate({ to: '/lab-operations', search: { section: value } })
  }}>{children}</WorkspaceSidebar>
}
