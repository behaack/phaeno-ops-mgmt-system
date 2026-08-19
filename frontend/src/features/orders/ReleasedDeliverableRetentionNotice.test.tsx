import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ReleasedDeliverableRetention } from '#/api/order-management'

import { ReleasedDeliverableRetentionNotice } from './ReleasedDeliverableRetentionNotice'

const retention: ReleasedDeliverableRetention = {
  releasedAtUtc: '2026-08-19T12:00:00Z',
  warningAtUtc: '2026-09-13T12:00:00Z',
  standardDeletionAtUtc: '2026-09-18T12:00:00Z',
  potentialFinalDeletionAtUtc: '2026-09-23T12:00:00Z',
  graceActivatedAtUtc: null,
  downloadAccessClosedAtUtc: null,
  byteDeletedAtUtc: null,
  deletionOutcome: null,
}

describe('ReleasedDeliverableRetentionNotice', () => {
  it('shows the frozen standard deadline and labels grace as conditional', () => {
    const { container } = render(<ReleasedDeliverableRetentionNotice retention={retention} />)

    expect(screen.getByText('Retention schedule')).toBeTruthy()
    expect(screen.getByText('Standard deletion')).toBeTruthy()
    expect(screen.getByText('Conditional grace through')).toBeTruthy()
    expect(screen.getByText(/If every file has been downloaded/)).toBeTruthy()
    expect(container.querySelector('time[datetime="2026-09-18T12:00:00Z"]')).toBeTruthy()
    expect(container.querySelector('time[datetime="2026-09-23T12:00:00Z"]')).toBeTruthy()
  })

  it('distinguishes an activated grace period from a conditional one', () => {
    render(
      <ReleasedDeliverableRetentionNotice
        retention={{ ...retention, graceActivatedAtUtc: '2026-09-18T12:00:00Z' }}
      />,
    )

    expect(screen.getByText('Grace period active')).toBeTruthy()
    expect(screen.getByText('Final deletion')).toBeTruthy()
    expect(screen.queryByText('Conditional grace through')).toBeNull()
  })

  it('renders nothing for a historical release without a snapshot', () => {
    const { container } = render(<ReleasedDeliverableRetentionNotice retention={null} />)

    expect(container.childElementCount).toBe(0)
  })
})
