import { createFileRoute } from '@tanstack/react-router'

import { SampleShippingPacketPage } from '#/features/sample-shipping/SampleShippingPacketPage'

export const Route = createFileRoute('/sample-shipping/$shipmentId/packet')({ component: SampleShippingPacketRoute })

function SampleShippingPacketRoute() {
  const { shipmentId } = Route.useParams()
  return <SampleShippingPacketPage shipmentId={shipmentId} />
}
