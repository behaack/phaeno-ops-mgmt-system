import { describe, expect, it } from 'vitest'
import { formatByteSize, formatDisplayCurrency, formatDisplayDate, formatDisplayNumber, formatDisplayTimestamp, formatRecordedTimestamp } from './display-format'

describe('shared record display',()=>{
  it('preserves the original scientific offset and never invents seconds for minute entries',()=>{
    const stamp='2026-11-01T08:05:07Z'
    expect(formatRecordedTimestamp(stamp,-420,'server')).toBe('Nov 01, 2026, 1:05:07 AM (UTC-07:00)')
    expect(formatRecordedTimestamp(stamp,-420,'minute')).toBe('Nov 01, 2026, 1:05 AM (UTC-07:00)')
    expect(formatRecordedTimestamp(stamp,345,'minute')).toContain('(UTC+05:45)')
    expect(formatRecordedTimestamp('invalid',0,'server')).toBe('Not recorded')
  })
  it('keeps a calendar day fixed across viewer timezones and rejects invalid recorded days',()=>{
    for(const timeZone of ['America/Los_Angeles','Pacific/Kiritimati','UTC']){
      expect(formatDisplayDate('2026-10-22',{timeZone})).toBe('Oct 22, 2026')
      expect(formatDisplayTimestamp('2026-10-22',{timeZone})).toBe('Oct 22, 2026')
    }
    expect(formatDisplayDate('2026-02-30')).toBe('Not recorded')
  })
  it('shows the selected timestamp zone and preserves requested seconds at a day boundary',()=>{
    const utc=formatDisplayTimestamp('2026-10-22T00:05:07Z',{timeZone:'UTC',seconds:true})
    const pacific=formatDisplayTimestamp('2026-10-22T00:05:07Z',{timeZone:'America/Los_Angeles',seconds:true})
    expect(utc).toContain('Oct 22, 2026');expect(utc).toContain(':05:07');expect(utc).toContain('UTC')
    expect(pacific).toContain('Oct 21, 2026');expect(pacific).toContain('PDT')
    expect(formatDisplayTimestamp('2026-01-22T00:05:07Z',{timeZone:'America/Los_Angeles'})).toContain('PST')
  })
  it('uses binary units consistently from zero through large scientific files',()=>{
    expect([0,1023,1024,1536,1024**2,1024**4].map(n=>formatByteSize(n))).toEqual(['0 B','1,023 B','1.0 KiB','1.5 KiB','1.0 MiB','1.0 TiB'])
    expect(formatByteSize(1536,{locale:'fr-FR'})).toBe('1,5 KiB')
  })
  it('keeps zero distinct from absent or invalid values without rounding small scientific quantities away',()=>{
    expect(formatDisplayNumber(0)).toBe('0');expect(formatDisplayNumber(0.000125)).toBe('0.000125')
    for(const value of [null,undefined,NaN])expect(formatDisplayNumber(value)).toBe('Not recorded')
    expect(formatByteSize(-1)).toBe('Not recorded')
    expect(formatByteSize(0.5)).toBe('Not recorded')
    expect(formatDisplayTimestamp('invalid',{empty:'Not reported'})).toBe('Not reported')
  })
  it('respects currency minor units, explicit compact summaries and domain missing labels',()=>{
    expect(formatDisplayCurrency(0,'USD')).toBe('$0.00')
    expect(formatDisplayCurrency(1234,'JPY')).toBe('¥1,234')
    expect(formatDisplayCurrency(1234.56,'USD',{maximumFractionDigits:0})).toBe('$1,235')
    expect(formatDisplayCurrency(null,'USD',{empty:'Amount not recorded'})).toBe('Amount not recorded')
  })
})
