import { createFileRoute } from '@tanstack/react-router'
import { DeliveryLocationDetailPage } from '#/features/organizations/delivery-locations/DeliveryLocationsPage'

export const Route = createFileRoute('/delivery-locations/$locationId')({ component: DeliveryLocationRoute })
function DeliveryLocationRoute() { return <DeliveryLocationDetailPage locationId={Route.useParams().locationId} /> }
