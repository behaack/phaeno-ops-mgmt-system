import type { ShippingStockKit } from '#/api/shipping-containers'
export const stockKitStates = ['Preparing', 'Ready', 'OnTheWay', 'Available', 'Assigned', 'InUse', 'NeedsReview'] as const
export type StockKitState = typeof stockKitStates[number]
export type StockKitListSearch = { kitSearch?: string; kitStatus?: 'all' | StockKitState; kitPage?: number }
export function parseStockKitListSearch(search: Record<string, unknown>): StockKitListSearch {
  const page = Number(search.kitPage)
  const status = search.kitStatus === 'Fulfilled' ? 'OnTheWay' : search.kitStatus === 'Bound' ? 'InUse' : search.kitStatus
  return { kitSearch: typeof search.kitSearch === 'string' ? search.kitSearch.slice(0, 255) : undefined, kitStatus: stockKitStates.includes(status as StockKitState) ? status as StockKitState : 'all', kitPage: Number.isSafeInteger(page) && page > 0 ? page : 1 }
}
export function stockKitState(kit: ShippingStockKit): StockKitState {
  if (kit.status === 'Preparing') return kit.tubes.length === kit.container.capacity ? 'Ready' : 'Preparing'
  if (kit.status === 'Bound') return 'InUse'
  if (kit.status === 'Fulfilled') return kit.customerReceivedAt ? 'Available' : 'OnTheWay'
  return kit.status
}
export function stockKitStatus(state: StockKitState) {
  return { Preparing: 'Preparing', Ready: 'Ready at Phaeno', OnTheWay: 'On the way', Available: 'Available', Assigned: 'Assigned', InUse: 'In use', NeedsReview: 'Needs review' }[state]
}
