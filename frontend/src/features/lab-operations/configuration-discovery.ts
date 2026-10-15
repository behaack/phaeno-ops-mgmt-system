import { useNavigate, useRouterState } from '@tanstack/react-router'

export const workflowKinds = ['library', 'reagent', 'master-mix', 'transportation-kit'] as const
export type WorkflowKind = typeof workflowKinds[number]
type FilterKind = WorkflowKind | 'protocol'
type Filters = Partial<Record<FilterKind, { search: string; inactive: boolean }>>
export type ConfigurationDiscovery = { workflowType?: WorkflowKind; workflowFilters?: string }

function filters(value: unknown): Filters {
  if (typeof value !== 'string' || value.length > 5000) return {}
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries([...workflowKinds, 'protocol'].flatMap(kind => {
      const entry = (parsed as Record<string, unknown>)[kind]
      if (!entry || typeof entry !== 'object') return []
      const { search, inactive } = entry as Record<string, unknown>
      return [[kind, { search: typeof search === 'string' ? search.slice(0, 255) : '', inactive: inactive === true }]]
    }))
  } catch { return {} }
}
export function parseConfigurationDiscovery(search: Record<string, unknown>): ConfigurationDiscovery {
  const parsed = filters(search.workflowFilters)
  return {
    workflowType: workflowKinds.includes(search.workflowType as WorkflowKind) ? search.workflowType as WorkflowKind : undefined,
    workflowFilters: Object.keys(parsed).length ? JSON.stringify(parsed) : undefined,
  }
}
export function useConfigurationDiscovery() {
  return useRouterState({ select: state => parseConfigurationDiscovery(state.location.search as Record<string, unknown>) })
}
export function useWorkflowDiscovery(kind: FilterKind) {
  const discovery = useConfigurationDiscovery()
  const navigate = useNavigate()
  const saved = filters(discovery.workflowFilters)
  const current = saved[kind] ?? { search: '', inactive: false }
  const update = (patch: Partial<typeof current>) => void navigate({
    to: '/lab-configuration', replace: true, resetScroll: false,
    search: previous => ({ ...previous, workflowFilters: JSON.stringify({ ...saved, [kind]: { ...current, ...patch } }) }),
  })
  return { discovery, search: current.search, setSearch: (search: string) => update({ search }), showInactive: current.inactive, setShowInactive: (inactive: boolean) => update({ inactive }) }
}
