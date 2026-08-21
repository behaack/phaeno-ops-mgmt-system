import { type UseMutationResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Download, FileArchive, FileCheck2, Library, ShieldCheck } from 'lucide-react'

import {
  getApiErrorMessage,
  listDownloadHistory,
  listTenantDatasets,
} from '#/api/data-provisioning'
import {
  downloadLabResult,
  downloadLabResultPackage,
  getLabOrder,
  getOrderErrorMessage,
  type LabServiceOrder,
  type OperationalFile,
} from '#/api/order-management'
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
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'
import { ReleasedDeliverableRetentionNotice } from '#/features/orders/ReleasedDeliverableRetentionNotice'
import { GovernanceNoticePanel } from './GovernanceNoticePanel'

export function DataLibraryPage({ jobId }: { jobId?: string }) {
  const { authProvider, session, selectedOrganizationId } = usePhaenoSession()
  const queryClient = useQueryClient()
  const canView = Boolean(session?.capabilities.canViewOrganizationDatasets)
  const canViewLab = Boolean(session?.capabilities.canViewLabServiceOrders)
  const apiEnabled = canView && authProvider !== 'mock'
  const selectedMembership = getSelectedMembership(session, selectedOrganizationId)
  const datasetsQuery = useQuery({
    queryKey: ['curated-data', selectedOrganizationId],
    queryFn: listTenantDatasets,
    enabled: apiEnabled && !jobId,
  })
  const historyQuery = useQuery({
    queryKey: ['curated-data', selectedOrganizationId, 'downloads'],
    queryFn: listDownloadHistory,
    enabled: apiEnabled && !jobId && Boolean(selectedMembership?.isOrganizationAdmin),
  })
  const jobQuery = useQuery({
    queryKey: ['lab-service-order', jobId],
    queryFn: () => getLabOrder(jobId!),
    enabled: apiEnabled && canViewLab && Boolean(jobId),
  })
  const jobDownload = useMutation({
    mutationFn: async (request: JobDownloadRequest) => request.kind === 'package'
      ? downloadLabResultPackage(request.orderId, request.releaseId, request.releaseVersion)
      : downloadLabResult(request.orderId, request.file),
    onSuccess: async (_value, request) => {
      await queryClient.invalidateQueries({ queryKey: ['lab-service-order', request.orderId] })
    },
  })

  if (!canView) {
    return (
      <main className="page-wrap px-4 py-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Data Library unavailable</CardTitle>
            <CardDescription>
              Select an active Prospect, Customer, or Partner organization.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  if (jobId) {
    return (
      <JobDataLibrary
        jobId={jobId}
        canViewLab={canViewLab}
        order={jobQuery.data}
        isLoading={jobQuery.isLoading}
        error={jobQuery.error}
        download={jobDownload}
      />
    )
  }

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 max-w-3xl">
        <Badge variant="secondary" className="mb-3">Phaeno curated data</Badge>
        <h1 className="text-3xl font-semibold leading-tight">Data Library</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Read-only Phaeno-owned sample data explicitly assigned to this organization.
          Every active organization user can access these grants.
        </p>
      </section>

      {authProvider === 'mock' ? (
        <Alert className="mb-5">
          <AlertTitle>Connected data is paused in mock-session mode</AlertTitle>
          <AlertDescription>
            Use a real organization sign-in to load grants from the secured API.
          </AlertDescription>
        </Alert>
      ) : null}
      {datasetsQuery.error ? (
        <Alert variant="destructive" className="mb-5" role="alert">
          <AlertTitle>Data Library could not be loaded</AlertTitle>
          <AlertDescription>{getApiErrorMessage(datasetsQuery.error, 'Try again or contact Phaeno support.')}</AlertDescription>
        </Alert>
      ) : null}

      <GovernanceNoticePanel
        apiEnabled={apiEnabled}
        isOrganizationAdmin={Boolean(selectedMembership?.isOrganizationAdmin)}
        selectedOrganizationId={selectedOrganizationId}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(datasetsQuery.data ?? []).map((dataset) => (
          <Link
            key={dataset.datasetId}
            to="/data-library/$datasetId"
            params={{ datasetId: dataset.datasetId }}
            className="text-inherit no-underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Card className="h-full transition-colors hover:bg-muted/30">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Library aria-hidden="true" className="size-4" />
                  </div>
                  <Badge variant="outline">Version {dataset.versionNumber}</Badge>
                </div>
                <CardTitle className="mt-2">{dataset.name}</CardTitle>
                <CardDescription>{dataset.sampleLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="m-0 line-clamp-3 text-sm text-muted-foreground">{dataset.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md border px-2 py-1">QC: {dataset.qcStatus}</span>
                  <span className="rounded-md border px-2 py-1">{dataset.files.length} file{dataset.files.length === 1 ? '' : 's'}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      {apiEnabled && !datasetsQuery.isLoading && (datasetsQuery.data?.length ?? 0) === 0 ? (
        <Card className="max-w-2xl border-dashed">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Library aria-hidden="true" className="size-5" />
            </div>
            <CardTitle>No sample data assigned yet</CardTitle>
            <CardDescription>
              This is not an error. A Phaeno user must explicitly assign an eligible
              package version to this organization.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {selectedMembership?.isOrganizationAdmin ? (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 text-muted-foreground" />
              <div>
                <CardTitle>Organization download history</CardTitle>
                <CardDescription>
                  Organization administrators can review downloads by their own users only.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(historyQuery.data ?? []).map((download) => (
              <div key={download.id} className="flex flex-col gap-1 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  {download.kind === 'Archive' ? <FileArchive aria-hidden="true" className="size-4 shrink-0" /> : <Download aria-hidden="true" className="size-4 shrink-0" />}
                  <span className="truncate text-sm font-medium">{download.userEmail}</span>
                </div>
                <span className="text-xs text-muted-foreground">{download.kind} · {formatDate(download.downloadedAt)}</span>
              </div>
            ))}
            {!historyQuery.isLoading && (historyQuery.data?.length ?? 0) === 0 ? (
              <p className="m-0 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No downloads recorded for this organization.</p>
            ) : null}
            {historyQuery.error ? <p className="m-0 text-sm text-destructive" role="alert">{getApiErrorMessage(historyQuery.error, 'Download history could not be loaded.')}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </main>
  )
}

function JobDataLibrary({
  jobId,
  canViewLab,
  order,
  isLoading,
  error,
  download,
}: {
  jobId: string
  canViewLab: boolean
  order: LabServiceOrder | undefined
  isLoading: boolean
  error: Error | null
  download: UseMutationResult<void, Error, JobDownloadRequest>
}) {
  if (!canViewLab) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Job data unavailable</AlertTitle>
          <AlertDescription>
            This selected organization cannot view the requested laboratory job.
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  if (isLoading) {
    return <main className="page-wrap px-4 py-8"><p role="status">Loading job data…</p></main>
  }

  if (error || !order) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Job data could not be loaded</AlertTitle>
          <AlertDescription>{getOrderErrorMessage(error, 'Return to the lab job and try again.')}</AlertDescription>
        </Alert>
      </main>
    )
  }

  const releasedPackages = order.resultReleases.filter(
    (release) => release.releaseStatus === 'Released',
  )
  const hasData = releasedPackages.length > 0 || order.resultFiles.length > 0

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <Link
            to="/lab-services/$orderId"
            params={{ orderId: jobId }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to {order.orderNumber}
          </Link>
          <Badge variant="secondary" className="mt-4 mb-3 block w-fit">Lab job data</Badge>
          <h1 className="text-3xl font-semibold leading-tight">Data Library</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Released data for {order.customerReference} ({order.orderNumber}).
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/data-library" search={{}}>View organization Data Library</Link>
        </Button>
      </section>

      {download.error ? (
        <Alert variant="destructive" className="mb-5" role="alert">
          <AlertTitle>Job data could not be downloaded</AlertTitle>
          <AlertDescription>{getOrderErrorMessage(download.error, 'Try the download again.')}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Released job data</CardTitle>
          <CardDescription>
            Data appears here only after scientific, file, and commercial release gates pass.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="space-y-5">
              {releasedPackages.map((release) => (
                <section key={release.id} aria-labelledby={`job-data-release-${release.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p id={`job-data-release-${release.id}`} className="font-medium">
                        {sampleName(order, release.labSampleId)} · Result release {release.releaseVersion}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {release.analysisProfile} · Pipeline {release.pipelineVersion} · QC {release.qcStatus}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={download.isPending}
                      onClick={() => download.mutate({
                        kind: 'package',
                        orderId: order.id,
                        releaseId: release.id,
                        releaseVersion: release.releaseVersion,
                      })}
                    >
                      <FileArchive data-icon="inline-start" />
                      {download.isPending && download.variables?.kind === 'package' && download.variables.releaseId === release.id
                        ? 'Downloading…'
                        : 'Download package'}
                    </Button>
                  </div>
                  <ReleasedDeliverableRetentionNotice retention={release.retention} />
                </section>
              ))}

              {order.resultFiles.length > 0 ? (
                <ul className="divide-y border-t">
                  {order.resultFiles.map((file) => (
                    <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">{file.fileName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatBytes(file.sizeBytes)} · {fileDownloadStatus(file)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={download.isPending}
                        onClick={() => download.mutate({ kind: 'file', orderId: order.id, file })}
                      >
                        <Download data-icon="inline-start" />
                        {download.isPending && download.variables?.kind === 'file' && download.variables.file.id === file.id
                          ? 'Downloading…'
                          : 'Download'}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <FileCheck2 aria-hidden="true" className="mb-2 size-7 text-muted-foreground" />
              <p className="font-medium">No released job data yet</p>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                Return to the lab job to review processing, scientific readiness, and any payment or release gate.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/lab-services/$orderId" params={{ orderId: jobId }}>Return to job</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatBytes(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'unit',
    unit: value >= 1_000_000 ? 'megabyte' : 'kilobyte',
    maximumFractionDigits: 1,
  }).format(value >= 1_000_000 ? value / 1_000_000 : value / 1_000)
}

function sampleName(order: LabServiceOrder, sampleId: string) {
  return order.samples.find((sample) => sample.id === sampleId)?.customerSampleId ?? 'Sample'
}

function fileDownloadStatus(file: OperationalFile) {
  if (file.download?.isDownloaded) return 'Downloaded'
  if ((file.download?.activeAttemptCount ?? 0) > 0) return 'Download in progress'
  return 'Not downloaded'
}

type JobDownloadRequest =
  | { kind: 'package'; orderId: string; releaseId: string; releaseVersion: number }
  | { kind: 'file'; orderId: string; file: OperationalFile }
