import { createFileRoute } from '@tanstack/react-router'

import { OrderConfigurationPage, parseConfigurationSection, type ConfigurationSection } from '#/features/orders/configuration/OrderConfigurationPage'

export const Route = createFileRoute('/order-configuration')({ validateSearch: (search: Record<string, unknown>): { configurationSection?: ConfigurationSection } => ({ configurationSection: parseConfigurationSection(search.configurationSection) }), component: OrderConfigurationPage })
