import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Download, FileArchive, LockKeyhole } from 'lucide-react'

import {
  downloadTenantArchive,
  downloadTenantFile,
  getApiErrorMessage,
  getTenantDataset,
  type ManagedFile,
} from '#/api/data-provisioning'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { usePhaenoSession } from '#/features/auth/session-context'

export function DatasetDetailPage({ datasetId }: { datasetId: string }) {
  const { authProvider, session, selectedOrganizationId } = usePhaenoSession()
  const apiEnabled =
    authProvider !== 'mock' && Boolean(session?.capabilities.canViewOrganizationDatasets)
  const datasetQuery = useQuery({
    queryKey: ['curated-data', selectedOrganizationId, datasetId],
    queryFn: () => getTenantDataset(datasetId),
    enabled: apiEnabled,
  })
  const fileMutation = useMutation({
    mutationFn: (file: ManagedFile) => downloadTenantFile(datasetId, file),
  })
  const archiveMutation = useMutation({
    mutationFn: (name: string) => downloadTenantArchive(datasetId, name),
  })
  const dataset = datasetQuery.data

  if (!apiEnabled) {
    return <main className="page-wrap px-4 py-8"><BackLink /><Alert className="mt-4"><AlertTitle>Connected data is unavailable</AlertTitle><AlertDescription>Use a real organization sign-in to open this secured package.</AlertDescription></Alert></main>
  }
  if (datasetQuery.isLoading) {
    return <main className="page-wrap px-4 py-8"><p>Loading curated package…</p></main>
  }
  if (!dataset || datasetQuery.error) {
    return <main className="page-wrap px-4 py-8"><BackLink /><Alert variant="destructive" className="mt-4" role="alert"><AlertTitle>Package unavailable</AlertTitle><AlertDescription>{getApiErrorMessage(datasetQuery.error, 'This package is not available to the selected organization.')}</AlertDescription></Alert></main>
  }

  const downloadError = fileMutation.error ?? archiveMutation.error
  return (
    <main className="page-wrap px-4 py-8">
      <BackLink />
      <section className="mt-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-3xl font-semibold leading-tight">{dataset.name}</h1>
            <Badge variant="secondary">Version {dataset.versionNumber}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{dataset.sampleLabel}</p>
        </div>
        <Button type="button" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(`${dataset.name}-v${dataset.versionNumber}.zip`)}>
          <FileArchive data-icon="inline-start" />
          {archiveMutation.isPending ? 'Preparing archive' : 'Download complete archive'}
        </Button>
      </section>

      {downloadError ? <Alert variant="destructive" className="mb-5" role="alert"><AlertTitle>Download failed</AlertTitle><AlertDescription>{getApiErrorMessage(downloadError, 'The file could not be downloaded.')}</AlertDescription></Alert> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Package summary</CardTitle><CardDescription>{dataset.description}</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Definition label="Biological context" value={dataset.biologicalContext} />
              <Definition label="Assay context" value={dataset.assayContext} />
              <Definition label="Analysis summary" value={dataset.analysisSummary} />
              <Definition label="QC status" value={dataset.qcStatus} />
              <Definition label="Provenance" value={dataset.provenance} />
              <Definition label="Published" value={formatDate(dataset.publishedAt)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Immutable file manifest</CardTitle><CardDescription>Files are read-only. The portal does not preview scientific file contents.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {dataset.files.map((file) => (
                <div key={file.id} className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="m-0 truncate font-medium">{file.fileName}</p>
                    <p className="m-0 mt-1 text-xs text-muted-foreground">{file.fileKind} · {formatBytes(file.sizeBytes)}</p>
                    <p className="m-0 mt-2 break-all font-mono text-[0.6875rem] text-muted-foreground">SHA-256 {file.sha256}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" disabled={fileMutation.isPending} onClick={() => fileMutation.mutate(file)}>
                    <Download data-icon="inline-start" />Download
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader>
            <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><LockKeyhole aria-hidden="true" className="size-4" /></div>
            <CardTitle>Access and integrity</CardTitle>
            <CardDescription>Current organization access is checked again for every file and archive request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><p className="m-0 font-medium">Package checksum</p><p className="m-0 mt-1 break-all font-mono text-xs text-muted-foreground">{dataset.contentChecksum}</p></div>
            <p className="m-0 text-muted-foreground">Revocation ends future portal access immediately. Previously downloaded copies cannot be recalled.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function Definition({ label, value }: { label: string; value: string }) {
  return <div><p className="m-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p><p className="m-0 mt-1 text-sm leading-6">{value}</p></div>
}

function BackLink() {
  return <Link to="/data-library" className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline underline-offset-4 hover:no-underline"><ArrowLeft aria-hidden="true" className="size-4" />Back to Data Library</Link>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
