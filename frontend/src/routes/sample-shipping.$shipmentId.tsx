import { createFileRoute } from '@tanstack/react-router'

import { SampleShippingDetailPage } from '#/features/sample-shipping/SampleShippingDetailPage'

export const Route = createFileRoute('/sample-shipping/$shipmentId')({ component: SampleShippingDetailRoute })

function SampleShippingDetailRoute() {
  const { shipmentId } = Route.useParams()
  return <SampleShippingDetailPage shipmentId={shipmentId} />
}
