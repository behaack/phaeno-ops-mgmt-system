import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { OrderConfigurationPage, parseConfigurationSection, type ConfigurationSection } from '#/features/orders/configuration/OrderConfigurationPage'
import { parseCatalogListSearch, type CatalogListSearch } from '#/features/orders/configuration/catalog-list-navigation'

export const Route = createFileRoute('/order-configuration')({
  validateSearch: (search: Record<string, unknown>): CatalogListSearch & { configurationSection?: ConfigurationSection } => ({
    configurationSection: parseConfigurationSection(search.configurationSection),
    ...parseCatalogListSearch(search),
  }),
  component: OrderConfigurationRoute,
})

function OrderConfigurationRoute() {
  const isDetail = useRouterState({ select: state => state.location.pathname !== '/order-configuration' })
  return isDetail ? <Outlet /> : <OrderConfigurationPage />
}
