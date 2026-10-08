import { createFileRoute, redirect } from '@tanstack/react-router'
import { commercialRecordRoute } from '#/features/orders/service-workspaces'
export const Route = createFileRoute('/order-operations/$workflow/$orderId')({ beforeLoad: ({ params, search }) => {
  if (params.workflow !== 'lab' && params.workflow !== 'reagent' && params.workflow !== 'assembly') throw redirect({ to: '/lab-services', replace: true })
  throw redirect({ to: commercialRecordRoute(params.workflow), params: { orderId: params.orderId }, search: { ...search, section: params.workflow === 'assembly' ? 'assembly' : params.workflow === 'reagent' ? 'kits' : undefined }, replace: true })
} })
