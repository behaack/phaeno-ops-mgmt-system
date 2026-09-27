import { createFileRoute } from '@tanstack/react-router'

import { ServiceWorkflowVersionBuilderPage } from '#/features/lab-operations/ServiceWorkflowVersionBuilderPage'
import { LabSettingsLayout } from '#/features/lab-operations/LabSettingsLayout'

export const Route = createFileRoute('/lab-operations/workflows/$workflowId/versions/$versionId/edit')({
  component: ServiceWorkflowVersionEditRoute,
})

function ServiceWorkflowVersionEditRoute() {
  const { workflowId, versionId } = Route.useParams()
  return <LabSettingsLayout section="workflows" backLabel="workflows"><ServiceWorkflowVersionBuilderPage workflowId={workflowId} draftVersionId={versionId} /></LabSettingsLayout>
}
