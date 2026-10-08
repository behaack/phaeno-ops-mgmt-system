import type { Quote, TimelineItem } from '#/api/order-management'
import { humanizeStatus } from './OrderStatusBadge'

export function quoteDecisionHistoryLabel(event: TimelineItem, quotes: Quote[]): string {
  const quote = quotes.find(item => item.id === event.childRecordId)
  if (quote?.purpose === 'Initial') {
    if (event.fromStatus === 'QuoteIssued' && event.toStatus === 'QuoteInPreparation')
      return `Changes proposed · Quote revision ${quote.revision}`
    if (event.fromStatus === 'QuoteIssued' && event.toStatus === 'Cancelled' && quote.status === 'Declined')
      return `Quote declined · Revision ${quote.revision}`
  }
  return humanizeStatus(event.toStatus)
}
