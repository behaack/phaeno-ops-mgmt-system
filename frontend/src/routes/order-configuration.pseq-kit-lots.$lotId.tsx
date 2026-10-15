import { createFileRoute } from '@tanstack/react-router'
import { OrderConfigurationPage } from '#/features/orders/configuration/OrderConfigurationPage'

export const Route = createFileRoute('/order-configuration/pseq-kit-lots/$lotId')({ component: KitLotRoute })
function KitLotRoute() { return <OrderConfigurationPage kitLotId={Route.useParams().lotId} /> }
