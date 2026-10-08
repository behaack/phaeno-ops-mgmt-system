import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { uploadScientificFile } from './lab-scientific-evidence'
vi.mock('./client', () => ({ api: { post: vi.fn(), put: vi.fn() } }))
const receipt = { id: 'receipt', fileName: 'reads.bin', sha256: 'a'.repeat(64), sizeBytes: 6, externalFileReference: 'poms-file:receipt', recordedAtUtc: '2026-09-20' }
const state = (receivedBytes: number, file: typeof receipt | null = null) => ({ data: { data: { id: 'id', chunkBytes: 3, receivedBytes, expiresAtUtc: '2099-01-01T00:00:00Z', file } } })
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear() })
describe('scientific upload resume', () => {
  it('reuses its upload identity and confirmed offset after a transfer fails', async () => {
    const file = new File(['abcdef'], 'reads.bin')
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new TextEncoder().encode('abcdef').buffer })
    vi.mocked(api.post).mockResolvedValueOnce(state(0)).mockResolvedValueOnce(state(3)).mockResolvedValueOnce(state(6, receipt))
    vi.mocked(api.put).mockResolvedValueOnce(state(3)).mockRejectedValueOnce(new Error('connection lost')).mockResolvedValueOnce(state(6))
    await expect(uploadScientificFile('work', 'specimen', file, vi.fn())).rejects.toThrow('connection lost')
    expect(await uploadScientificFile('work', 'specimen', file, vi.fn())).toEqual(receipt)
    expect(vi.mocked(api.post).mock.calls[0][1]).toEqual(vi.mocked(api.post).mock.calls[1][1])
    expect(vi.mocked(api.put).mock.calls.map(call => String(call[0]).split('/').at(-1))).toEqual(['0', '3', '3'])
  })
  it('returns a verified receipt after a lost completion acknowledgment without uploading again', async () => {
    const file = new File(['abcdef'], 'finished.bin')
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new TextEncoder().encode('abcdef').buffer })
    vi.mocked(api.post).mockResolvedValue(state(6, receipt))
    expect(await uploadScientificFile('work', 'specimen', file, vi.fn())).toEqual(receipt)
    expect(api.put).not.toHaveBeenCalled()
  })
})
