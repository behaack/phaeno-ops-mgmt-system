import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { OrderConfigurationPage, parseConfigurationSection, type ConfigurationSection } from '#/features/orders/configuration/OrderConfigurationPage'
import { parseCatalogListSearch, type CatalogListSearch } from '#/features/orders/configuration/catalog-list-navigation'

export const Route = createFileRoute('/order-configuration')({
  validateSearch: (search: Record<string, unknown>): CatalogListSearch & { configurationSection?: ConfigurationSection; kitLotSearch?: string; kitLotPage?: number } => ({
    configurationSection: parseConfigurationSection(search.configurationSection),
    ...parseCatalogListSearch(search),
    kitLotSearch: typeof search.kitLotSearch === 'string' ? search.kitLotSearch.slice(0, 255) || undefined : undefined,
    kitLotPage: Number.isSafeInteger(Number(search.kitLotPage)) && Number(search.kitLotPage) > 0 ? Number(search.kitLotPage) : undefined,
  }),
  component: OrderConfigurationRoute,
})

function OrderConfigurationRoute() {
  const isDetail = useRouterState({ select: state => state.location.pathname !== '/order-configuration' })
  return isDetail ? <Outlet /> : <OrderConfigurationPage />
}
