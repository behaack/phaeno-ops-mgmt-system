import type { WorkItem } from '#/api/work-attention'
import type { WorkMessageId } from './work-messages'

export function workPriorityLabel(item: WorkItem): WorkMessageId {
  if (item.kind === 'update') return 'available'
  if (item.kind === 'waiting') return 'waiting'
  if (item.priority === 0) return 'blocked'
  if (item.priority === 1) return 'overdue'
  if (item.priority === 2) return item.dueAtUtc ? 'dueSoon' : 'needsReview'
  return 'routine'
}
