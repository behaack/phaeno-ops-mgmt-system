import { createFileRoute } from '@tanstack/react-router'
import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'
export const Route = createFileRoute('/order-operations/partner-services/data-assembly/$orderId')({ component: RecordRoute })
function RecordRoute() { return <OrderOperationsPage workflow="assembly" orderId={Route.useParams().orderId} /> }
