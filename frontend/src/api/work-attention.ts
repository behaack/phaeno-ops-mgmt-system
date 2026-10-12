import { api } from './client'
export type WorkKind = 'action' | 'waiting' | 'update'
export type WorkView = 'mine' | 'team' | 'unassigned'
export type WorkItem = { key: string; sourceId: string; targetId: string | null; sourceType: string; domain: string; messageKey: string; recordLabel: string; destination: string; kind: WorkKind; ownerUserId: string | null; ownerName?: string | null; dueAtUtc: string | null; createdAtUtc: string | null; priority: number }
export type WorkAttention = { items: WorkItem[]; page: number; pageSize: number; totalCount: number; actionCount: number; waitingCount: number; updateCount: number; evaluatedAtUtc: string; disabledSources: string[] }
export async function getWorkAttention(params: { view?: WorkView; domain?: string; kind?: WorkKind; page?: number; pageSize?: number; priority?: number }, signal?: AbortSignal) {
  const response = await api.get<{ data: WorkAttention }>('/work-attention', { params, signal })
  return response.data.data
}
const destinations = new Set(['/lab-services/', '/reagent-orders/', '/sample-shipping/', '/order-operations/lab-services/orders/', '/order-operations/lab-services/trials/', '/lab-operations/', '/lab-operations/preparation/', '/lab-operations/batches/', '/lab-operations/assembly-jobs/', '/lab-operations/result-packages/', '/finance/invoice/', '/finance/receipt/', '/finance/reconciliation/', '/finance/customer/', '/crm/tasks?taskId=', '/crm/leads/', '/crm/opportunities/', '/crm/requests?requestId=', '/lab-operations?section=receipt&receiptTab=receiving&shipmentId=', '/lab-operations/kit-requests/', '/operations-recovery?attentionId=', '/operations-recovery?attentionSource=ReleasedDeliverableRetention&sourceId=', '/operations-recovery?attentionSource=ResultOutputPackage&sourceId=', '/operations-recovery?attentionSource=InvitationDeliveryAttempt&sourceId=', '/?dashboardSection=webOps&requestId=', '/?dashboardSection=webOps&deliveryId='])
export function workDestination(item: WorkItem) {
  if (item.destination === '/?dashboardSection=webOps&requestId=') return `/website-operations?section=demo-requests&requestId=${encodeURIComponent(item.targetId ?? item.sourceId)}`
  if (item.destination === '/?dashboardSection=webOps&deliveryId=') return `/website-operations?section=email-delivery&deliveryId=${encodeURIComponent(item.targetId ?? item.sourceId)}`
  if (item.destination === '/data-library/') return `${item.destination}${encodeURIComponent(item.targetId ?? item.sourceId)}`
  if (!destinations.has(item.destination)) return '/dashboard/attention'
  return `${item.destination}${encodeURIComponent(item.targetId ?? item.sourceId)}`
}
