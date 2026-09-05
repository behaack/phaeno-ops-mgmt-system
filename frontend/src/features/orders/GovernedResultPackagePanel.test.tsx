import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { governedRetentionPackage as fixture } from '#/test-helpers/governed-retention'
import { GovernedResultPackagePanel } from './GovernedResultPackagePanel'

describe('GovernedResultPackagePanel', () => {
  it('shows frozen policy dates and downloads the selected artifact', () => {
    const download = vi.fn()
    render(<GovernedResultPackagePanel resultPackage={fixture} sampleName="Synthetic sample" isDownloading={false} onDownload={download} />)
    expect(screen.getByText('Standard deletion')).toBeTruthy()
    expect(screen.getByText('Conditional grace through')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Download result' }))
    expect(download).toHaveBeenCalledWith(fixture.artifacts[0])
  })

  it('keeps download actions and final deadline after completion during grace', () => {
    render(<GovernedResultPackagePanel resultPackage={{ ...fixture, retentionState: 'Grace', retention: {
      ...fixture.retention!, graceActivatedAtUtc: fixture.retention!.standardDeletionAtUtc,
      download: { totalFileCount: 1, downloadedFileCount: 1, activeAttemptCount: 0, status: 'Downloaded', completedAtUtc: '2026-09-01T12:00:00Z' },
    } }} sampleName="Synthetic sample" isDownloading={false} onDownload={vi.fn()} />)
    expect(screen.getByText('Grace period active')).toBeTruthy()
    expect(screen.getByText('Final deletion')).toBeTruthy()
    expect(screen.getByText(/grace period remains in effect/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Download result' })).toBeTruthy()
  })

  it('retains metadata and hides downloads when access closes before byte deletion', () => {
    render(<GovernedResultPackagePanel resultPackage={{ ...fixture, retentionState: 'Cutoff', isDownloadAvailable: false,
      retention: { ...fixture.retention!, graceActivatedAtUtc: fixture.retention!.standardDeletionAtUtc,
        downloadAccessClosedAtUtc: fixture.retention!.potentialFinalDeletionAtUtc },
    }} sampleName="Synthetic sample" isDownloading={false} onDownload={vi.fn()} />)
    expect(screen.getByText('Downloads closed')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Download result' })).toBeNull()
    expect(screen.queryByText('Files deleted')).toBeNull()
    expect(screen.getByText('Standard deletion')).toBeTruthy()
  })

  it('does not invent policy dates for historical schedules and disables pending actions', () => {
    render(<GovernedResultPackagePanel resultPackage={{ ...fixture, retention: null }} sampleName="Historical sample" isDownloading onDownload={vi.fn()} />)
    expect(screen.queryByLabelText('Retention schedule')).toBeNull()
    expect(screen.getByRole('button', { name: 'Download result' }).hasAttribute('disabled')).toBe(true)
  })
})
