import { createFileRoute } from '@tanstack/react-router'

import { ServiceWorkflowVersionBuilderPage } from '#/features/lab-operations/ServiceWorkflowVersionBuilderPage'

export const Route = createFileRoute('/lab-operations/workflows/$workflowId/versions/new')({
  component: ServiceWorkflowVersionBuilderRoute,
})

function ServiceWorkflowVersionBuilderRoute() {
  return <ServiceWorkflowVersionBuilderPage workflowId={Route.useParams().workflowId} />
}
