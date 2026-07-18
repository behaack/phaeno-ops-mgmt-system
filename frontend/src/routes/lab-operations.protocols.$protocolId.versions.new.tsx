import { createFileRoute } from '@tanstack/react-router'

import { ProtocolVersionBuilderPage } from '#/features/lab-operations/ProtocolVersionBuilderPage'

export const Route = createFileRoute('/lab-operations/protocols/$protocolId/versions/new')({
  component: ProtocolVersionBuilderRoute,
})

function ProtocolVersionBuilderRoute() {
  return <ProtocolVersionBuilderPage protocolId={Route.useParams().protocolId} />
}
