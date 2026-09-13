import { afterEach, expect, it, vi } from 'vitest'
import { downloadPaymentEvidence, type PaymentReceipt } from './pseq-order-to-cash'

const client = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('./client', () => ({ api: client }))
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); client.get.mockReset() })

it.each([
  ['attachment; filename=RCT-evidence.txt; filename*=UTF-8\'\'RCT-evidence.txt', 'txt'],
  ['attachment; filename="RCT-evidence.PDF"', 'pdf'],
  ['attachment; filename=RCT-import.json', 'json'],
  ['attachment; filename=unexpected.exe', 'bin'],
  [undefined, 'bin'],
])('keeps the supported evidence extension from %s', async (disposition, extension) => {
  const blob = new Blob(['Exact saved evidence'])
  client.get.mockResolvedValue({ data: blob, headers: { 'content-disposition': disposition } })
  const createObjectURL = vi.fn(() => 'blob:test-evidence'), revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
  let downloaded = ''
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloaded = this.download })
  await downloadPaymentEvidence({ id: 'receipt-id', receiptNumber: 'RCT-TEST' } as PaymentReceipt)
  expect(client.get).toHaveBeenCalledWith('/platform/accounts-receivable/receipts/receipt-id/evidence', { responseType: 'blob' })
  expect(createObjectURL).toHaveBeenCalledWith(blob)
  expect(downloaded).toBe(`RCT-TEST-evidence.${extension}`)
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-evidence')
})

it('does not create a download when evidence access fails', async () => {
  const denied = new Error('CashOperator role required')
  client.get.mockRejectedValue(denied)
  const createObjectURL = vi.fn()
  vi.stubGlobal('URL', { createObjectURL })
  await expect(downloadPaymentEvidence({ id: 'receipt-id', receiptNumber: 'RCT-TEST' } as PaymentReceipt)).rejects.toBe(denied)
  expect(createObjectURL).not.toHaveBeenCalled()
})
