// Synthetic print fixture only; never imported by production routes.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { SampleShippingPacketPage } from '../../src/features/sample-shipping/SampleShippingPacketPage'
import { StockKitBarcodeDialog } from '../../src/features/orders/stock-kits/StockKitBarcodeDialog'
import type { ShippingStockKit } from '../../src/api/shipping-containers'
import { LabLabelDialog } from '../../src/features/lab-operations/LabLabelDialog'
import type { LabContainer } from '../../src/api/lab-operations'
import { api } from '../../src/api/client'
import '../../src/styles.css'

const packet = {
  shipment: { organizationName: 'Example Research Laboratory', shipmentNumber: 'SHP-EXAMPLE', authorizationReference: 'JOB-EXAMPLE', currentPacket: { id: 'packet-example', packetNumber: 'SP-EXAMPLE-1', barcode: 'PH-P-23456789AB-C', revision: 1 } },
  destinationSnapshotJson: JSON.stringify({ receivingEmail: 'receiving@example.test', receivingPhone: '+1 555 0100', organizationName: 'Example receiving laboratory' }),
  instructionSnapshotJson: JSON.stringify({ samples: [{ sampleType: { name: 'Extracted RNA', temperatureRequirements: 'Keep frozen. Transfer promptly to the designated frozen storage location.', safetyRequirements: 'Wear gloves when handling tubes.' }, instructionRule: { packingInstructions: 'Use the approved packing configuration and review the full instructions before shipping.' } }] }),
  manifestSnapshotJson: JSON.stringify({ authorizationReference: 'JOB-EXAMPLE', shipmentNumber: 'SHP-EXAMPLE', orderBarcode: 'PH-O-EXAMPLE', shipmentBarcode: 'PH-S-EXAMPLE', container: { commonName: '20-tube insulated container', sku: '000-20' }, containerKit: { barcode: 'KIT-58073414ED6C47109A3E073EE5F9311F' }, samples: Array.from({ length: 20 }, (_, i) => ({ submittedSpecimenId: `sample-${Math.floor(i / 2)}`, customerSampleId: `RNA-${Math.floor(i / 2) + 1}`, sampleName: 'Synthetic RNA', sampleTypeName: 'RNA', sampleBarcode: `PH-M-${Math.floor(i / 2)}`, totalSampleTubeCount: 2, tubeOrdinal: i % 2 + 1, supplierTubeBarcode: i === 0 ? 'Tube_001' : `TUBE-${i + 1}` })) }),
}
const container: LabContainer = { id: 'container-example', labSpecimenId: 'sample-1', parentContainerId: null, kind: 'SubmittedSpecimen', barcode: 'PH-S-23456789AB-C', barcodeSource: 'PhaenoGenerated', externalBarcodeReferenceId: null, label: 'Submitted specimen ACC-1', labelPrintCount: 0, location: 'Freezer box A', quantity: 25, quantityUnit: 'uL', status: 'Available', retainUntilUtc: null, version: 1 }
const labLabel = { container, accessionNumber: 'ACC-1', commercialOrderNumber: 'LAB-1001', parentBarcode: 'PH-S-PARENT', printHistory: [] }
const kit: ShippingStockKit = { id: 'kit-example', kitNumber: 'KIT-58073414ED6C47109A3E073EE5F9311F', container: { definitionId: 'container-example', commonName: '20-tube insulated container', sku: '000-20', capacity: 20 }, tubeSupplierName: 'Example', tubeProductNumber: 'Example', tubeLotNumber: null, shipperSupplierName: 'Example', shipperProductNumber: 'Example', status: 'Available', organizationId: null, authorizationSourceId: null, authorizationReference: null, boundSampleShipmentId: null, outboundCarrier: null, outboundTrackingNumber: null, fulfilledAt: null, version: 1, tubes: [] }
const kitMode = new URLSearchParams(window.location.search).has('stockKit')
const labMode = new URLSearchParams(window.location.search).has('labLabel')
api.defaults.adapter = async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data: labMode ? labLabel : packet, error: null } })
const root = createRootRoute({ component: Outlet })
const route = createRoute({ getParentRoute: () => root, path: '/e2e/fixtures/shipping-insert.html', component: () => kitMode ? <StockKitBarcodeDialog kit={kit} onClose={() => undefined} /> : labMode ? <LabLabelDialog container={container} onClose={() => undefined} onRecorded={() => Promise.resolve()} /> : <SampleShippingPacketPage shipmentId="example" /> })
const router = createRouter({ routeTree: root.addChildren([route]) })
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
