import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LabOperationsPage } from '#/features/lab-operations/LabOperationsPage'
import { parseLabConfigurationTab, type LabConfigurationTab } from '#/features/lab-operations/lab-configuration-tabs'

export const Route = createFileRoute('/lab-configuration')({
  validateSearch: (search: Record<string, unknown>): { configurationTab?: LabConfigurationTab; labStepSearch?: string; labStepRetired?: boolean; labStepPage?: number } => ({
    configurationTab: parseLabConfigurationTab(search.configurationTab) ?? 'steps',
    labStepSearch: typeof search.labStepSearch === 'string' ? search.labStepSearch.slice(0, 255) : undefined,
    labStepRetired: search.labStepRetired === true || search.labStepRetired === 'true' ? true : undefined,
    labStepPage: Number.isInteger(Number(search.labStepPage)) && Number(search.labStepPage) > 0 ? Number(search.labStepPage) : undefined,
  }),
  component: LabConfigurationRoute,
})

function LabConfigurationRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  return <LabOperationsPage
    section="protocols"
    configurationTab={search.configurationTab}
    onConfigurationTabChange={configurationTab => void navigate({ to: '/lab-configuration', search: previous => ({ ...previous, configurationTab }), resetScroll: false })}
    onSectionChange={() => undefined}
  />
}
