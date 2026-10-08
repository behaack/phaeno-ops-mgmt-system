import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { DeliveryLocationsPage } from '#/features/organizations/delivery-locations/DeliveryLocationsPage'
import { parseDeliveryLocationSearch } from '#/features/organizations/delivery-locations/delivery-location-navigation'

export const Route = createFileRoute('/delivery-locations')({ validateSearch: parseDeliveryLocationSearch, component: DeliveryLocationsRoute })
function DeliveryLocationsRoute() { return useRouterState({ select: state => state.location.pathname !== '/delivery-locations' }) ? <Outlet /> : <DeliveryLocationsPage /> }
