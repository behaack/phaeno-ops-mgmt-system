import { useContext } from 'react'
import { CustomerLocaleContext, pseudolocalize } from '#/features/customer-i18n/customer-text'

export const workMessages = {
  countOne: '{p0} item needs attention', countMany: '{p0} items need attention', yourAction: 'Your action', available: 'Available',
  'domain.commercial': 'Commercial', 'domain.crm': 'CRM', 'domain.laboratory': 'Laboratory', 'domain.scientific': 'Scientific', 'domain.fulfillment': 'Fulfillment', 'domain.shipping': 'Shipping', 'domain.finance': 'Finance', 'domain.recovery': 'Recovery', 'domain.web': 'Web Operations', 'domain.data': 'Data', 'domain.access': 'Access',
  title: 'My work', description: 'Your next actions, responsible people and current work.',
  notifications: 'Notifications', openWork: 'View all work', actions: 'Needs attention', waiting: 'Waiting on others', updates: 'Available results and updates',
  myWork: 'My work and eligible unassigned work', team: 'Team work', unassigned: 'Unassigned work', allDomains: 'All work areas', allPriorities: 'All priorities', priorityLabel: 'Work priority',
  loading: 'Loading current work…', unavailable: 'Current work is unavailable. Counts are unknown until the service recovers.',
  mockPaused: 'Connected work is paused in mock-session mode.',
  retry: 'Retry work', empty: 'No outstanding actions in this view.', emptyWaiting: 'No work is waiting on another person in this view.', emptyUpdates: 'No available updates in this view.',
  emptyPage: 'This page has no work items. Choose an earlier page.',
  countsUnavailable: 'Work counts are unavailable. Refresh the counts before relying on totals.',
  unknown: 'Work count unavailable', zero: 'No items require your action', disabled: 'Some queues are disabled. Counts include the enabled sources only.',
  waitingOwner: 'Waiting on your administrator or Phaeno', assigned: 'Assigned to you', otherOwner: 'Assigned to another person', eligible: 'Unassigned · eligible work',
  updated: 'Last refreshed', stale: 'Refreshing current work…', open: 'Open record', due: 'Due', overdue: 'Overdue', blocked: 'Blocked', dueSoon: 'Due soon', routine: 'Pending action',
  'orders.price': 'Review the request and prepare pricing', 'orders.quote': 'Review the current quote', 'orders.correct': 'Review requested changes and resubmit',
  'orders.complete': 'Complete the request', 'orders.samples': 'Continue samples, kits and shipping', 'orders.waiting': 'Phaeno is reviewing or processing this Job',
  'crm.nextAction': 'Record the next action for this Lead', 'crm.stale': 'Review this stale Opportunity and update the follow-up', 'orders.extension': 'Review the quote-extension request', 'access.review': 'Review the Company access request', 'crm.task': 'Complete the linked CRM task', 'trials.review': 'Review Trial scope', 'trials.accept': 'Review and accept Trial scope', 'trials.samples': 'Prepare authorized Trial samples',
  'shipping.receive': 'Review the expected shipment and record actual receipt', 'lab.prepare': 'Continue preparation and required evidence', 'lab.exception': 'Review and resolve the Laboratory exception',
  'lab.vendor': 'Complete the current vendor handoff or result intake', 'lab.deadline': 'Review the delivery commitment and next work', 'results.qc': 'Record or review QC for the exact output package', 'operations.processing': 'Review the saved attempt and recover its attention condition', 'orders.decision': 'Review the cancellation or commercial hold', 'orders.phaseDecision': 'Review the requested phase cancellation', 'results.review': 'Review the exact scientific package',
  'results.release': 'Review publication of the approved package', 'kits.fulfill': 'Prepare or dispatch the requested kits', 'kits.complete': 'Complete the Kit order',
  'finance.allocate': 'Review and allocate unapplied cash', 'finance.reconcile': 'Review submitted reconciliation', 'finance.overdue': 'Review the overdue invoice',
  'operations.recover': 'Review the recorded failure and recover its source', 'web.demo': 'Follow up on the demo request', 'web.recover': 'Review and recover email delivery',
  'results.available': 'Open available result files', 'data.available': 'Open assigned curated data',
  'orders.requestKits': 'Review kit supply for the current phase', 'orders.receiveKits': 'Record the physical arrival of dispatched kits',
  'orders.prepareSamples': 'Prepare samples for the current phase', 'orders.sendSamples': 'Record carrier handoff for this phase',
  'orders.waitKits': 'Wait for Phaeno to dispatch the outstanding kits', 'orders.phaseHold': 'Wait for the phase cancellation decision',
  'orders.shippingBlocked': 'Review shipping readiness with Phaeno',
  'lab.accession': 'Record the intake decision for received specimens', 'finance.tax': 'Review Customer billing and approve the tax decision',
} as const
export type WorkMessageId = keyof typeof workMessages
// Customer locale selection is deliberately bounded to the published locale.
// Other audiences always retain US English, including in pseudolocale review.
export function useWorkMessages() {
  const context = useContext(CustomerLocaleContext)
  const pseudo = context.customer && context.pseudo
  return { locale: 'en-US', text: (id: WorkMessageId) => pseudo ? pseudolocalize(workMessages[id]) : workMessages[id],
    notificationCount: (count: number) => { const source = workMessages[count === 1 ? 'countOne' : 'countMany']; return (pseudo ? pseudolocalize(source) : source).replace('{p0}', new Intl.NumberFormat('en-US').format(count)) } }
}
