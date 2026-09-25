export type LabSection = 'receipt' | 'jobs' | 'work' | 'results' | 'kits' | 'assembly' | 'protocols' | 'materials' | 'reagent-runs' | 'master-mixes' | 'transportation-kits' | 'equipment' | 'batches' | 'suppliers'
export function parseLabSection(value: unknown): LabSection | undefined {
  if (value === 'product-types') return 'suppliers'
  return typeof value === 'string' && ['receipt', 'jobs', 'work', 'results', 'kits', 'assembly', 'protocols', 'materials', 'reagent-runs', 'master-mixes', 'transportation-kits', 'equipment', 'batches', 'suppliers'].includes(value) ? value as LabSection : undefined
}
