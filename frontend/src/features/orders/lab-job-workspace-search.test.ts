import { describe, expect, it } from 'vitest'
import { parseLabJobWorkspaceSearch } from './lab-job-workspace-search'

describe('Lab Job workspace search state', () => {
  it('restores a selected shipment, scan view, sample page and explicit kit-order intent', () => {
    expect(parseLabJobWorkspaceSearch({ shipmentId: 'shipment-2', shippingView: 'tubes', samplePage: '3', orderKits: 'true' })).toEqual({ shipmentId: 'shipment-2', shippingView: 'tubes', samplePage: 3, orderKits: true })
  })

  it('keeps an unknown shipment ID for the workspace to reject explicitly instead of silently selecting another', () => {
    expect(parseLabJobWorkspaceSearch({ shipmentId: 'not-a-shipment-in-this-job' }).shipmentId).toBe('not-a-shipment-in-this-job')
  })

  it.each([undefined, null, '', 1, '1', 0, -2, 2.5, '2.5', 'not-a-page', Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, [], [2], { page: 2 }])('omits invalid or default sample page %j', value => {
    expect(parseLabJobWorkspaceSearch({ samplePage: value }).samplePage).toBeUndefined()
  })

  it('keeps only supported task state and explicitly true kit intent', () => {
    expect(parseLabJobWorkspaceSearch({ shipmentId: ['shipment-1'], shippingView: 'unexpected', samplePage: 2, orderKits: 'false', unrelated: 'value' })).toEqual({ shipmentId: undefined, shippingView: undefined, samplePage: 2, orderKits: undefined })
    expect(parseLabJobWorkspaceSearch({ shipmentId: ' ', shippingView: 'samples', orderKits: 1 }).shipmentId).toBeUndefined()
    expect(parseLabJobWorkspaceSearch({ shipmentId: 'x'.repeat(101) }).shipmentId).toBeUndefined()
  })
})
