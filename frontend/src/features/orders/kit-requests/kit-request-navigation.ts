import type { TransportationKitRequest } from '#/api/transportation-kit-requests'
export type KitRequestListSearch = { requestSearch?: string; requestStatus?: 'open' | 'all' | TransportationKitRequest['status']; requestPage?: number }
export const kitRequestStatuses: TransportationKitRequest['status'][] = ['Pending', 'PartiallyDispatched', 'Dispatched', 'Received', 'Cancelled']
export function parseKitRequestSearch(value: Record<string, unknown>): KitRequestListSearch {
  const page = Number(value.requestPage)
  return { requestSearch: typeof value.requestSearch === 'string' ? value.requestSearch.slice(0, 255) : undefined, requestStatus: ['all', ...kitRequestStatuses].includes(String(value.requestStatus)) ? value.requestStatus as KitRequestListSearch['requestStatus'] : 'open', requestPage: Number.isSafeInteger(page) && page > 0 ? page : 1 }
}
export function kitRequestStatus(value: TransportationKitRequest['status']) { return value === 'PartiallyDispatched' ? 'Partially dispatched' : value }
export function kitRequestReference(value: TransportationKitRequest) { return `Request ${value.id.slice(0, 8).toUpperCase()}` }
