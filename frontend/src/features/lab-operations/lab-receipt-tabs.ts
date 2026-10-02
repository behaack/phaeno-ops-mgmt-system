export const labReceiptTabs = ['kit-requests', 'standard-kits', 'return-kits', 'receiving', 'accession'] as const

export type LabReceiptTab = typeof labReceiptTabs[number]

export function parseLabReceiptTab(value: unknown): LabReceiptTab | undefined {
  return labReceiptTabs.find(tab => tab === value)
}

export function resolveLabReceiptTab(tab: LabReceiptTab | undefined): LabReceiptTab {
  if (tab === 'kit-requests' || tab === 'return-kits') return 'kit-requests'
  if (tab === 'accession') return 'accession'
  if (tab === 'receiving') return 'receiving'
  return 'kit-requests'
}
