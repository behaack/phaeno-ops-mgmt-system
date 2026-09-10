import { api } from './client'

export type LabShipmentQueueItem = {
  id: string
  shipmentNumber: string
  organizationName: string
  authorizationReference: string
  labWorkOrderId: string
  destinationName: string
  status: string
  carrier: string | null
  trackingNumber: string | null
  shippedAt: string | null
  containerReceivedAt: string | null
  packetBarcode: string | null
  packetNumber: string | null
  expectedTubeCount: number
  accessionedTubeCount: number
}

export type LabShipmentReceipt = {
  shipmentId: string
  shipmentNumber: string
  barcode: string
  receivedAt: string
  alreadyReceived: boolean
}

type Envelope<T> = { success: boolean; data: T; error?: { message?: string } | null }

function unwrap<T>(envelope: Envelope<T>) {
  if (!envelope.success) throw new Error(envelope.error?.message ?? 'The laboratory request failed.')
  return envelope.data
}

export async function getLabShipmentQueue(received: boolean) {
  const response = await api.get<Envelope<LabShipmentQueueItem[]>>('/platform/lab-operations/shipments/queue', { params: { received } })
  return unwrap(response.data)
}

export async function receiveLabShipment(barcode: string) {
  const response = await api.post<Envelope<LabShipmentReceipt>>('/platform/lab-operations/shipments/receipt', { barcode })
  return unwrap(response.data)
}
