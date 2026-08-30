import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { SampleShippingPage } from '#/features/sample-shipping/SampleShippingPage'

export const Route = createFileRoute('/sample-shipping')({ component: SampleShippingRoute })

function SampleShippingRoute() {
  const isDetail = useRouterState({ select: (state) => state.location.pathname !== '/sample-shipping' })
  return isDetail ? <Outlet /> : <SampleShippingPage />
}
