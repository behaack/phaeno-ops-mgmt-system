import { createFileRoute } from '@tanstack/react-router'
import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'
export const Route = createFileRoute('/order-operations/partner-services/pseq-kits/$orderId')({ component: RecordRoute })
function RecordRoute() { return <OrderOperationsPage workflow="reagent" orderId={Route.useParams().orderId} /> }
