import { createFileRoute } from '@tanstack/react-router'

import { ServiceWorkflowVersionBuilderPage } from '#/features/lab-operations/ServiceWorkflowVersionBuilderPage'
import { LabSettingsLayout } from '#/features/lab-operations/LabSettingsLayout'

export const Route = createFileRoute('/lab-operations/workflows/$workflowId/versions/new')({
  component: ServiceWorkflowVersionBuilderRoute,
})

function ServiceWorkflowVersionBuilderRoute() {
  return <LabSettingsLayout section="workflows" backLabel="workflows"><ServiceWorkflowVersionBuilderPage workflowId={Route.useParams().workflowId} /></LabSettingsLayout>
}
