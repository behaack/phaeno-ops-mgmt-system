import { createFileRoute } from '@tanstack/react-router'
import { LabExecutionPage } from '#/features/lab-operations/LabExecutionPage'

export const Route = createFileRoute('/lab-operations/executions/$executionId')({ component: ExecutionRoute })

function ExecutionRoute() { const search = Route.useSearch(); return <LabExecutionPage executionId={Route.useParams().executionId} returnSection={search.section} returnShipmentId={search.shipmentId} /> }
