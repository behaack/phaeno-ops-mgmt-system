import { createFileRoute } from '@tanstack/react-router'

import { SampleShippingDetailPage } from '#/features/sample-shipping/SampleShippingDetailPage'

export const Route = createFileRoute('/sample-shipping/$shipmentId')({ validateSearch: (search: Record<string, unknown>): { orderKits?: boolean } => ({ orderKits: search.orderKits === true || search.orderKits === 'true' ? true : undefined }), component: SampleShippingDetailRoute })

function SampleShippingDetailRoute() {
  const { shipmentId } = Route.useParams()
  const { orderKits } = Route.useSearch()
  return <SampleShippingDetailPage shipmentId={shipmentId} autoOpenKitOrder={orderKits} />
}
