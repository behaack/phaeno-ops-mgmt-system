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
    ReceivedByProvider: 'When the vendor returns its report or data, choose Actions → Record results for run details, library outcomes and locations.',
    Complete: 'Use Actions → Edit results to update the recorded result with a note.',
  } as Record<string, string>)[status ?? ''] ?? 'Prepare the vendor shipment after reviewing the tube pairs.'
}

export function vendorStage(batch: LabBatch): string {
  if (batch.runNotPerformed === true) return 'Run not performed'
  return batch.sendoutStatus ? vendorStageName(batch.sendoutStatus) : 'Prepare shipment'
}
export function canRecordVendorResults(batch: LabBatch): boolean {
  return Boolean(batch.sendoutId && (batch.status === 'InProgress' && batch.sendoutStatus === 'ReceivedByProvider'
    || batch.status === 'Complete' && batch.sendoutStatus === 'Complete' && batch.resultsVersion && batch.runNotPerformed !== null && batch.vendorOutcome))
}
export function vendorStageName(status: string): string {
  return ({ Preparing: 'Prepare shipment', Shipped: 'Shipped', ReceivedByProvider: 'Vendor received', Complete: 'Results received' } as Record<string, string>)[status] ?? status
}
export function nextVendorStage(status: string | null): string | null {
  return status ? ({ Preparing: 'Shipped', Shipped: 'ReceivedByProvider' } as Record<string, string>)[status] ?? null : null
}
export function vendorEtaOverdue(batch: LabBatch): boolean {
  return Boolean(batch.status !== 'Complete' && batch.expectedCompletionAtUtc && new Date(batch.expectedCompletionAtUtc).getTime() < Date.now() && batch.sendoutStatus && batch.sendoutStatus !== 'Complete')
}
