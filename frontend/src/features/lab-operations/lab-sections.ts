export type LabSection = 'receipt' | 'work' | 'results' | 'kits' | 'assembly' | 'protocols' | 'materials' | 'equipment' | 'batches'
export function parseLabSection(value: unknown): LabSection | undefined {
  return typeof value === 'string' && ['receipt', 'work', 'results', 'kits', 'assembly', 'protocols', 'materials', 'equipment', 'batches'].includes(value) ? value as LabSection : undefined
}
