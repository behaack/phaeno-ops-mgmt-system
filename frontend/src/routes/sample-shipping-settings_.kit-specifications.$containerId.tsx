import { createFileRoute } from '@tanstack/react-router'
import { ShippingContainerDetailPage } from '#/features/orders/configuration/ShippingContainerDetailPage'
import { parseShippingContainerListSearch } from '#/features/orders/configuration/shipping-container-navigation'

export const Route = createFileRoute('/sample-shipping-settings_/kit-specifications/$containerId')({
  validateSearch: parseShippingContainerListSearch,
  component: KitSpecificationRoute,
})

function KitSpecificationRoute() {
  return <ShippingContainerDetailPage containerId={Route.useParams().containerId} />
}
