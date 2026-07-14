import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, FileArchive, Library, ShieldCheck } from 'lucide-react'

import {
  getApiErrorMessage,
  listDownloadHistory,
  listTenantDatasets,
} from '#/api/data-provisioning'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
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

export function DataLibraryPage() {
  const { authProvider, session, selectedOrganizationId } = usePhaenoSession()
  const canView = Boolean(session?.capabilities.canViewOrganizationDatasets)
  const apiEnabled = canView && authProvider !== 'mock'
  const selectedMembership = getSelectedMembership(session, selectedOrganizationId)
  const datasetsQuery = useQuery({
    queryKey: ['curated-data', selectedOrganizationId],
    queryFn: listTenantDatasets,
    enabled: apiEnabled,
  })
  const historyQuery = useQuery({
    queryKey: ['curated-data', selectedOrganizationId, 'downloads'],
    queryFn: listDownloadHistory,
    enabled: apiEnabled && Boolean(selectedMembership?.isOrganizationAdmin),
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
