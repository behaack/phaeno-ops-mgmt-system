import { createFileRoute } from '@tanstack/react-router'

import { OrderConfigurationPage } from '#/features/orders/configuration/OrderConfigurationPage'

export const Route = createFileRoute('/order-configuration')({ component: OrderConfigurationPage })
