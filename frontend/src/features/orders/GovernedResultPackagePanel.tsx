import { formatByteSize } from '#/lib/display-format'
import { CustomerText } from '#/features/customer-i18n/customer-text'
import { Download } from 'lucide-react'

import type { CustomerResultPackage } from '#/api/pseq-order-to-cash'
import { Button } from '#/components/ui/button'
import { OrderStatusBadge } from './OrderStatusBadge'
import { ReleasedDeliverableRetentionNotice } from './ReleasedDeliverableRetentionNotice'

export function GovernedResultPackagePanel({ resultPackage, sampleName, isDownloading, onDownload }: {
  resultPackage: CustomerResultPackage
  sampleName: string
  isDownloading: boolean
  onDownload: (artifact: CustomerResultPackage['artifacts'][number]) => void
}) {
  return <section className="py-4 first:pt-0 last:pb-0">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="font-medium">{sampleName} <CustomerText message="m_3d823c89afe9" />{resultPackage.packageVersion}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <CustomerText message="m_f33deea9b100" />{resultPackage.releasedAtUtc ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(resultPackage.releasedAtUtc)) : '—'}
          {' · '}<CustomerText message="m_5049200cfb3d" />{resultPackage.retentionState ?? 'Active'}
        </p>
      </div>
      <OrderStatusBadge status={resultPackage.state} />
    </div>
    <ReleasedDeliverableRetentionNotice retention={resultPackage.retention ?? null} />
    {resultPackage.isDownloadAvailable ? <ul className="mt-3 divide-y">
      {resultPackage.artifacts.map((artifact) => <li key={artifact.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium">{artifact.fileName}</p>
          <p className="text-xs text-muted-foreground">{artifact.logicalRole} · {formatBytes(artifact.sizeBytes)} <CustomerText message="m_886c808e090f" />{artifact.sha256.slice(0, 12)}…</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={isDownloading} onClick={() => onDownload(artifact)}>
          <Download data-icon="inline-start" /><CustomerText message="m_0455f0c48ef8" /></Button>
      </li>)}
    </ul> : <p className="mt-3 text-sm text-muted-foreground"><CustomerText message="m_5ed200e09ba5" /></p>}
  </section>
}

function formatBytes(value: number) { return formatByteSize(value) }
