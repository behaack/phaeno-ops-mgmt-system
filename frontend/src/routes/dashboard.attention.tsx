import { createFileRoute } from '@tanstack/react-router'
import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'
export const Route = createFileRoute('/dashboard/attention')({ component: () => <OrderOperationsPage workspace="attention" /> })
