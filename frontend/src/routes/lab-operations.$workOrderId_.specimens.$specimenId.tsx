import { createFileRoute } from '@tanstack/react-router'
import { LabSpecimenPage } from '#/features/lab-operations/LabSpecimenPage'

export const Route = createFileRoute('/lab-operations/$workOrderId_/specimens/$specimenId')({ component: SpecimenRoute })
function SpecimenRoute() { const { workOrderId, specimenId } = Route.useParams(); return <LabSpecimenPage workOrderId={workOrderId} specimenId={specimenId} /> }
