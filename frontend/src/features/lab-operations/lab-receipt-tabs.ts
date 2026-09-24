export const labReceiptTabs = [
  { value: 'kit-requests', label: 'Kit requests', requiresKitManagement: true },
  { value: 'standard-kits', label: 'Prepare kits', requiresKitManagement: true },
  { value: 'return-kits', label: 'Kits sent', requiresKitManagement: false },
  { value: 'receiving', label: 'Receive shipments', requiresKitManagement: false },
  { value: 'accession', label: 'Accession samples', requiresKitManagement: false },
] as const

export type LabReceiptTab = typeof labReceiptTabs[number]['value']

export function parseLabReceiptTab(value: unknown): LabReceiptTab | undefined {
  return labReceiptTabs.find(tab => tab.value === value)?.value
}

export function resolveLabReceiptTab(tab: LabReceiptTab | undefined): LabReceiptTab {
  if (tab === 'accession') return 'accession'
  return 'receiving'
}

export function resolveTransportationKitTab(tab: LabReceiptTab | undefined, canManageKits: boolean): LabReceiptTab {
  if (tab === 'kit-requests' && canManageKits) return tab
  if (tab === 'return-kits') return tab
  return canManageKits ? 'standard-kits' : 'return-kits'
}
