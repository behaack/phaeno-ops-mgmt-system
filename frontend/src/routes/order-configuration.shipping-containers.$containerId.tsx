import { createFileRoute } from '@tanstack/react-router'
import { ShippingContainerDetailPage } from '#/features/orders/configuration/ShippingContainerDetailPage'

export const Route = createFileRoute('/order-configuration/shipping-containers/$containerId')({ component: ShippingContainerRoute })
function ShippingContainerRoute() { return <ShippingContainerDetailPage containerId={Route.useParams().containerId} /> }
