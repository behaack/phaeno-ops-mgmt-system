// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { AxiosHeaders } from 'axios'
import { api } from './client'
import { downloadScientificFile } from './lab-scientific-evidence'
import { downloadInvestigationAttachment, downloadInvestigationReport } from './lab-investigation'

vi.mock('./client', () => ({ api: { get: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())
const failed = (data: unknown) => Object.assign(new Error('Request failed with status code 409'), { isAxiosError: true, response: { status: 409, data } })

it('shows the scientific-file integrity explanation returned in a binary download error', async () => {
  const error = failed(new Blob([JSON.stringify({ error: { code: 'scientific_file_integrity_failed', message: 'The stored file does not match its recorded fingerprint or size. Investigate the original upload.' } })]))
  vi.mocked(api.get).mockRejectedValueOnce(error)
  await expect(downloadScientificFile('work', 'sample', 'file')).rejects.toThrow('Investigate the original upload.')
})
it('returns successful evidence bytes unchanged, including JSON-looking content', async () => {
  const body = new Blob(['{"error":{"message":"This is actual scientific file content"}}'])
  vi.mocked(api.get).mockResolvedValueOnce({ data: body, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
  expect(await downloadScientificFile('work', 'sample', 'file')).toBe(body)
})
it('retains the saved-report checksum refusal and original failure as its cause', async () => {
  const error = failed(new Blob(['{"error":{"message":"The saved report does not match its recorded checksum."}}']))
  vi.mocked(api.get).mockRejectedValueOnce(error)
  await expect(downloadInvestigationReport('work', 'sample', 'report', 'json')).rejects.toMatchObject({ message: 'The saved report does not match its recorded checksum.', cause: error })
})
it('shows a missing supporting-file explanation without treating it as download bytes', async () => {
  vi.mocked(api.get).mockRejectedValueOnce(failed(new Blob(['{"error":{"message":"This supporting file is unavailable. Contact an administrator."}}'])))
  await expect(downloadInvestigationAttachment('work', 'sample', 'record', 'qcReport')).rejects.toThrow('This supporting file is unavailable.')
})
it.each(['<html>Proxy failure</html>', '{"error":{"message":{"stack":"private details"}}}', '{"other":"not an API error"}', '{"error":{"message":""}}'])('preserves the original failure for an invalid error body: %s', async body => {
  const error = failed(new Blob([body])); vi.mocked(api.get).mockRejectedValueOnce(error)
  await expect(downloadScientificFile('work', 'sample', 'file')).rejects.toBe(error)
})
