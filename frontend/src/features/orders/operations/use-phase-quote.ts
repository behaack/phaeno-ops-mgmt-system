import { useMutation } from '@tanstack/react-query'
import { issuePlatformQuote, isOrderConcurrencyError, type LabServiceOrder, type QuoteLineInput } from '#/api/order-management'

export function usePhaseQuote(order: LabServiceOrder, onSaved: () => Promise<void>, close: () => void, sourceQuote?: { id: string } | null) {
  return useMutation({ mutationFn: (input: { currency: string; expiresAt: string; pricingDecisionReason: string; lines: QuoteLineInput[]; deliveryTargetBusinessDays?: number }) =>
    issuePlatformQuote('lab', order.id, { version: order.version, purpose: 'Initial', tax: 0, currency: input.currency,
      lines: input.lines, sourceQuoteId: sourceQuote?.id, deliveryTargetBusinessDays: input.deliveryTargetBusinessDays, expiresAt: input.expiresAt ? `${input.expiresAt}T00:00:00.000Z` : null, pricingDecisionReason: input.pricingDecisionReason || null }),
    onSuccess: async () => { await onSaved(); close() },
    onError: async error => { if (isOrderConcurrencyError(error)) await onSaved() },
  })
}
