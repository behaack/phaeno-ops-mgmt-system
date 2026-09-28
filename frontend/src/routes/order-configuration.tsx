import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { OrderConfigurationPage, parseConfigurationSection, type ConfigurationSection } from '#/features/orders/configuration/OrderConfigurationPage'

export const Route = createFileRoute('/order-configuration')({
  validateSearch: (search: Record<string, unknown>): { configurationSection?: ConfigurationSection } => ({
    configurationSection: parseConfigurationSection(search.configurationSection),
  }),
  component: OrderConfigurationRoute,
})

function OrderConfigurationRoute() {
  const isDetail = useRouterState({ select: state => state.location.pathname !== '/order-configuration' })
  return isDetail ? <Outlet /> : <OrderConfigurationPage />
}
