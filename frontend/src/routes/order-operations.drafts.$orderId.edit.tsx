import { createFileRoute, redirect } from '@tanstack/react-router'
import { parseServiceWorkspaceSearch } from '#/features/orders/service-workspace-search'
export const Route = createFileRoute('/order-operations/drafts/$orderId/edit')({ validateSearch: parseServiceWorkspaceSearch, beforeLoad: ({ params, search }) => { throw redirect({ to: '/order-operations/lab-services/drafts/$orderId/edit', params: { orderId: params.orderId }, search, replace: true }) } })
