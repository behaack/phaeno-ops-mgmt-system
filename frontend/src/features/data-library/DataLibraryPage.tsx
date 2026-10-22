import { RecordLink } from '#/components/ui/record-link'
import { PageTitle } from '#/components/ui/page-header'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { RecordPagination } from '#/components/RecordPagination'
import { useScopedRecordPage } from '#/components/use-scoped-record-page'
import { CustomerText, useCustomerText, useCustomerDateFormatter } from '#/features/customer-i18n/customer-text'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, FileArchive, Library, ShieldCheck } from 'lucide-react'

import {
  getApiErrorMessage,
  listDownloadHistoryPage,
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
import { GovernanceNoticePanel } from './GovernanceNoticePanel'

export function DataLibraryPage() {
  const __customerText = useCustomerText()
  const dates = useCustomerDateFormatter(true)

  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const canView = Boolean(session?.capabilities.canViewOrganizationDatasets)
  const selectedMembership = getSelectedMembership(session, selectedOrganizationId)
  const department = session?.selectedDepartment
  const scopeReady = Boolean(department?.isAvailable
    && department.organizationId === selectedOrganizationId
    && department.departmentId === selectedDepartmentId)
  const apiEnabled = canView && scopeReady && authProvider !== 'mock'
  const canViewHistory = scopeReady && Boolean(selectedMembership?.isOrganizationAdmin || department?.isDepartmentAdmin)
  const datasetsQuery = useQuery({
    queryKey: ['curated-data', selectedOrganizationId, selectedDepartmentId],
    queryFn: listTenantDatasets,
    enabled: apiEnabled,
  })
  const historyQuerySelection = useScopedRecordPage(`${selectedOrganizationId}:${selectedDepartmentId}`)
  const historyQueryPage = useQuery({
    queryKey: ['curated-data', selectedOrganizationId, selectedDepartmentId, 'downloads', `${selectedOrganizationId}:${selectedDepartmentId}`, historyQuerySelection.page],
    queryFn: () => listDownloadHistoryPage(historyQuerySelection.page),
    enabled: apiEnabled && canViewHistory,
  })
  const historyQuery = { ...historyQueryPage, data: historyQueryPage.isError ? undefined : historyQueryPage.data?.items }

  if (!canView) {
    return (
      <main className="page-wrap px-4 py-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle><CustomerText message="m_5913b3095540" /></CardTitle>
            <CardDescription>
              <CustomerText message="m_d4c3e80168c3" /></CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }


  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 max-w-3xl">
        <Badge variant="secondary" className="mb-3"><CustomerText message="m_a929de0aff97" /></Badge>
        <PageTitle><CustomerText message="m_c7f86b3ebb58" /></PageTitle>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          <CustomerText message="m_85a310c82afc" /></p>
      </section>

      {authProvider === 'mock' ? (
        <Alert className="mb-5">
          <AlertTitle><CustomerText message="m_16e7b1ab9dd3" /></AlertTitle>
          <AlertDescription>
            <CustomerText message="m_8d4b3c7adc74" /></AlertDescription>
        </Alert>
      ) : null}
      {datasetsQuery.error ? (
        <Alert variant="destructive" className="mb-5" role="alert">
          <AlertTitle><CustomerText message="m_d27e3e83582c" /></AlertTitle>
          <AlertDescription><CustomerSourceText source={getApiErrorMessage(datasetsQuery.error, 'Try again or contact Phaeno support.')} /></AlertDescription>
        </Alert>
      ) : null}

      <GovernanceNoticePanel
        apiEnabled={apiEnabled}
        isOrganizationAdmin={Boolean(selectedMembership?.isOrganizationAdmin)}
        selectedOrganizationId={selectedOrganizationId}
        selectedDepartmentId={selectedDepartmentId}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(datasetsQuery.data ?? []).map((dataset) => (
          <div key={dataset.datasetId} className="min-w-0">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Library aria-hidden="true" className="size-4" />
                  </div>
                  <Badge variant="outline"><CustomerText message="m_92b2c95e99f0" />{dataset.versionNumber}</Badge>
                </div>
                <CardTitle className="mt-2"><RecordLink asChild><Link to="/data-library/$datasetId" params={{ datasetId: dataset.datasetId }}>{dataset.name}</Link></RecordLink></CardTitle>
                <CardDescription>{dataset.sampleLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="m-0 line-clamp-3 text-sm text-muted-foreground">{dataset.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md border px-2 py-1">QC: {dataset.qcStatus}</span>
                  <span className="rounded-md border px-2 py-1">{dataset.files.length} <CustomerText message="m_b4c480d5276e" />{dataset.files.length === 1 ? '' : 's'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </section>

      {apiEnabled && !datasetsQuery.isLoading && (datasetsQuery.data?.length ?? 0) === 0 ? (
        <Card className="max-w-2xl border-dashed">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Library aria-hidden="true" className="size-5" />
            </div>
            <CardTitle><CustomerText message="m_a26b1d63729e" /></CardTitle>
            <CardDescription>
              <CustomerText message="m_6c91d4699202" /></CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {canViewHistory ? (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 text-muted-foreground" />
              <div>
                <CardTitle><CustomerText message="m_37c20cdd31ed" /></CardTitle>
                <CardDescription>
                  <CustomerText message="m_0790cedd0753" />{selectedMembership?.isOrganizationAdmin
                    ? <CustomerSourceText source={" Older records with an unknown department are also included for grants in this scope."} />
                    : __customerText('m_8ee36a18f617')}
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
                <span className="text-xs text-muted-foreground">{download.kind} · {dates.format(new Date(download.downloadedAt))}</span>
              </div>
            ))}
            {!historyQuery.isLoading && !historyQuery.isError && historyQueryPage.data?.totalCount === 0 ? (
              <p className="m-0 rounded-lg border border-dashed p-4 text-sm text-muted-foreground"><CustomerText message="m_51bbd84c2cda" /></p>
            ) : null}
            <RecordPagination label={__customerText('download_history_pages')} data={historyQueryPage.isError ? undefined : historyQueryPage.data} busy={historyQueryPage.isFetching} onPage={historyQuerySelection.setPage} />
            {historyQuery.error ? <p className="m-0 text-sm text-destructive" role="alert"><CustomerSourceText source={getApiErrorMessage(historyQuery.error, 'Download history could not be loaded.')} /></p> : null}
          </CardContent>
        </Card>
      ) : null}
    </main>
  )
}
