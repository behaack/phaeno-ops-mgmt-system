import { createFileRoute } from '@tanstack/react-router'
import { OrderConfigurationPage } from '#/features/orders/configuration/OrderConfigurationPage'

export const Route = createFileRoute('/order-configuration/sample-types/$sampleTypeId')({
  component: SampleTypeRoute,
})

function SampleTypeRoute() {
  return <OrderConfigurationPage sampleTypeId={Route.useParams().sampleTypeId} />
}
