import type { LocationKitInventory, LocationStockKit } from '#/api/transportation-kit-requests'
import { deliveryLocationFixture } from './transportation-kit-requests'

export function locationKit(capacity = 20, overrides: Partial<LocationStockKit> = {}): LocationStockKit {
  return { stockKitId: `stock-${capacity}`, kitNumber: `KIT-${capacity}`, container: { definitionId: `container-${capacity}`, sku: `000-${capacity}`, commonName: `${capacity}-tube container`, capacity }, version: 4, status: 'Available', deliveryLocationId: deliveryLocationFixture.id, requestId: null, originatingJobId: 'cancelled-origin-job', originatingJobNumber: 'OLD-JOB', assignedJobId: null, assignedJobNumber: null, reservedShipmentId: null, boundShipmentId: null, dispatchedAt: '2026-09-08T12:00:00Z', receivedAt: '2026-09-09T12:00:00Z', ...overrides }
}
export const locationInventory: LocationKitInventory = { location: deliveryLocationFixture, kits: [locationKit(), locationKit(10, { status: 'OnTheWay', receivedAt: null })], requests: [], canManageInventory: true }
