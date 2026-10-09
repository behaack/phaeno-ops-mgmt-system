import { createFileRoute } from '@tanstack/react-router'
import { parseExecutionReturnSearch } from '#/features/lab-operations/specimen-navigation'
import { LabExecutionPage } from '#/features/lab-operations/LabExecutionPage'

export const Route = createFileRoute('/lab-operations/executions/$executionId')({ validateSearch: parseExecutionReturnSearch, component: ExecutionRoute })

function ExecutionRoute() { const search = Route.useSearch(); return <LabExecutionPage executionId={Route.useParams().executionId} returnSection={search.section} returnShipmentId={search.shipmentId} returnSpecimenId={search.returnSpecimenId} returnSpecimenTab={search.returnSpecimenTab} /> }
