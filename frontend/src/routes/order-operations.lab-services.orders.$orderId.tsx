import { createFileRoute } from '@tanstack/react-router'
import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'
export const Route = createFileRoute('/order-operations/lab-services/orders/$orderId')({ component: RecordRoute })
function RecordRoute() { return <OrderOperationsPage workflow="lab" orderId={Route.useParams().orderId} /> }
