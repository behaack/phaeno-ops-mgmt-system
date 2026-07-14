import { createFileRoute } from '@tanstack/react-router'

import { SourceSampleWorkspace } from '#/features/data-provisioning/SourceSampleWorkspace'

export const Route = createFileRoute(
  '/data-provisioning/sources/$sourceSampleId',
)({
  component: SourceSampleRoute,
})

function SourceSampleRoute() {
  const { sourceSampleId } = Route.useParams()
  return <SourceSampleWorkspace sourceSampleId={sourceSampleId} />
}
