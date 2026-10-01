import { createFileRoute } from '@tanstack/react-router'
import { CommercialOrderDraftPage } from '#/features/orders/CommercialOrderDraftPage'
export const Route = createFileRoute('/order-operations/drafts/$orderId/edit')({ component: EditDraftRoute })
function EditDraftRoute() { const { orderId } = Route.useParams(); return <CommercialOrderDraftPage orderId={orderId} /> }
