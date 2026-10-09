import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FileUploadProgress } from './file-upload-progress'

describe('File upload progress', () => {
  it('shows measured transfer percentage and byte counts', () => {
    render(<FileUploadProgress progress={{ fileName: 'batch.zip', phase: 'uploading', transferredBytes: 5 * 1024 * 1024,
      totalBytes: 10 * 1024 * 1024, percentage: 50, message: 'Uploading ZIP portions' }} />)
    expect(screen.getByRole('progressbar', { name: /batch.zip.*50%/ }).getAttribute('value')).toBe('50')
    expect(screen.getByText('5 MiB of 10 MiB transferred')).not.toBeNull()
  })
  it('does not claim a completion percentage while validation is running', () => {
    render(<FileUploadProgress progress={{ fileName: 'batch.zip', phase: 'verifying', transferredBytes: 10,
      totalBytes: 10, message: 'Scanning and inspecting' }} />)
    expect(screen.getByRole('progressbar').hasAttribute('value')).toBe(false)
    expect(screen.getByText(/Scanning and inspecting/)).not.toBeNull()
  })
  it('counts admitted entries separately from transfer completion', () => {
    render(<FileUploadProgress progress={{ fileName: 'batch.zip', phase: 'extracting', transferredBytes: 10,
      totalBytes: 10, percentage: 50, completedItems: 1, totalItems: 2, message: 'Extracting and verifying' }} />)
    expect(screen.getByText('1 of 2 files verified')).not.toBeNull()
  })
})
