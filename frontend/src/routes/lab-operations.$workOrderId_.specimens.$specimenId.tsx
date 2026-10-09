import { createFileRoute, useLocation } from '@tanstack/react-router'
import { parseSpecimenTab, type SpecimenTab } from '#/features/lab-operations/specimen-navigation'
import { LabSpecimenPage } from '#/features/lab-operations/LabSpecimenPage'

export const Route = createFileRoute('/lab-operations/$workOrderId_/specimens/$specimenId')({
  validateSearch: (search: Record<string, unknown>): { specimenTab?: SpecimenTab } => ({ specimenTab: parseSpecimenTab(search.specimenTab) }),
  component: SpecimenRoute,
})
function SpecimenRoute() {
  const { workOrderId, specimenId } = Route.useParams()
  const { specimenTab } = Route.useSearch()
  const location = useLocation()
  return <LabSpecimenPage key={specimenId} workOrderId={workOrderId} specimenId={specimenId} selectedTab={specimenTab ?? (location.hash === 'sample-history' ? 'history' : 'overview')} />
}
