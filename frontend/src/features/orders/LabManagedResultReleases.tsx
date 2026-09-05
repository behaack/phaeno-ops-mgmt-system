import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, FileArchive } from 'lucide-react'

import { downloadLabResult, downloadLabResultPackage, getOrderErrorMessage, type LabResultRelease, type OperationalFile } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { ReleasedDeliverableRetentionNotice } from './ReleasedDeliverableRetentionNotice'

export function LabManagedResultReleases({ orderId, releases, files }: { orderId: string; releases: LabResultRelease[]; files: OperationalFile[] }) {
  const queryClient = useQueryClient()
  const download = useMutation({
    mutationFn: ({ release, file }: { release: LabResultRelease; file?: OperationalFile }) => file
      ? downloadLabResult(orderId, file) : downloadLabResultPackage(orderId, release.id, release.releaseVersion),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] }),
  })
  return <div className="space-y-5">
    {download.isPending ? <p role="status" className="text-sm text-muted-foreground">Download in progress...</p> : null}
    {download.error ? <Alert variant="destructive"><AlertTitle>Download did not complete</AlertTitle><AlertDescription>{getOrderErrorMessage(download.error, 'Refresh the release and try again while downloads remain open.')}</AlertDescription></Alert> : null}
    {releases.filter((release) => release.releaseStatus === 'Released').map((release) => {
      const ids = manifestFileIds(release.manifestJson)
      const releaseFiles = files.filter((file) => ids.has(file.id))
      if (!releaseFiles.length) return null
      const closed = Boolean(release.retention?.isQuarantined || release.retention?.downloadAccessClosedAtUtc || release.retention?.byteDeletedAtUtc)
      return <section key={release.id} aria-labelledby={`lab-release-${release.id}`} className="border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id={`lab-release-${release.id}`} className="font-medium">Result release {release.releaseVersion}</h3>
          <Button type="button" variant="outline" disabled={closed || download.isPending || releaseFiles.length !== ids.size || releaseFiles.some((file) => file.releaseStatus !== 'Released' || file.scanStatus !== 'Clean')} onClick={() => download.mutate({ release })}><FileArchive data-icon="inline-start" />Download package</Button>
        </div>
        <ReleasedDeliverableRetentionNotice retention={release.retention} />
        <ul className="divide-y">{releaseFiles.map((file) => <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="min-w-0 break-words text-sm">{file.fileName}</p>
          <Button type="button" variant="outline" disabled={closed || download.isPending || file.releaseStatus !== 'Released' || file.scanStatus !== 'Clean'} aria-label={`Download ${file.fileName}`} onClick={() => download.mutate({ release, file })}><Download data-icon="inline-start" />Download</Button>
        </li>)}</ul>
      </section>
    })}
  </div>
}

function manifestFileIds(json: string): Set<string> {
  try {
    const manifest: unknown = JSON.parse(json)
    if (!manifest || typeof manifest !== 'object') return new Set()
    const value = manifest as { fileId?: unknown; files?: unknown }
    const ids = new Set<string>()
    if (typeof value.fileId === 'string') ids.add(value.fileId)
    if (Array.isArray(value.files)) for (const entry of value.files) {
      if (entry && typeof entry === 'object') {
        const id: unknown = entry.id ?? entry.fileId
        if (typeof id === 'string') ids.add(id)
      }
    }
    return ids
  } catch { return new Set() }
}
