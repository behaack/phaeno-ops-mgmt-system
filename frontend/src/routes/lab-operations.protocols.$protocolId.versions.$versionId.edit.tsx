import { createFileRoute } from '@tanstack/react-router'

import { ProtocolVersionBuilderPage } from '#/features/lab-operations/ProtocolVersionBuilderPage'
import { LabSettingsLayout } from '#/features/lab-operations/LabSettingsLayout'

export const Route = createFileRoute(
  '/lab-operations/protocols/$protocolId/versions/$versionId/edit',
)({
  component: ProtocolVersionEditRoute,
})

function ProtocolVersionEditRoute() {
  const { protocolId, versionId } = Route.useParams()
  return <LabSettingsLayout section="protocols" backLabel="protocols"><ProtocolVersionBuilderPage protocolId={protocolId} draftVersionId={versionId} /></LabSettingsLayout>
}
