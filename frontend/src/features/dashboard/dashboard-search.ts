export type DashboardSection = 'orders' | 'lab' | 'accounts' | 'webOps'

export function parseDashboardSection(value: unknown): DashboardSection | undefined {
  return value === 'orders' || value === 'lab' || value === 'accounts' || value === 'webOps'
    ? value : undefined
}
