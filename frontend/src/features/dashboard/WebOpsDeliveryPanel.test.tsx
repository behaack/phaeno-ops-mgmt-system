import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebOpsDeliveryPanel } from './WebOpsDeliveryPanel'
import { getWebOpsNotifications, getWebOpsNotificationAttempts, getWebOpsNotificationSummary, updateWebOpsNotificationProcessing, resendWebOpsNotification, type WebOpsNotification, type WebOpsNotificationSummary } from '#/api/web-ops'

vi.mock('#/api/web-ops', async importOriginal => ({
  ...await importOriginal<typeof import('#/api/web-ops')>(),
  getWebOpsNotifications: vi.fn(),
  getWebOpsNotificationAttempts: vi.fn(),
  resendWebOpsNotification: vi.fn(),
  getWebOpsNotificationSummary: vi.fn(),
  updateWebOpsNotificationProcessing: vi.fn(),
}))

const failed: WebOpsNotification = {
  id: 'notification-1', kind: 'TechnicalBrief', state: 'Failed', organizationName: 'Synthetic Labs',
  intakeId: 'contact-1234', contactName: 'Ada Example', recipientEmail: 'ada@example.test',
  attemptCount: 5, createdAtUtc: '2026-09-01T12:00:00Z', lastAttemptAtUtc: '2026-09-01T12:30:00Z',
  acceptedAtUtc: null, nextAttemptAtUtc: null, lastError: 'Synthetic provider failure', version: 'version-1', canResend: true,
}
const page = (item = failed) => ({ items: [item], page: 1, pageSize: 10, totalCount: 1 })
const summary: WebOpsNotificationSummary = { isPaused: false, version: 'control-1', updatedAtUtc: null, updatedByName: null, reason: null, pendingCount: 3, processingCount: 1, failedCount: 1, oldestPendingAtUtc: '2026-09-01T10:00:00Z', expiredProcessingCount: 1 }
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><WebOpsDeliveryPanel /></QueryClientProvider>)
}

beforeEach(() => { vi.clearAllMocks(); vi.mocked(getWebOpsNotifications).mockResolvedValue(page()); vi.mocked(getWebOpsNotificationAttempts).mockResolvedValue([]); vi.mocked(getWebOpsNotificationSummary).mockResolvedValue(summary); vi.mocked(updateWebOpsNotificationProcessing).mockResolvedValue(undefined) })

describe('WebOpsDeliveryPanel', () => {
  it('filters failed and interrupted work while showing retained queued messages during pause', async () => {
    vi.mocked(getWebOpsNotificationSummary).mockResolvedValue({ ...summary, isPaused: true })
    vi.mocked(getWebOpsNotifications).mockResolvedValue(page({ ...failed, state: 'Processing', isProcessingExpired: true, canResend: false }))
    show()
    expect(await screen.findByText('Email delivery is paused')).toBeTruthy()
    expect(screen.getByText(/New messages remain queued/)).toBeTruthy()
    expect(screen.getByText('Sending').nextElementSibling?.textContent).toBe('0')
    expect(await screen.findByText('Interrupted')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Needs attention (2)' }))
    await waitFor(() => expect(getWebOpsNotifications).toHaveBeenLastCalledWith(1, true))
    expect(screen.getByRole('button', { name: 'Needs attention (2)' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('requires a reason and preserves it through stale processing status and failed reload', async () => {
    vi.mocked(updateWebOpsNotificationProcessing).mockRejectedValueOnce(new Error('Processing status changed.'))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Pause email delivery' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pause email delivery' }))
    expect(await within(dialog).findByText('Enter a reason for this change.')).toBeTruthy()
    expect(updateWebOpsNotificationProcessing).not.toHaveBeenCalled()
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'Investigating provider failures' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pause email delivery' }))
    await within(dialog).findByText('Processing status changed.')
    let rejectReload!: (reason: Error) => void
    vi.mocked(getWebOpsNotificationSummary).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectReload = reject }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reload delivery status; keep reason' }))
    await within(dialog).findByText('Reloading delivery status…')
    expect((within(dialog).getByRole('button', { name: 'Pause email delivery' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
    rejectReload(new Error('Status temporarily unavailable.'))
    await within(dialog).findByText('Status temporarily unavailable.')
    expect((within(dialog).getByLabelText(/Reason/) as HTMLTextAreaElement).value).toBe('Investigating provider failures')
    vi.mocked(getWebOpsNotificationSummary).mockResolvedValue({ ...summary, version: 'control-2' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reload delivery status; keep reason' }))
    await within(dialog).findByText(/The current status was reloaded/)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pause email delivery' }))
    await waitFor(() => expect(vi.mocked(updateWebOpsNotificationProcessing).mock.calls.at(-1)?.[0]).toEqual({ version: 'control-2', isPaused: true, reason: 'Investigating provider failures' }))
    expect(await screen.findByText(/Email delivery was paused/)).toBeTruthy()
  })

  it('blocks dismissal and edits until resume finishes', async () => {
    vi.mocked(getWebOpsNotificationSummary).mockResolvedValue({ ...summary, isPaused: true })
    let finish!: () => void
    vi.mocked(updateWebOpsNotificationProcessing).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Resume email delivery' }))
    const dialog = screen.getByRole('dialog')
    const reason = within(dialog).getByLabelText(/Reason/) as HTMLTextAreaElement
    fireEvent.change(reason, { target: { value: 'Provider service restored' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Resume email delivery' }))
    await within(dialog).findByRole('button', { name: 'Saving…' })
    expect(reason.closest('fieldset')?.disabled).toBe(true)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(vi.mocked(updateWebOpsNotificationProcessing).mock.calls[0]?.[0]).toEqual({ version: 'control-1', isPaused: false, reason: 'Provider service restored' })
    finish()
    expect(await screen.findByText(/Email delivery was resumed/)).toBeTruthy()
  })

  it('distinguishes email load failure from an empty queue and supports retry', async () => {
    vi.mocked(getWebOpsNotifications).mockRejectedValueOnce(new Error('Email delivery unavailable'))
    show()
    expect(await screen.findByText('Email delivery unavailable')).toBeTruthy()
    expect(screen.queryByText(/No email delivery records/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry email delivery' }))
    expect(await screen.findByText('Technical brief · Synthetic Labs')).toBeTruthy()
  })

  it('reviews the exact recipient and refreshes stale recovery state before retry', async () => {
    vi.mocked(resendWebOpsNotification).mockRejectedValueOnce(new Error('This notification changed. Refresh email delivery.')).mockResolvedValueOnce(undefined)
    show()
    fireEvent.click(await screen.findByRole('button', { name: /Queue resend: Technical brief/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Recipient: ada@example.test/)).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Queue resend' }))
    expect(await within(dialog).findByText(/This notification changed/)).toBeTruthy()
    vi.mocked(getWebOpsNotifications).mockResolvedValue(page({ ...failed, version: 'version-2' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Refresh delivery status' }))
    await waitFor(() => expect(within(dialog).queryByText(/This notification changed/)).toBeNull())
    fireEvent.click(within(dialog).getByRole('button', { name: 'Queue resend' }))
    await waitFor(() => expect(vi.mocked(resendWebOpsNotification).mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ id: failed.id, version: 'version-2' })))
    expect(await screen.findByText('Email was queued. Delivery status will update automatically.')).toBeTruthy()
  })

  it('shows provider acceptance and attempt history without promising inbox delivery', async () => {
    vi.mocked(getWebOpsNotifications).mockResolvedValue(page({ ...failed, state: 'Accepted', acceptedAtUtc: '2026-09-01T12:30:00Z', lastError: null, canResend: false }))
    vi.mocked(getWebOpsNotificationAttempts).mockResolvedValue([{ attemptNumber: 1, startedAtUtc: '2026-09-01T12:30:00Z', finishedAtUtc: '2026-09-01T12:30:01Z', outcome: 'Accepted', error: null, staffRequested: true }])
    show()
    expect(await screen.findByText('Accepted by email provider')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Queue resend/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View attempts' }))
    expect(await screen.findByText(/Attempt 1.*Requested by staff/)).toBeTruthy()
    expect(getWebOpsNotificationAttempts).toHaveBeenCalledWith(failed.id)
  })
})
