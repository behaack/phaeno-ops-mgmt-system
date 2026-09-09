import { useEffect, useReducer } from 'react'
import type { Quote } from '#/api/order-management'

export function currentLabQuote(quotes: Quote[]) {
  const current = quotes.filter(quote => quote.status === 'Issued' || quote.status === 'Expired' || quote.status === 'Accepted')
  const candidates = current.length ? current : quotes
  return candidates.reduce<Quote | null>((latest, quote) => !latest || quote.revision > latest.revision ? quote : latest, null)
}

export function quoteStatusAt(quote: Quote, now: number) {
  if (quote.status === 'Accepted' || quote.acceptedAt) return 'Accepted'
  return quote.status === 'Issued' && new Date(quote.expiresAt).getTime() <= now ? 'Expired' : quote.status
}

/** Keep a visible quote's deadline current while the tab remains open or resumes. */
export function useQuoteStatus(quote: Quote | null) {
  const [, refresh] = useReducer(value => value + 1, 0)
  const expiresAt = quote?.expiresAt
  const status = quote?.status
  const acceptedAt = quote?.acceptedAt
  useEffect(() => {
    if (status !== 'Issued' || acceptedAt || !expiresAt) return
    const deadline = new Date(expiresAt).getTime()
    if (!Number.isFinite(deadline)) return
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      clearTimeout(timer)
      const remaining = deadline - Date.now()
      if (remaining > 0) timer = setTimeout(() => { refresh(); schedule() }, Math.min(remaining, 2_147_483_647))
    }
    const resume = () => { refresh(); schedule() }
    schedule()
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => { clearTimeout(timer); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume) }
  }, [expiresAt, status, acceptedAt])
  return quote ? quoteStatusAt(quote, Date.now()) : null
}
