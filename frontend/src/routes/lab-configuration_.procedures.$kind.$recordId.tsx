import { parseConfigurationDiscovery, type ConfigurationDiscovery } from '#/features/lab-operations/configuration-discovery'
import { createFileRoute } from '@tanstack/react-router'
import { LabProcedureDetails } from '#/features/lab-operations/LabProcedureDetails'

export const Route = createFileRoute('/lab-configuration_/procedures/$kind/$recordId')({
  validateSearch: (search: Record<string, unknown>): ConfigurationDiscovery & { revision?: number; edit?: boolean } => ({
    ...parseConfigurationDiscovery(search),
    revision: Number.isInteger(Number(search.revision)) && Number(search.revision) > 0 ? Number(search.revision) : undefined,
    edit: search.edit === true || search.edit === 'true' ? true : undefined,
  }),
  component: ProcedureRoute,
})

function ProcedureRoute() {
  return <LabProcedureDetails {...Route.useParams()} {...Route.useSearch()} />
}
