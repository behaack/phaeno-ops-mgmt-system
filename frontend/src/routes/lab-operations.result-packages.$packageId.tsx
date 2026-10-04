import { createFileRoute } from '@tanstack/react-router'
import { ResultPackageDetailPage } from '#/features/orders/ResultReleasePanel'
import { LabOperationsSidebar } from '#/features/lab-operations/LabOperationsSidebar'
export const Route = createFileRoute('/lab-operations/result-packages/$packageId')({ component: ResultPackageRoute })
function ResultPackageRoute() { return <LabOperationsSidebar section="release"><ResultPackageDetailPage packageId={Route.useParams().packageId} /></LabOperationsSidebar> }
