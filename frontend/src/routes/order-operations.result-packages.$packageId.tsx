import { createFileRoute } from '@tanstack/react-router'
import { ResultPackageDetailPage } from '#/features/orders/ResultReleasePanel'
export const Route = createFileRoute('/order-operations/result-packages/$packageId')({ component: ResultPackageRoute })
function ResultPackageRoute() { return <ResultPackageDetailPage packageId={Route.useParams().packageId} /> }
