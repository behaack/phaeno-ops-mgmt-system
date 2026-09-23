import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createPreviewBatch } from './ConfigurationPreview'
import { PreparationLibraryTubeDialog } from './PreparationLibraryTubeDialog'

const member = createPreviewBatch({ id: 'stage', name: 'Example', sequence: 1, requirement: 'Required', definition: { schemaVersion: 1, steps: [] } }).members[0]

describe('library tube assignment', () => {
  it('requires a complete manufacturer scan and submits that identity', async () => {
    const submit = vi.fn()
    render(<PreparationLibraryTubeDialog member={member} pending={false} onClose={vi.fn()} onSubmit={submit} />)
    fireEvent.change(screen.getByLabelText(/^Library tube barcode/), { target: { value: 'Manufacturer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Assign library tube' }))
    await screen.findByText('Scan the full manufacturer barcode.')
    expect(submit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Scan manufacturer barcode/), { target: { value: 'MANUFACTURER-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Assign library tube' }))
    await vi.waitFor(() => expect(submit).toHaveBeenCalledWith({ barcodeSource: 'Manufacturer', barcode: 'MANUFACTURER-123' }))
  })

  it('allocates a generated identity without recording any amount or transfer', async () => {
    const submit = vi.fn()
    render(<PreparationLibraryTubeDialog member={member} pending={false} onClose={vi.fn()} onSubmit={submit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Assign library tube' }))
    await vi.waitFor(() => expect(submit).toHaveBeenCalledWith({ barcodeSource: 'PhaenoGenerated' }))
  })
})
