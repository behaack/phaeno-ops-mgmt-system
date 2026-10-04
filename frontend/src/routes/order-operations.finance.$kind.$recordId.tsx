import { createFileRoute, redirect } from '@tanstack/react-router'
import { parseServiceWorkspaceSearch } from '#/features/orders/service-workspace-search'
export const Route = createFileRoute('/order-operations/finance/$kind/$recordId')({ validateSearch: parseServiceWorkspaceSearch, beforeLoad: ({ params, search }) => { throw redirect({ to: '/finance/$kind/$recordId', params: { kind: params.kind, recordId: params.recordId }, search, replace: true }) } })
