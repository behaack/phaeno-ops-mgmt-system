import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { Link } from '@tanstack/react-router'
import { CalendarClock } from 'lucide-react'

import type { ReleasedDeliverableRetention } from '#/api/order-management'

export function ReleasedDeliverableRetentionNotice({
  retention,
}: {
  retention: ReleasedDeliverableRetention | null
}) {
  const __customerText = useCustomerText()

  if (!retention) return null

  const downloadSummary = formatDownloadSummary(retention)
  const graceIsActive = Boolean(retention.graceActivatedAtUtc)
  const downloadsAreClosed = Boolean(retention.downloadAccessClosedAtUtc)
  const bytesAreDeleted = Boolean(retention.byteDeletedAtUtc)
  const heading = retention.isQuarantined ? 'Access suspended' : bytesAreDeleted
    ? 'Files deleted'
    : downloadsAreClosed
      ? 'Downloads closed'
      : graceIsActive
        ? 'Grace period active'
        : 'Retention schedule'

  return (
    <aside
      aria-label={__customerText('m_c58dd29bad83')}
      className="mt-3 rounded-lg border border-border bg-muted/35 p-3"
    >
      <div className="flex items-start gap-3">
        <CalendarClock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-3">
          <div>
            <p className="font-medium">{heading}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              <CustomerText message="m_01adf60de3ab" /></p>
          </div>

          {retention.snapshotId ? <Link to="/released-deliverables/$snapshotId" params={{ snapshotId: retention.snapshotId }} search={{ q: '', page: 0 }} className="text-sm text-primary underline print:hidden"><CustomerText message="m_1e75f4e233be" /></Link> : null}

          {downloadSummary ? (
            <p aria-live="polite" className="text-sm font-medium text-foreground">
              {downloadSummary}
            </p>
          ) : null}

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-muted-foreground"><CustomerText message="m_74d0313faaee" /></dt>
              <dd className="mt-1">
                <time dateTime={retention.standardDeletionAtUtc}>
                  {formatRetentionDateTime(retention.standardDeletionAtUtc)}
                </time>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">
                {graceIsActive ? <CustomerSourceText source={"Final deletion"} /> : __customerText('m_dc399fdb6927')}
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
              <CustomerText message="m_ac3326b460d7" />{' '}
              <time dateTime={retention.byteDeletedAtUtc!}>
                {formatRetentionDateTime(retention.byteDeletedAtUtc!)}
              </time>
              {retention.deletionOutcome ? ` (${retention.deletionOutcome})` : ''}.
            </p>
          ) : downloadsAreClosed ? (
            <p className="text-sm">
              <CustomerText message="m_620c46de4481" />{' '}
              <time dateTime={retention.downloadAccessClosedAtUtc!}>
                {formatRetentionDateTime(retention.downloadAccessClosedAtUtc!)}
              </time>
              .
            </p>
          ) : graceIsActive ? (
            <p className="text-sm">
              <CustomerText message="m_1fcc351a551c" /></p>
          ) : (
            <p className="text-sm">
              {retention.download?.status === 'Downloaded'
                ? <CustomerSourceText source={"Every file has completed download, so deletion remains scheduled for the standard time."} />
                : __customerText('m_1bd06d3a5571')}
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
