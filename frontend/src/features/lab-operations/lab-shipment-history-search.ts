export type ShipmentReceivingView = 'receive' | 'expected' | 'received'
export type ShipmentHistorySearch = { receiptView?: ShipmentReceivingView; shipmentHistorySearch?: string; shipmentHistoryPage?: number }

export function parseShipmentHistorySearch(search: Record<string, unknown>): ShipmentHistorySearch {
  const page = Number(search.shipmentHistoryPage)
  return {
    receiptView: search.receiptView === 'receive' || search.receiptView === 'expected' || search.receiptView === 'received' ? search.receiptView : undefined,
    shipmentHistorySearch: typeof search.shipmentHistorySearch === 'string' ? search.shipmentHistorySearch.slice(0, 255) : undefined,
    shipmentHistoryPage: Number.isSafeInteger(page) && page > 0 && page <= 2147483647 ? page : undefined,
  }
}
