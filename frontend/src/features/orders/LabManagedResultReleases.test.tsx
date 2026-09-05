import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { managedFile, managedRelease } from '#/test-helpers/managed-retention'
import { LabManagedResultReleases } from './LabManagedResultReleases'

const mocks = vi.hoisted(() => ({ file: vi.fn(), archive: vi.fn() }))
vi.mock('#/api/order-management', async (load) => ({ ...await load<object>(), downloadLabResult: mocks.file, downloadLabResultPackage: mocks.archive }))
function show(release = managedRelease, files = [managedFile]) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const refresh = vi.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}><LabManagedResultReleases orderId="order" releases={[release]} files={files} /></QueryClientProvider>)
  return refresh
}
describe('LabManagedResultReleases', () => {
  it('shows the release schedule and downloads its full package', async () => {
    mocks.archive.mockResolvedValue(undefined)
    show()
    expect(screen.getByText('Standard deletion')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Download package' }))
    await waitFor(() => expect(mocks.archive).toHaveBeenCalledWith('order', managedRelease.id, 1))
  })
  it('disables both file and ZIP actions at cutoff without claiming deletion', () => {
    show({ ...managedRelease, retention: { ...managedRelease.retention!, downloadAccessClosedAtUtc: managedRelease.retention!.standardDeletionAtUtc } })
    expect(screen.getByRole('button', { name: 'Download package' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: `Download ${managedFile.fileName}` }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Downloads closed')).toBeTruthy()
    expect(screen.queryByText(/File bytes were deleted/)).toBeNull()
  })
  it('keeps grace available and refreshes current state after a failed transfer', async () => {
    mocks.file.mockRejectedValueOnce(new Error('Synthetic interruption'))
    const refresh = show({ ...managedRelease, retention: { ...managedRelease.retention!, graceActivatedAtUtc: managedRelease.retention!.standardDeletionAtUtc } })
    fireEvent.click(screen.getByRole('button', { name: `Download ${managedFile.fileName}` }))
    await waitFor(() => expect(screen.getByText('Download did not complete')).toBeTruthy())
    expect(refresh).toHaveBeenCalledWith({ queryKey: ['lab-service-order', 'order'] })
    expect(screen.getByText('Grace period active')).toBeTruthy()
  })
  it('disables the whole ZIP when a retained file is no longer clean', () => {
    show(managedRelease, [{ ...managedFile, scanStatus: 'Rejected' }])
    expect(screen.getByRole('button', { name: 'Download package' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: `Download ${managedFile.fileName}` }).hasAttribute('disabled')).toBe(true)
  })
  it('preserves undated historical releases and does not offer an incomplete ZIP', () => {
    show({ ...managedRelease, retention: null, manifestJson: JSON.stringify({ files: [{ id: managedFile.id }, { id: 'missing' }] }) })
    expect(screen.queryByText('Standard deletion')).toBeNull()
    expect(screen.getByRole('button', { name: 'Download package' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: `Download ${managedFile.fileName}` }).hasAttribute('disabled')).toBe(false)
  })
})
