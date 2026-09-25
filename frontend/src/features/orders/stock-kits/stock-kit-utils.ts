import type { ShippingStockKit } from '#/api/shipping-containers'
export const stockKitStates = ['Preparing', 'Ready', 'OnTheWay', 'Available', 'Assigned', 'InUse', 'NeedsReview'] as const
export type StockKitState = typeof stockKitStates[number]
export type StockKitStatusFilter = 'inventory' | 'shipped' | 'all' | StockKitState
export type StockKitListSearch = { kitSearch?: string; kitStatus?: StockKitStatusFilter; kitPage?: number }
export function parseStockKitListSearch(search: Record<string, unknown>): StockKitListSearch {
  const page = Number(search.kitPage)
  const status = search.kitStatus === 'Fulfilled' ? 'OnTheWay' : search.kitStatus === 'Bound' ? 'InUse' : search.kitStatus
  return { kitSearch: typeof search.kitSearch === 'string' ? search.kitSearch.slice(0, 255) : undefined, kitStatus: status === 'inventory' || status === 'shipped' || status === 'all' || stockKitStates.includes(status as StockKitState) ? status as StockKitStatusFilter : 'inventory', kitPage: Number.isSafeInteger(page) && page > 0 ? page : 1 }
}
export function stockKitState(kit: ShippingStockKit): StockKitState {
  if (kit.status === 'Preparing') return kit.tubesVerifiedAt && (!kit.finishedKitProductId || kit.assemblyCompletedAt) && kit.tubes.length === kit.container.capacity ? 'Ready' : 'Preparing'
  if (kit.status === 'Bound') return 'InUse'
  if (kit.status === 'Fulfilled') return kit.customerReceivedAt ? 'Available' : 'OnTheWay'
  return kit.status
}
export function stockKitStatus(state: StockKitState) {
  return { Preparing: 'Preparing', Ready: 'Ready at Phaeno', OnTheWay: 'On the way', Available: 'Available', Assigned: 'Assigned', InUse: 'In use', NeedsReview: 'Needs review' }[state]
}
export function stockKitMatchesStatusFilter(kit: ShippingStockKit, filter: StockKitStatusFilter = 'inventory') {
  const state = stockKitState(kit)
  if (filter === 'inventory') return state === 'Preparing' || state === 'Ready'
  if (filter === 'shipped') return state !== 'Preparing' && state !== 'Ready'
  return filter === 'all' || state === filter
}
