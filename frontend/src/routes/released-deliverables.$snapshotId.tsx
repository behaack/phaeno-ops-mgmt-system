import { createFileRoute } from '@tanstack/react-router'
import { ReleasedDeliverableDetailPage } from '#/features/file-management/ReleasedDeliverableDetailPage'
export const Route = createFileRoute('/released-deliverables/$snapshotId')({ component: ReleaseRoute })
function ReleaseRoute() { return <ReleasedDeliverableDetailPage {...Route.useParams()} {...Route.useSearch()} /> }
