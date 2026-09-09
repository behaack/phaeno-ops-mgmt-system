import type { CustomerDeliveryLocation } from '#/api/customer-delivery-locations'
import type { TransportationKitRequest, TransportationKitRequestDetail } from '#/api/transportation-kit-requests'

export const deliveryLocationFixture: CustomerDeliveryLocation = {
  id: '10000000-0000-4000-8000-000000000001', organizationId: '10000000-0000-4000-8000-000000000002', departmentId: '10000000-0000-4000-8000-000000000003',
  label: 'Main laboratory', recipient: 'Receiving desk', line1: '100 Science Avenue', line2: 'Building B', city: 'Research City', region: 'CA', postalCode: '90001', countryCode: 'US', phone: null, deliveryInstructions: 'Deliver to the reception desk during business hours.', isDefault: true, isActive: true, version: 2,
}
export const kitRequestFixture: TransportationKitRequest = {
  id: '20000000-0000-4000-8000-000000000001', jobId: '20000000-0000-4000-8000-000000000002', jobNumber: 'TEST-JOB', organizationId: deliveryLocationFixture.organizationId, organizationName: 'Example Customer', departmentId: deliveryLocationFixture.departmentId, departmentName: 'Research', deliveryLocationId: deliveryLocationFixture.id, deliveryAddress: deliveryLocationFixture,
  status: 'Pending', requestedAt: '2026-09-08T12:00:00Z', version: 3, includedInLabOrder: true,
  lines: [{ id: '20000000-0000-4000-8000-000000000003', containerDefinitionId: '20000000-0000-4000-8000-000000000004', sku: 'TRANS-20', commonName: '20-tube transportation kit', tubeCapacity: 20, requestedQuantity: 2, dispatchedQuantity: 0, receivedQuantity: 0 }], kits: [], canConfirmReceipt: false, canCancel: true, cancellationReason: null,
}
export const kitRequestDetailFixture: TransportationKitRequestDetail = {
  request: kitRequestFixture, canDispatch: true, dispatchBlockedReason: null,
  availableStockKits: [1, 2, 3].map(value => ({ id: `30000000-0000-4000-8000-00000000000${value}`, kitNumber: `KIT-00${value}`, containerDefinitionId: kitRequestFixture.lines[0].containerDefinitionId, sku: 'TRANS-20', commonName: '20-tube transportation kit', tubeCapacity: 20, version: 1 })),
}
