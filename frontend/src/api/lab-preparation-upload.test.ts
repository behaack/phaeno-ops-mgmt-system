import { expect, it, vi } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { api } from './client'
import { applyPreparationWithQcReport } from './lab-preparation'

it.each([false, true])('preserves multipart evidence with general-report support %s', async generalReport => {
  const file = new File(['%PDF-TEST ONLY'], 'qc.pdf', { type: 'application/pdf' })
  const originalAdapter = api.defaults.adapter
  const command = { requestId: 'test-request', version: 3, action: 'step' }
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    expect(config.data).toBeInstanceOf(FormData)
    expect(config.data.get('file')).toBe(file)
    expect(JSON.parse(config.data.get('payload'))).toEqual(command)
    expect(config.headers.get('Content-Type')).toBe('multipart/form-data')
    expect(config.url).toBe(`/platform/lab-operations/preparation/batches/batch/commands/${generalReport ? 'with-report' : 'with-qc-report'}`)
    return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data: { id: 'batch' }, error: null } }
  })
  api.defaults.adapter = adapter
  try {
    await expect(applyPreparationWithQcReport('batch', command, file, generalReport)).resolves.toEqual({ id: 'batch' })
    expect(adapter).toHaveBeenCalledOnce()
  } finally { api.defaults.adapter = originalAdapter }
})
