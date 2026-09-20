import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ScientificFilePicker } from './ScientificFilePicker'
import { getScientificFiles, uploadScientificFile } from '#/api/lab-scientific-evidence'

vi.mock('#/api/lab-scientific-evidence', () => ({
  scientificFilesKey: (work: string, specimen: string) => ['files', work, specimen],
  getScientificFiles: vi.fn(), uploadScientificFile: vi.fn(),
}))
const existing = { id: 'old', fileName: 'original.fastq', externalFileReference: 'poms-file:old', sha256: 'a'.repeat(64), sizeBytes: 5, recordedAtUtc: '2026-01-01' }
function setup(reference = '') {
  const uploaded = vi.fn(), busy = vi.fn()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ScientificFilePicker work="work" specimen="sample" label="Sequencing file" reference={reference} required onUploaded={uploaded} onBusyChange={busy} />
  </QueryClientProvider>)
  return { uploaded, busy }
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getScientificFiles).mockResolvedValue({ maximumBytes: 100, files: [existing] })
})
describe('Managed scientific uploads', () => {
  it('fills metadata from the server receipt without manual reference or checksum fields', async () => {
    const receipt = { ...existing, id: 'new', fileName: 'new.fastq', externalFileReference: 'poms-file:new' }
    vi.mocked(uploadScientificFile).mockResolvedValue(receipt)
    const { uploaded, busy } = setup()
    const input = screen.getByLabelText(/Sequencing file/)
    await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false))
    const file = new File(['reads'], 'new.fastq')
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(uploaded).toHaveBeenCalledWith(receipt))
    expect(uploadScientificFile).toHaveBeenCalledWith('work', 'sample', file, expect.any(Function))
    expect(busy.mock.calls).toEqual([[true], [false]])
    expect(screen.queryByRole('textbox')).toBeNull()
  })
  it('rejects empty or oversized selections before uploading', async () => {
    const { uploaded } = setup()
    const input = screen.getByLabelText(/Sequencing file/)
    await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false))
    fireEvent.change(input, { target: { files: [new File([], 'empty.fastq')] } })
    expect(screen.getByText(/Choose a nonempty file/)).not.toBeNull()
    fireEvent.change(input, { target: { files: [new File(['a'.repeat(101)], 'large.fastq')] } })
    expect(uploadScientificFile).not.toHaveBeenCalled()
    expect(uploaded).not.toHaveBeenCalled()
  })
  it('keeps the previous file when its replacement upload fails', async () => {
    vi.mocked(uploadScientificFile).mockRejectedValue(new Error('Upload unavailable'))
    const { uploaded, busy } = setup(existing.externalFileReference)
    const input = screen.getByLabelText(/Sequencing file/)
    await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false))
    fireEvent.change(input, { target: { files: [new File(['new'], 'replacement.fastq')] } })
    await waitFor(() => expect(busy).toHaveBeenLastCalledWith(false))
    expect(screen.getByText('original.fastq')).not.toBeNull()
    expect(uploaded).not.toHaveBeenCalled()
  })
})
