export type LabSection = 'receipt' | 'jobs' | 'work' | 'results' | 'kits' | 'assembly' | 'protocols' | 'reagent-runs' | 'master-mixes' | 'transportation-kits' | 'batches'
export function parseLabSection(value: unknown): LabSection | undefined {
  return typeof value === 'string' && ['receipt', 'jobs', 'work', 'results', 'kits', 'assembly', 'reagent-runs', 'master-mixes', 'transportation-kits', 'batches'].includes(value) ? value as LabSection : undefined
}
