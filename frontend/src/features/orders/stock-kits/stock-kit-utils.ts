import type { ShippingStockKit } from '#/api/shipping-containers'
export type StockKitListSearch = { kitSearch?: string; kitStatus?: 'all' | ShippingStockKit['status']; kitPage?: number }
export function parseStockKitListSearch(search: Record<string, unknown>): StockKitListSearch {
  const page = Number(search.kitPage)
  return { kitSearch: typeof search.kitSearch === 'string' ? search.kitSearch.slice(0, 255) : undefined, kitStatus: ['Preparing', 'Fulfilled', 'Bound'].includes(String(search.kitStatus)) ? search.kitStatus as ShippingStockKit['status'] : 'all', kitPage: Number.isSafeInteger(page) && page > 0 ? page : 1 }
}
export function stockKitStatus(status: ShippingStockKit['status']) { return status === 'Fulfilled' ? 'Sent to customer' : status === 'Bound' ? 'Assigned to return container' : 'Preparing' }
