import { createFileRoute, redirect } from '@tanstack/react-router'
import { parseServiceWorkspaceSearch } from '#/features/orders/service-workspace-search'
export const Route = createFileRoute('/order-operations/intake/$orderId')({ validateSearch: parseServiceWorkspaceSearch, beforeLoad: ({ params, search }) => { throw redirect({ to: '/order-operations/lab-services/intake/$orderId', params: { orderId: params.orderId }, search, replace: true }) } })
