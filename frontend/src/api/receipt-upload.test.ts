import { afterEach, expect, it, vi } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { api, configureApiAuth } from './client'
import { recordPaymentReceiptWithEvidence } from './pseq-order-to-cash'

afterEach(() => { vi.restoreAllMocks(); configureApiAuth({}) })

it('keeps receipt evidence as multipart through Axios serialization instead of converting the file to JSON', async () => {
  const file = new File(['Harmless test receipt'], 'receipt.txt', { type: 'text/plain' })
  const originalAdapter = api.defaults.adapter
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    expect(config.data).toBeInstanceOf(FormData)
    expect(config.data.get('file')).toBe(file)
    expect(JSON.parse(config.data.get('payload'))).toMatchObject({ externalId: 'TEST-RECEIPT', amount: 1, evidenceStorageKey: '' })
    expect(config.headers.get('Content-Type')).toBe('multipart/form-data')
    expect(config.headers.get('Idempotency-Key')).toBe('test-attempt')
    return { config, status: 201, statusText: 'Created', headers: {}, data: { success: true, data: { id: 'receipt-1' }, error: null } }
  })
  api.defaults.adapter = adapter
  try {
    await expect(recordPaymentReceiptWithEvidence({ organizationId: 'customer-1', externalId: 'TEST-RECEIPT', payer: 'Test payer', amount: 1, currency: 'USD', receivedOn: '2026-09-12', method: 'Test', bankReference: 'Test', memo: '' }, file, 'test-attempt')).resolves.toEqual({ id: 'receipt-1' })
    expect(adapter).toHaveBeenCalledOnce()
  } finally { api.defaults.adapter = originalAdapter }
})
