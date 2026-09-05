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
        <p className="font-medium">{sampleName} · Result version {resultPackage.packageVersion}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Released {resultPackage.releasedAtUtc ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(resultPackage.releasedAtUtc)) : '—'}
          {' · '}Retention {resultPackage.retentionState ?? 'Active'}
        </p>
      </div>
      <OrderStatusBadge status={resultPackage.state} />
    </div>
    <ReleasedDeliverableRetentionNotice retention={resultPackage.retention ?? null} />
    {resultPackage.isDownloadAvailable ? <ul className="mt-3 divide-y">
      {resultPackage.artifacts.map((artifact) => <li key={artifact.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium">{artifact.fileName}</p>
          <p className="text-xs text-muted-foreground">{artifact.logicalRole} · {formatBytes(artifact.sizeBytes)} · SHA-256 {artifact.sha256.slice(0, 12)}…</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={isDownloading} onClick={() => onDownload(artifact)}>
          <Download data-icon="inline-start" />Download result
        </Button>
      </li>)}
    </ul> : <p className="mt-3 text-sm text-muted-foreground">This version is no longer downloadable. Contact Phaeno for an authorized reissue.</p>}
  </section>
}

function formatBytes(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'unit', unit: value >= 1_000_000 ? 'megabyte' : 'kilobyte', maximumFractionDigits: 1 })
    .format(value >= 1_000_000 ? value / 1_000_000 : value / 1_000)
}
