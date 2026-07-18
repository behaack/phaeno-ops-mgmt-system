import { createFileRoute } from '@tanstack/react-router'

import { ProtocolVersionBuilderPage } from '#/features/lab-operations/ProtocolVersionBuilderPage'

export const Route = createFileRoute(
  '/lab-operations/protocols/$protocolId/versions/$versionId/edit',
)({
  component: ProtocolVersionEditRoute,
})

function ProtocolVersionEditRoute() {
  const { protocolId, versionId } = Route.useParams()
  return <ProtocolVersionBuilderPage protocolId={protocolId} draftVersionId={versionId} />
}
