import { StatusBadge, type StatusTone } from '#/components/ui/status-badge'

export const orderStatusTones: Readonly<Record<string, StatusTone>> = {
  Draft: 'neutral', DraftRequest: 'neutral', Internal: 'neutral', Withdrawn: 'neutral',
  Submitted: 'pending', SubmittedForQuote: 'pending', UnderReview: 'pending', IntakeValidation: 'pending',
  QuoteInPreparation: 'pending', QuoteIssued: 'pending', Placed: 'pending', PlacedQueued: 'pending',
  PlacedAwaitingSamples: 'pending', Expected: 'pending', Pending: 'pending', AwaitingShipment: 'pending',
  AwaitingSubmission: 'pending', CancellationRequested: 'warning', ChangesRequested: 'warning',
  OnHold: 'warning', PaymentHold: 'warning', CommercialReviewRequired: 'warning', Expired: 'warning',
  Accepted: 'info', Received: 'info', Accessioned: 'info', Processing: 'info', InProgress: 'info',
  LabAnalysis: 'info', DataProcessing: 'info', PreparingInputs: 'info', Scanning: 'info',
  PartiallyShipped: 'info', Shipped: 'info', OutputReview: 'pending', OutputAvailable: 'info',
  ResultsAvailable: 'info', DataAvailable: 'info', Ready: 'info', Released: 'success', ResultsReleased: 'success',
  Completed: 'success', Fulfilled: 'success', Clean: 'success', Succeeded: 'success',
  Cancelled: 'neutral', Canceled: 'neutral', Replaced: 'neutral', Declined: 'neutral',
  Rejected: 'error', Failed: 'error', Unavailable: 'warning',
}

export function orderStatusTone(status: string): StatusTone { return orderStatusTones[status] ?? 'neutral' }

export function OrderStatusBadge({ status }: { status: string }) {
  return <StatusBadge tone={orderStatusTone(status)}>{humanizeStatus(status)}</StatusBadge>
}

export function humanizeStatus(status: string) {
  if (status === 'DraftRequest') return 'Draft'
  if (status === 'SubmittedForQuote') return 'Submitted for pricing'
  return status
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}
