import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { SampleShippingPage } from '#/features/sample-shipping/SampleShippingPage'
import { parseRecordListSearch } from '#/components/RecordPagination'

export const Route = createFileRoute('/sample-shipping')({ validateSearch: parseRecordListSearch, component: SampleShippingRoute })

function SampleShippingRoute() {
  const isDetail = useRouterState({ select: (state) => state.location.pathname !== '/sample-shipping' })
  return isDetail ? <Outlet /> : <SampleShippingPage />
}
