import { BackLink } from '#/components/ui/back-link'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, FileArchive, LockKeyhole } from 'lucide-react'

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
  const __customerText = useCustomerText()

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
    return <main className="page-wrap px-4 py-8"><LibraryReturnLink /><Alert className="mt-4"><AlertTitle><CustomerText message="m_ebb08438dc3c" /></AlertTitle><AlertDescription><CustomerText message="m_ebefce8e5318" /></AlertDescription></Alert></main>
  }
  if (datasetQuery.isLoading) {
    return <main className="page-wrap px-4 py-8"><p><CustomerText message="m_59e2daab594e" /></p></main>
  }
  if (!dataset || datasetQuery.error) {
    return <main className="page-wrap px-4 py-8"><LibraryReturnLink /><Alert variant="destructive" className="mt-4" role="alert"><AlertTitle><CustomerText message="m_8949b1570015" /></AlertTitle><AlertDescription><CustomerSourceText source={getApiErrorMessage(datasetQuery.error, 'This package is not available to the selected organization.')} /></AlertDescription></Alert></main>
  }

  const downloadError = fileMutation.error ?? archiveMutation.error
  return (
    <main className="page-wrap px-4 py-8">
      <LibraryReturnLink />
      <section className="mt-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-3xl font-semibold leading-tight">{dataset.name}</h1>
            <Badge variant="secondary"><CustomerText message="m_92b2c95e99f0" />{dataset.versionNumber}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{dataset.sampleLabel}</p>
        </div>
        <Button type="button" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(`${dataset.name}-v${dataset.versionNumber}.zip`)}>
          <FileArchive data-icon="inline-start" />
          {archiveMutation.isPending ? <CustomerSourceText source={"Preparing archive"} /> : __customerText('m_35da857c18a2')}
        </Button>
      </section>

      {downloadError ? <Alert variant="destructive" className="mb-5" role="alert"><AlertTitle><CustomerText message="m_eae34ccbc443" /></AlertTitle><AlertDescription><CustomerSourceText source={getApiErrorMessage(downloadError, 'The file could not be downloaded.')} /></AlertDescription></Alert> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle><CustomerText message="m_101bcb9a7cce" /></CardTitle><CardDescription>{dataset.description}</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Definition label={__customerText('m_2982b337e1bf')} value={dataset.biologicalContext} />
              <Definition label={__customerText('m_66db048fcc09')} value={dataset.assayContext} />
              <Definition label={__customerText('m_b50c60980685')} value={dataset.analysisSummary} />
              <Definition label={__customerText('m_7b919a414770')} value={dataset.qcStatus} />
              <Definition label={__customerText('m_1c4b8ff60530')} value={dataset.provenance} />
              <Definition label={__customerText('m_2ef42ec21d93')} value={formatDate(dataset.publishedAt)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle><CustomerText message="m_477d209bc944" /></CardTitle><CardDescription><CustomerText message="m_a8517817a46e" /></CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {dataset.files.map((file) => (
                <div key={file.id} className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="m-0 truncate font-medium">{file.fileName}</p>
                    <p className="m-0 mt-1 text-xs text-muted-foreground">{file.fileKind} · {formatBytes(file.sizeBytes)}</p>
                    <p className="m-0 mt-2 break-all font-mono text-[0.6875rem] text-muted-foreground"><CustomerText message="m_a8441e012daa" />{file.sha256}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" disabled={fileMutation.isPending} onClick={() => fileMutation.mutate(file)}>
                    <Download data-icon="inline-start" /><CustomerText message="m_d6eafe823591" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader>
            <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><LockKeyhole aria-hidden="true" className="size-4" /></div>
            <CardTitle><CustomerText message="m_fb95f92963b2" /></CardTitle>
            <CardDescription><CustomerText message="m_c95b8d1370d2" /></CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><p className="m-0 font-medium"><CustomerText message="m_dcaace66f6c5" /></p><p className="m-0 mt-1 break-all font-mono text-xs text-muted-foreground">{dataset.contentChecksum}</p></div>
            <p className="m-0 text-muted-foreground"><CustomerText message="m_b292766851c4" /></p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function Definition({ label, value }: { label: string; value: string }) {
  return <div><p className="m-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p><p className="m-0 mt-1 text-sm leading-6">{value}</p></div>
}

function LibraryReturnLink() {
  return <BackLink asChild><Link to="/data-library"><CustomerText message="m_844de73c889e" /></Link></BackLink>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
