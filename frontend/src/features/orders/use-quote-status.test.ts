import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Quote } from '#/api/order-management'
import { currentLabQuote, quoteStatusAt, useQuoteStatus } from './use-quote-status'

const quote = { id: 'quote', revision: 1, status: 'Issued', expiresAt: '2026-09-08T12:00:00Z', acceptedAt: null } as Quote
afterEach(() => vi.useRealTimers())

describe('quote deadlines', () => {
  it('changes a visible quote at the deadline without navigation or a refresh', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T11:59:59Z'))
    const { result } = renderHook(() => useQuoteStatus(quote))
    expect(result.current).toBe('Issued')
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toBe('Expired')
  })
  it('refreshes on returning to a tab and never expires accepted or superseded revisions', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T11:00:00Z'))
    const { result } = renderHook(() => useQuoteStatus(quote))
    vi.setSystemTime(new Date('2026-09-08T13:00:00Z'))
    act(() => window.dispatchEvent(new Event('focus')))
    expect(result.current).toBe('Expired')
    expect(quoteStatusAt({ ...quote, status: 'Accepted' }, Date.now())).toBe('Accepted')
    expect(quoteStatusAt({ ...quote, status: 'Superseded' }, Date.now())).toBe('Superseded')
  })
  it('uses the latest current expired revision regardless of list order', () => {
    const latest = { ...quote, id: 'latest', revision: 3, status: 'Expired' }
    expect(currentLabQuote([{ ...quote, status: 'Superseded' }, latest, { ...quote, revision: 2, status: 'Superseded' }])).toBe(latest)
  })
  it('keeps the latest accepted revision ahead of an older legacy expired quote', () => {
    const accepted = { ...quote, id: 'accepted', revision: 2, status: 'Accepted' }
    expect(currentLabQuote([{ ...quote, status: 'Expired' }, accepted])).toBe(accepted)
  })
})
