import type { CrmLeadStatus, CrmTaskStatus } from '#/api/crm'
import type { RelationshipRequestStatus } from '#/api/organization-management'
import type { StatusTone } from '#/components/ui/status-badge'

export const leadTones = { New: 'pending', Working: 'info', Qualified: 'success', Disqualified: 'neutral', Converted: 'success' } satisfies Record<CrmLeadStatus, StatusTone>
export const taskTones = { Open: 'pending', InProgress: 'info', Blocked: 'error', Completed: 'success', Cancelled: 'neutral' } satisfies Record<CrmTaskStatus, StatusTone>
export const relationshipTones = { PendingReview: 'pending', Approved: 'info', Declined: 'neutral', Applied: 'success', Cancelled: 'neutral' } satisfies Record<RelationshipRequestStatus, StatusTone>
export const handoffTones = { Draft: 'neutral', Pending: 'pending', PendingReview: 'pending', Ready: 'info', Applied: 'success', Completed: 'success', Failed: 'error', Cancelled: 'neutral', Blocked: 'warning' } as const
