import { describe, expect, it } from 'vitest'
import { instructionPreviewTime, instructionPreviewUnavailable } from './instruction-rule-preview'
import { parseShippingSettingsSection } from './shipping-settings-navigation'

describe('instruction rule preview context', () => {
  const now = new Date('2026-09-18T20:15:00.000Z')
  it('uses now for an already effective rule', () => {
    expect(instructionPreviewTime({ effectiveFrom: '2026-09-01T00:00:00Z' }, now)).toBe(now.toISOString())
  })
  it('uses the exact future start, including seconds, without rounding before the valid window', () => {
    expect(instructionPreviewTime({ effectiveFrom: '2026-09-19T10:30:45.123-07:00' }, now)).toBe('2026-09-19T17:30:45.123Z')
  })
  it('does not resolve a different active rule when the selected rule is inactive', () => {
    expect(instructionPreviewUnavailable({ isActive: false, effectiveTo: null }, now.toISOString())).toContain('inactive')
  })
  it('treats the end of an effective window as exclusive', () => {
    expect(instructionPreviewUnavailable({ isActive: true, effectiveTo: now.toISOString() }, now.toISOString())).toContain('ended')
    expect(instructionPreviewUnavailable({ isActive: true, effectiveTo: '2026-09-19T00:00:00Z' }, now.toISOString())).toBeNull()
  })
  it('takes old standalone preview links to the instruction rules', () => {
    expect(parseShippingSettingsSection('preview')).toBe('instructions')
  })
})
