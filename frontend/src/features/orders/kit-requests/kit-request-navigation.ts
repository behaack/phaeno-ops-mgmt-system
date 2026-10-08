import type { TransportationKitRequest } from '#/api/transportation-kit-requests'
export type KitRequestListSearch = { kitQueue?: 'requests' | 'sent'; kitShipmentSearch?: string; kitShipmentPage?: number; requestSearch?: string; requestStatus?: 'open' | 'sent' | 'received' | 'all' | TransportationKitRequest['status']; requestPage?: number }
export const kitRequestStatuses: TransportationKitRequest['status'][] = ['Pending', 'PartiallyDispatched', 'Dispatched', 'Received', 'Cancelled']
export function parseKitRequestSearch(value: Record<string, unknown>): KitRequestListSearch {
  const page = Number(value.requestPage)
  const shipmentPage = Number(value.kitShipmentPage)
  return { kitShipmentPage: Number.isSafeInteger(shipmentPage) && shipmentPage > 0 && shipmentPage <= 2147483647 ? shipmentPage : 1, kitShipmentSearch: typeof value.kitShipmentSearch === 'string' ? value.kitShipmentSearch.slice(0, 255) : undefined, kitQueue: value.kitQueue === 'requests' || value.kitQueue === 'sent' ? value.kitQueue : undefined, requestSearch: typeof value.requestSearch === 'string' ? value.requestSearch.slice(0, 255) : undefined, requestStatus: ['open', 'sent', 'received', 'all', ...kitRequestStatuses].includes(String(value.requestStatus)) ? value.requestStatus as KitRequestListSearch['requestStatus'] : 'open', requestPage: Number.isSafeInteger(page) && page > 0 ? page : 1 }
}
export function kitRequestStatus(value: TransportationKitRequest['status']) { return value === 'PartiallyDispatched' ? 'Partially dispatched' : value }
export function kitRequestReference(value: TransportationKitRequest) { return `Request ${value.id.slice(0, 8).toUpperCase()}` }
