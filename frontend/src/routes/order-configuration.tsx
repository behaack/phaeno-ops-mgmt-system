import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { OrderConfigurationPage, parseConfigurationSection, type ConfigurationSection } from '#/features/orders/configuration/OrderConfigurationPage'
import { parseShippingContainerListSearch, type ShippingContainerListSearch } from '#/features/orders/configuration/shipping-container-navigation'

export const Route = createFileRoute('/order-configuration')({
  validateSearch: (search: Record<string, unknown>): { configurationSection?: ConfigurationSection } & ShippingContainerListSearch => ({
    configurationSection: parseConfigurationSection(search.configurationSection),
    ...parseShippingContainerListSearch(search),
  }),
  component: OrderConfigurationRoute,
})

function OrderConfigurationRoute() {
  const isDetail = useRouterState({ select: state => state.location.pathname !== '/order-configuration' })
  return isDetail ? <Outlet /> : <OrderConfigurationPage />
}
