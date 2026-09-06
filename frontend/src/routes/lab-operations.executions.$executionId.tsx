import { createFileRoute } from '@tanstack/react-router'
import { LabExecutionPage } from '#/features/lab-operations/LabExecutionPage'

export const Route = createFileRoute('/lab-operations/executions/$executionId')({ component: ExecutionRoute })

function ExecutionRoute() { return <LabExecutionPage executionId={Route.useParams().executionId} /> }
