import { createFileRoute } from '@tanstack/react-router'

import { ProtocolVersionBuilderPage } from '#/features/lab-operations/ProtocolVersionBuilderPage'
import { LabSettingsLayout } from '#/features/lab-operations/LabSettingsLayout'

export const Route = createFileRoute('/lab-operations/protocols/$protocolId/versions/new')({
  component: ProtocolVersionBuilderRoute,
})

function ProtocolVersionBuilderRoute() {
  return <LabSettingsLayout section="protocols" backLabel="protocols"><ProtocolVersionBuilderPage protocolId={Route.useParams().protocolId} /></LabSettingsLayout>
}
