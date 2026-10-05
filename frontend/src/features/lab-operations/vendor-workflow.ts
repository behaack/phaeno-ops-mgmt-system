import type { LabBatch } from '#/api/lab-operations'
import type { SequencingTubeMember } from '#/api/lab-material-transfers'
import { meetsMinimumSequencingVolume } from './decimal-quantity'

export function shipmentPairIssue(member: SequencingTubeMember): string | null {
  if (!member.transfer || !member.sequencingTube) return 'Record the physical tube transfer.'
  if (member.sequencingTube.status !== 'Available') return 'Confirm an available sequencing tube.'
  if (!member.requirementCaptured || member.minimumSequencingVolumeUl === null) return 'Capture the Catalog minimum.'
  if (member.sequencingTube.quantity === null || !member.sequencingTube.quantityUnit) return 'Verify sequencing tube volume and units.'
  const minimum = member.minimumSequencingVolumeUlText ?? String(member.minimumSequencingVolumeUl)
  if (!meetsMinimumSequencingVolume(member.transfer.quantityText ?? String(member.transfer.quantity), member.transfer.quantityUnit, minimum)
    || !meetsMinimumSequencingVolume(member.sequencingTube.quantityText ?? String(member.sequencingTube.quantity), member.sequencingTube.quantityUnit, minimum)) return 'Meet the captured Catalog minimum using a supported volume unit.'
  return null
}

export function vendorNextStep(status: string | null): string {
  return ({
    Preparing: 'Review the saved destination, carrier, tracking and tube manifest. After physical dispatch, choose Actions → Mark shipped.',
    Shipped: 'When the vendor confirms receipt, choose Actions → Mark vendor received and review the completion ETA.',
    ReceivedByProvider: 'When the vendor confirms sequencing has begun, choose Actions → Mark sequencing.',
    Sequencing: 'When the vendor delivers results, choose Actions → Mark results received.',
    ResultsReceived: 'Add external storage references, then review and record the final batch outcome and any library exceptions.',
  } as Record<string, string>)[status ?? ''] ?? 'Prepare the vendor shipment after reviewing the tube pairs.'
}

export function vendorStage(batch: LabBatch): string {
  if (batch.vendorOutcome) return batch.vendorOutcome
  if (batch.sendoutStatus === 'Complete') return 'Complete · outcome unrecorded'
  return batch.sendoutStatus ? vendorStageName(batch.sendoutStatus) : batch.status === 'Complete' ? 'Complete · outcome unrecorded' : 'Prepare shipment'
}
export function vendorStageName(status: string): string {
  return ({ Preparing: 'Prepare shipment', Shipped: 'Shipped', ReceivedByProvider: 'Vendor received', Sequencing: 'Sequencing', ResultsReceived: 'Results received' } as Record<string, string>)[status] ?? status
}
export function nextVendorStage(status: string | null): string | null {
  return status ? ({ Preparing: 'Shipped', Shipped: 'ReceivedByProvider', ReceivedByProvider: 'Sequencing', Sequencing: 'ResultsReceived' } as Record<string, string>)[status] ?? null : null
}
export function vendorEtaOverdue(batch: LabBatch): boolean {
  return Boolean(batch.expectedCompletionAtUtc && new Date(batch.expectedCompletionAtUtc).getTime() < Date.now() && batch.sendoutStatus && !['ResultsReceived', 'Complete'].includes(batch.sendoutStatus))
}
