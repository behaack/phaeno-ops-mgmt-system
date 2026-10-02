import type { LabSampleTubeWorkspace, LabServiceOrder } from '#/api/order-management'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import type { TransportationKitRequest } from '#/api/transportation-kit-requests'
import type { LabPhase } from '#/api/lab-phases'

export function currentShippingPhase(phases?: LabPhase[], order?: LabServiceOrder, pairs?: LabSampleTubeWorkspace, shipments: SampleShipmentWorkflow[] = []) {
  return phases?.filter(p => !['Cancelled', 'Superseded'].includes(p.lifecycle))
    .sort((a, b) => a.position - b.position)
    .find(p => !order || !phaseShippingProgress(p, order, [], pairs, shipments).allSent)
}

export function phaseShippingProgress(phase: Pick<LabPhase, 'id' | 'sampleCount'>, order: LabServiceOrder, requests: TransportationKitRequest[], pairs?: LabSampleTubeWorkspace, shipments: SampleShipmentWorkflow[] = []) {
  const phaseId = phase.id
  const request = requests.find(r => r.phaseId === phaseId && r.status !== 'Cancelled')
  const kits = pairs?.kits.filter(k => k.phaseId === phaseId && k.isUsable === true) ?? []
  const prepared = pairs?.preparedPhaseIds?.includes(phaseId) === true
  const sampleIds = new Set(order.samples.filter(s => s.phaseId === phaseId).map(s => s.id))
  const hasMixedPhaseShipment = shipments.some(s => s.status !== 'Cancelled' && s.crosswalk.some(row => sampleIds.has(row.submittedSpecimenId)) && s.crosswalk.some(row => !sampleIds.has(row.submittedSpecimenId)))
  const phaseShipments = shipments.filter(s => s.status !== 'Cancelled' && s.crosswalk.length > 0
    && s.crosswalk.every(row => sampleIds.has(row.submittedSpecimenId)))
  const allocatedCapacity = kits.reduce((total, kit) => {
    const pairedCount = pairs?.pairs.filter(pair => pair.phaseId === phaseId && pair.stockKitId === kit.id).length ?? 0
    return total + pairedCount + (kit.finishedAt ? 0 : kit.availableTubeCount)
  }, 0)
  const usesReceivedStock = !request && phase.sampleCount > 0 && allocatedCapacity >= phase.sampleCount
  const requested = Boolean(request || usesReceivedStock || prepared)
  const received = prepared || request?.status === 'Received' || usesReceivedStock
  const receiveStatus = usesReceivedStock ? 'Received · existing stock'
    : request?.status === 'Received' ? 'Received'
    : request && (request.kits.some(kit => kit.receivedAt) || request.lines.some(line => line.receivedQuantity > 0)) ? 'Partially received'
    : request?.status === 'Dispatched' ? 'Sent'
    : request?.status === 'PartiallyDispatched' ? 'Partially sent'
    : request?.status === 'Pending' ? 'Request received' : null
  const shippedSampleIds = new Set(phaseShipments.filter(s => s.shippedAt).flatMap(s => s.crosswalk.map(row => row.submittedSpecimenId)))
  const allSent = prepared && !hasMixedPhaseShipment && phase.sampleCount > 0 && sampleIds.size === phase.sampleCount && phaseShipments.length > 0 && phaseShipments.every(s => Boolean(s.shippedAt))
    && [...sampleIds].every(id => shippedSampleIds.has(id))
  const next = !requested ? 'request' : !received ? 'receive' : !prepared ? 'prepare' : !allSent ? 'send' : null
  return { request, kits, prepared, requested, received, usesReceivedStock, receiveStatus, allSent, next, phaseShipments }
}
