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

export function resolveLabReceiptTab(tab: LabReceiptTab | undefined, shipmentId: string | undefined, canManageKits: boolean): LabReceiptTab {
  const requested = labReceiptTabs.find(item => item.value === tab)
  if (requested && (!requested.requiresKitManagement || canManageKits)) return requested.value
  if (shipmentId) return 'return-kits'
  return canManageKits ? 'kit-requests' : 'receiving'
}
