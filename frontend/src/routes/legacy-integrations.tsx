import { createFileRoute } from '@tanstack/react-router'
import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'
export const Route = createFileRoute('/legacy-integrations')({ component: () => <OrderOperationsPage workspace="integrations" /> })
