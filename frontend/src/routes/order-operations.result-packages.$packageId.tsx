import { createFileRoute, redirect } from '@tanstack/react-router'
import { parseServiceWorkspaceSearch } from '#/features/orders/service-workspace-search'
export const Route = createFileRoute('/order-operations/result-packages/$packageId')({ validateSearch: parseServiceWorkspaceSearch, beforeLoad: ({ params, search }) => { throw redirect({ to: '/lab-operations/result-packages/$packageId', params: { packageId: params.packageId }, search, replace: true }) } })
