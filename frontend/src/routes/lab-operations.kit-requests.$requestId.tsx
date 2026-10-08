import { createFileRoute } from '@tanstack/react-router'
import { KitRequestDetailPage } from '#/features/orders/kit-requests/KitRequestDetailPage'

export const Route = createFileRoute('/lab-operations/kit-requests/$requestId')({ component: KitRequestRoute })
function KitRequestRoute() { return <KitRequestDetailPage requestId={Route.useParams().requestId} /> }
