import { createFileRoute } from '@tanstack/react-router'

import { ServiceWorkflowVersionBuilderPage } from '#/features/lab-operations/ServiceWorkflowVersionBuilderPage'

export const Route = createFileRoute('/lab-operations/workflows/$workflowId/versions/$versionId/edit')({
  component: ServiceWorkflowVersionEditRoute,
})

function ServiceWorkflowVersionEditRoute() {
  const { workflowId, versionId } = Route.useParams()
  return <ServiceWorkflowVersionBuilderPage workflowId={workflowId} draftVersionId={versionId} />
}
