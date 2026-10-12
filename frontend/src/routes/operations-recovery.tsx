import { createFileRoute } from '@tanstack/react-router'
import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'
import { parseServiceWorkspaceSearch } from '#/features/orders/service-workspace-search'
export const Route = createFileRoute('/operations-recovery')({ validateSearch: parseServiceWorkspaceSearch, component: () => <OrderOperationsPage workspace="attention" /> })
