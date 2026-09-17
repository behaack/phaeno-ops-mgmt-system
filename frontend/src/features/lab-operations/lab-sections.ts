export type LabSection = 'receipt' | 'work' | 'results' | 'kits' | 'assembly' | 'protocols' | 'materials' | 'equipment' | 'batches' | 'suppliers'
export function parseLabSection(value: unknown): LabSection | undefined {
  if (value === 'product-types') return 'suppliers'
  return typeof value === 'string' && ['receipt', 'work', 'results', 'kits', 'assembly', 'protocols', 'materials', 'equipment', 'batches', 'suppliers'].includes(value) ? value as LabSection : undefined
}
