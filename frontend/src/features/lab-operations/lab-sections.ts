import type { LabReceiptTab } from './lab-receipt-tabs'

export type LabSection = 'receipt' | 'jobs' | 'work' | 'results' | 'release' | 'kits' | 'assembly' | 'protocols' | 'reagent-runs' | 'master-mixes' | 'kit-requests' | 'transportation-kits' | 'batches'
export function parseLabSection(value: unknown): LabSection | undefined {
  return typeof value === 'string' && ['receipt', 'jobs', 'work', 'results', 'release', 'kits', 'assembly', 'reagent-runs', 'master-mixes', 'kit-requests', 'transportation-kits', 'batches'].includes(value) ? value as LabSection : undefined
}

export function resolveLabWorkspaceSection(section: LabSection | undefined, receiptTab: LabReceiptTab | undefined): LabSection {
  if (!section || section === 'receipt' || section === 'transportation-kits') {
    if (receiptTab === 'standard-kits') return 'transportation-kits'
    if (receiptTab === 'kit-requests' || receiptTab === 'return-kits') return 'kit-requests'
    if (!section && (receiptTab === 'receiving' || receiptTab === 'accession')) return 'receipt'
  }
  return section ?? 'jobs'
}
