import { describe, expect, it } from 'vitest'
import { sampleServicePricing } from './sample-service-pricing'

describe('standard sample service and additional runs', () => {
  it('charges the preparation bundle once for each sample', () => {
    expect(sampleServicePricing(3, 9, 100, 20)).toEqual({ additionalRuns: 6, standardSubtotal: 300, additionalSubtotal: 120, subtotal: 420 })
    expect(sampleServicePricing(20, 20, 100, null).subtotal).toBe(2000)
    expect(sampleServicePricing(1, 20, 100, 20).subtotal).toBe(480)
  })
  it('requires the additional-run rate only when extra runs are purchased', () => {
    expect(sampleServicePricing(3, 9, 100, null).subtotal).toBeNull()
    expect(sampleServicePricing(3, 3, 100, null).subtotal).toBe(300)
    expect(sampleServicePricing(3, 9, 100, 0).subtotal).toBe(300)
  })
  it('rounds each commercial component to cents', () => {
    expect(sampleServicePricing(3, 9, 10.01, 5.01).subtotal).toBe(60.09)
  })
})
