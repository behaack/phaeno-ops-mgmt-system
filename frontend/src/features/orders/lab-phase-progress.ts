import { humanizeStatus } from './OrderStatusBadge'

export function customerStage(stage: string, internal: boolean) {
  if (!internal && ['AwaitingAcceptance', 'ReadyForPreparation'].includes(stage)) return 'Received'
  return humanizeStatus(stage)
}
export function phaseProgress(counts: Record<string, number>, internal: boolean) {
  const grouped: Record<string, number> = {}
  for (const [stage, count] of Object.entries(counts)) {
    const label = customerStage(stage, internal)
    grouped[label] = (grouped[label] ?? 0) + count
  }
  return Object.entries(grouped).map(([label, count]) => `${count} ${label}`).join(' · ')
}
