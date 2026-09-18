import { createFileRoute } from '@tanstack/react-router'
import { LabStepPage } from '#/features/lab-operations/LabSteps'
export const Route = createFileRoute('/lab-operations/steps/$stepId/edit')({ component: Page })
function Page() { return <LabStepPage stepId={Route.useParams().stepId} editing /> }
