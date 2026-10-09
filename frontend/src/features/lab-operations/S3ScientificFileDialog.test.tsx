import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { S3ScientificFileDialog } from './S3ScientificFileDialog'

const file = { key: 'customer-A/job-A/sample-A/library-A/sequencing-A/raw/R1.fastq', fileName: 'R1.fastq', sizeBytes: 10, eTag: 'etag-A' }
function setup(page = { available: true, files: [file], nextCursor: null as string | null }) {
  const load = vi.fn().mockResolvedValue(page), select = vi.fn().mockResolvedValue({}), close = vi.fn()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <S3ScientificFileDialog open onOpenChange={close} queryKey={['source-fixture']} load={load} select={select} maximumBytes={100} />
  </QueryClientProvider>)
  return { load, select, close }
}

describe('Original S3 selection', () => {
  it('requires an explicit file selection before verifying the exact original', async () => {
    const { select, close } = setup()
    const radio = await screen.findByRole('radio', { name: 'R1.fastq' })
    expect((screen.getByRole('button', { name: 'Use verified original' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Required')).not.toBeNull()
    fireEvent.click(radio); fireEvent.click(screen.getByRole('button', { name: 'Use verified original' }))
    await waitFor(() => expect(select).toHaveBeenCalledWith(file))
    await waitFor(() => expect(close).toHaveBeenCalledWith(false))
  })
  it('explains unavailable setup without offering an admission action', async () => {
    const { select } = setup({ available: false, files: [], nextCursor: null })
    await screen.findByText(/S3 access is not configured/)
    expect(screen.queryByRole('radio')).toBeNull()
    expect((screen.getByRole('button', { name: 'Use verified original' }) as HTMLButtonElement).disabled).toBe(true)
    expect(select).not.toHaveBeenCalled()
  })
  it('prevents over-limit originals from being selected', async () => {
    setup({ available: true, files: [{ ...file, sizeBytes: 101 }], nextCursor: null })
    expect((await screen.findByRole('radio', { name: 'R1.fastq' }) as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText(/Exceeds the current verification limit/)).not.toBeNull()
  })
})
