import { CalendarClock } from 'lucide-react'

import type { ReleasedDeliverableRetention } from '#/api/order-management'

export function ReleasedDeliverableRetentionNotice({
  retention,
}: {
  retention: ReleasedDeliverableRetention | null
}) {
  if (!retention) return null

  const downloadSummary = formatDownloadSummary(retention)
  const graceIsActive = Boolean(retention.graceActivatedAtUtc)
  const downloadsAreClosed = Boolean(retention.downloadAccessClosedAtUtc)
  const bytesAreDeleted = Boolean(retention.byteDeletedAtUtc)
  const heading = bytesAreDeleted
    ? 'Files deleted'
    : downloadsAreClosed
      ? 'Downloads closed'
      : graceIsActive
        ? 'Grace period active'
        : 'Retention schedule'

  return (
    <aside
      aria-label="Retention schedule"
      className="mt-3 rounded-lg border border-border bg-muted/35 p-3"
    >
      <div className="flex items-start gap-3">
        <CalendarClock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-3">
          <div>
            <p className="font-medium">{heading}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This release keeps the retention dates that were set when it was released.
            </p>
          </div>

          {downloadSummary ? (
            <p aria-live="polite" className="text-sm font-medium text-foreground">
              {downloadSummary}
            </p>
          ) : null}

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-muted-foreground">Standard deletion</dt>
              <dd className="mt-1">
                <time dateTime={retention.standardDeletionAtUtc}>
                  {formatRetentionDateTime(retention.standardDeletionAtUtc)}
                </time>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">
                {graceIsActive ? 'Final deletion' : 'Conditional grace through'}
              </dt>
              <dd className="mt-1">
                <time dateTime={retention.potentialFinalDeletionAtUtc}>
                  {formatRetentionDateTime(retention.potentialFinalDeletionAtUtc)}
                </time>
              </dd>
            </div>
          </dl>

          {bytesAreDeleted ? (
            <p className="text-sm">
              File bytes were deleted{' '}
              <time dateTime={retention.byteDeletedAtUtc!}>
                {formatRetentionDateTime(retention.byteDeletedAtUtc!)}
              </time>
              {retention.deletionOutcome ? ` (${retention.deletionOutcome})` : ''}.
            </p>
          ) : downloadsAreClosed ? (
            <p className="text-sm">
              New downloads closed{' '}
              <time dateTime={retention.downloadAccessClosedAtUtc!}>
                {formatRetentionDateTime(retention.downloadAccessClosedAtUtc!)}
              </time>
              .
            </p>
          ) : graceIsActive ? (
            <p className="text-sm">
              The grace period remains in effect through the final deletion time, even if every file is
              downloaded during grace.
            </p>
          ) : (
            <p className="text-sm">
              {retention.download?.status === 'Downloaded'
                ? 'Every file has completed download, so deletion remains scheduled for the standard time.'
                : 'If every file has been downloaded, deletion occurs at the standard time. If any file remains undownloaded then, the whole release receives grace through the conditional date.'}
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}

function formatDownloadSummary(retention: ReleasedDeliverableRetention) {
  const download = retention.download
  if (!download || download.status === 'NoFiles') return null
  const fileLabel = download.totalFileCount === 1 ? 'file' : 'files'
  const activeSummary = download.activeAttemptCount > 0
    ? ` ${download.activeAttemptCount === 1 ? 'One download is' : `${download.activeAttemptCount} downloads are`} in progress and will count only after completion.`
    : ''

  if (download.status === 'Downloaded') {
    return `All ${download.totalFileCount} ${fileLabel} downloaded${download.completedAtUtc ? ` by ${formatRetentionDateTime(download.completedAtUtc)}` : ''}.`
  }
  if (download.status === 'PartiallyDownloaded') {
    return `${download.downloadedFileCount} of ${download.totalFileCount} ${fileLabel} downloaded.${activeSummary}`
  }
  if (download.status === 'InProgress') {
    return `No file has completed download yet.${activeSummary}`
  }
  return `No ${fileLabel} downloaded yet.`
}

export function formatRetentionDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value))
}
