import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CustomerLocaleContext, useCustomerText, useCustomerSourceText, useCustomerDateFormatter } from './customer-text'
import type { ReactNode } from 'react'
import { useDocumentationMessages } from '#/features/documentation/documentation-localization'
import { useWorkMessages } from '#/features/work-attention/work-messages'

function scope(customer: boolean, pseudo: boolean) {
  return ({ children }: { children: ReactNode }) => <CustomerLocaleContext.Provider value={{ customer, pseudo, locale: 'en-US' }}>{children}</CustomerLocaleContext.Provider>
}

describe('Customer-only message boundaries', () => {
  it('localizes shipping-readiness feedback only within the Customer boundary', () => {
    const customer = renderHook(useWorkMessages, { wrapper: scope(true, true) })
    expect(customer.result.current.text('orders.shippingBlocked')).not.toBe('Review shipping readiness with Phaeno')
    const staff = renderHook(useWorkMessages, { wrapper: scope(false, true) })
    expect(staff.result.current.text('orders.shippingBlocked')).toBe('Review shipping readiness with Phaeno')
  })
  it('uses the Customer display locale without changing the timestamp or other audience formatting', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <CustomerLocaleContext.Provider value={{ customer: true, pseudo: true, locale: 'en-US' }}>{children}</CustomerLocaleContext.Provider>
    const { result } = renderHook(() => useCustomerDateFormatter(true), { wrapper })
    const timestamp = new Date('2026-10-11T12:34:56Z')
    expect(result.current.format(timestamp)).toBe(new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(timestamp))
    expect(timestamp.toISOString()).toBe('2026-10-11T12:34:56.000Z')
    const staff = renderHook(() => useCustomerDateFormatter(true), { wrapper: scope(false, true) })
    expect(staff.result.current.format(timestamp)).toBe(result.current.format(timestamp))
  })
  it.each([false, true])('keeps non-Customer copy English with pseudo=%s', pseudo => {
    const { result } = renderHook(useCustomerText, { wrapper: scope(false, pseudo) })
    expect(result.current('shipment_search')).toBe('Search shipments or Job reference')
  })
  it('expands Customer copy without changing parameter values', () => {
    const { result } = renderHook(useCustomerText, { wrapper: scope(true, true) })
    const value = result.current('packing_reset_many_many', { p0: 'RNA-ATCG-17', p1: '0.000000123456' })
    expect(value).toContain('RNA-ATCG-17')
    expect(value).toContain('0.000000123456')
    expect(value).not.toContain('selected containers')
  })
  it('keeps raw identifiers and scientific content intact when translating shared source text', () => {
    const { result } = renderHook(useCustomerSourceText, { wrapper: scope(true, true) })
    expect(result.current('RNA-ATCG-17')).toBe('RNA-ATCG-17')
    expect(result.current('NM_001.7 / ENST000000001; 0.15 uL')).toBe('NM_001.7 / ENST000000001; 0.15 uL')
    expect(result.current('Shipment status')).not.toBe('Shipment status')
  })
  it('localizes shared help dictionaries only for Customer and preserves dynamic review parameters', () => {
    const customer = renderHook(useDocumentationMessages, { wrapper: scope(true, true) })
    expect(customer.result.current.search.label).not.toBe('Search documentation')
    expect(customer.result.current.reviewed('2026-10-11 RNA-ATCG-17')).toContain('2026-10-11 RNA-ATCG-17')
    expect(customer.result.current.search.page(123, 456)).toContain('123')
    const staff = renderHook(useDocumentationMessages, { wrapper: scope(false, true) })
    expect(staff.result.current.search.label).toBe('Search documentation')
    expect(staff.result.current.reviewed('2026-10-11')).toBe('Reviewed 2026-10-11')
  })
})
