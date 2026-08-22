import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, FileArchive, FileCheck2, Library, PackageCheck, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { acceptLabQuote, confirmLabSampleImport, deleteLabSample, downloadLabResult, downloadLabResultPackage, downloadLabSampleTemplate, finalizeLabSampleRoster, getLabOrder, getOrderErrorMessage, isOrderConcurrencyError, previewLabSampleImport, recordLabSampleShipment, requestLabCancellation, submitLabOrder, type LabSample, type LabSampleImportPreview, type OperationalFile, type Quote, withdrawLabOrder } from '#/api/order-management'
import { getSampleShipments } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFeedback, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { RequiredDialogFooter, RequiredFieldName, RequiredMark } from '#/components/ui/required-field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { usePhaenoSession } from '#/features/auth/session-context'
import { LabJobDetailsDialog } from './LabJobDetailsDialog'
import { LabSampleDialog } from './LabSampleDialog'
import { humanizeStatus, OrderStatusBadge } from './OrderStatusBadge'
import { ReleasedDeliverableRetentionNotice } from './ReleasedDeliverableRetentionNotice'

export function LabServiceDetailPage({
  orderId,
  initialJobDetailsOpen = false,
  onJobDetailsOpenChange,
}: {
  orderId: string
  initialJobDetailsOpen?: boolean
  onJobDetailsOpenChange?: (open: boolean) => void
}) {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<'accept' | 'cancel' | 'withdraw' | 'shipment' | null>(null)
  const [jobDetailsOpen, setJobDetailsOpen] = useState(initialJobDetailsOpen)
  const [sampleDialog, setSampleDialog] = useState<LabSample | null | undefined>(undefined)
  const [sampleToRemove, setSampleToRemove] = useState<LabSample | null>(null)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [prohibitedDataConfirmed, setProhibitedDataConfirmed] = useState(false)
  const [submitConcurrencyMessage, setSubmitConcurrencyMessage] = useState<string | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [shipmentSampleId, setShipmentSampleId] = useState('')
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [sampleImportOpen, setSampleImportOpen] = useState(false)
  const [sampleImportFile, setSampleImportFile] = useState<File | null>(null)
  const [sampleImportPreview, setSampleImportPreview] = useState<LabSampleImportPreview | null>(null)
  const [rosterConfirmed, setRosterConfirmed] = useState(false)
  const apiEnabled = Boolean(session?.capabilities.canViewLabServiceOrders) && authProvider !== 'mock'
  const canViewShipping = Boolean(session?.capabilities.canViewSampleShipping)
  const canViewData = Boolean(session?.capabilities.canViewOrganizationDatasets)
  const orderQuery = useQuery({ queryKey: ['lab-service-order', orderId], queryFn: () => getLabOrder(orderId), enabled: apiEnabled })
  const shipmentsQuery = useQuery({ queryKey: ['sample-shipments'], queryFn: getSampleShipments, enabled: apiEnabled && canViewShipping })
  const action = useMutation({
    mutationFn: async (kind: 'submit' | 'accept' | 'cancel' | 'withdraw' | 'shipment') => {
      const order = orderQuery.data
      if (!order) throw new Error('The order has not loaded.')
      if (kind === 'submit') return submitLabOrder(order.id, order.version)
      if (kind === 'accept') {
        const quote = currentQuote(order.quotes)
        if (!quote) throw new Error('No current quote is available.')
        return acceptLabQuote(order.id, quote.id, order.version)
      }
      if (kind === 'withdraw') return withdrawLabOrder(order.id, order.version, cancellationReason)
      if (kind === 'shipment') {
        const sample = order.samples.find((item) => item.id === shipmentSampleId)
        if (!sample) throw new Error('Select a sample before recording shipment.')
        return recordLabSampleShipment(order.id, sample.id, { version: sample.version, carrier: carrier || null, trackingNumber: trackingNumber || null, shippedAt: new Date().toISOString() })
      }
      return requestLabCancellation(order.id, order.version, cancellationReason)
    },
    onSuccess: async (_order, kind) => {
      setDialog(null); setCancellationReason(''); setShipmentSampleId(''); setCarrier(''); setTrackingNumber('')
      if (kind === 'submit') {
        setSubmitOpen(false)
        setProhibitedDataConfirmed(false)
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] }),
      ])
    },
    onError: async (error, kind) => {
      if (kind !== 'submit' || !isOrderConcurrencyError(error)) return

      setProhibitedDataConfirmed(false)
      try {
        const latest = await orderQuery.refetch()
        setSubmitConcurrencyMessage(latest.data
          ? 'The latest Job has been loaded. Review the current pricing details, then confirm and submit again.'
          : 'The latest Job could not be loaded. Close this window, refresh the Job, and try again.')
      } catch {
        setSubmitConcurrencyMessage('The latest Job could not be loaded. Close this window, refresh the Job, and try again.')
      }
    },
  })
  const downloadAction = useMutation({
    mutationFn: async (download: LabResultDownloadRequest) => download.kind === 'package'
      ? downloadLabResultPackage(orderId, download.releaseId, download.releaseVersion)
      : downloadLabResult(orderId, download.file),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] }),
  })
  const removeSampleAction = useMutation({
    mutationFn: async (sampleId: string) => {
      const order = orderQuery.data
      if (!order) throw new Error('The job has not loaded.')
      const sample = order.samples.find((item) => item.id === sampleId)
      if (!sample) throw new Error('The sample no longer exists.')
      return deleteLabSample(order.id, sample.id, sample.version)
    },
    onSuccess: async () => {
      setSampleToRemove(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] }),
      ])
    },
  })
  const importPreviewAction = useMutation({
    mutationFn: async () => {
      const order = orderQuery.data
      if (!order || !sampleImportFile) throw new Error('Choose a CSV file first.')
      return previewLabSampleImport(order.id, sampleImportFile, order.version)
    },
    onSuccess: setSampleImportPreview,
  })
  const importConfirmAction = useMutation({
    mutationFn: async () => {
      const order = orderQuery.data
      if (!order || !sampleImportPreview) throw new Error('Preview the CSV file first.')
      return confirmLabSampleImport(order.id, sampleImportPreview.previewId, order.version)
    },
    onSuccess: async () => {
      setSampleImportOpen(false); setSampleImportFile(null); setSampleImportPreview(null)
      await queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] })
    },
  })
  const finalizeRosterAction = useMutation({
    mutationFn: async () => {
      const order = orderQuery.data
      if (!order) throw new Error('The Job has not loaded.')
      return finalizeLabSampleRoster(order.id, order.version)
    },
    onSuccess: async () => {
      setRosterConfirmed(false)
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] }), queryClient.invalidateQueries({ queryKey: ['sample-shipments'] })])
    },
  })

  if (!apiEnabled) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle>Connected order detail is unavailable</AlertTitle><AlertDescription>Use a signed-in Customer session to review this laboratory request.</AlertDescription></Alert></main>
  if (orderQuery.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading laboratory order…</p></main>
  if (orderQuery.error || !orderQuery.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Laboratory order could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(orderQuery.error, 'Return to Lab services and try again.')}</AlertDescription></Alert></main>

  const order = orderQuery.data
  const quote = currentQuote(order.quotes)
  const jobShipments = (shipmentsQuery.data ?? []).filter(
    (shipment) => shipment.authorizationSource === 'CustomerLabServiceOrder'
      && shipment.authorizationSourceId === order.id,
  )
  const awaitingShipment = order.samples.filter((sample) => !sample.receivedAt)
  const sourceProfileComplete = order.requestedSpecimenCount > 0 && order.sourceGroups.length > 0
  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-sm text-muted-foreground"><Link to="/lab-services" className="hover:underline">Lab services</Link> / <span className="font-mono">{order.orderNumber}</span></p><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold">{order.customerReference}</h1><OrderStatusBadge status={order.status} /></div>{order.description ? <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6">{order.description}</p> : null}<p className="mt-2 text-sm text-muted-foreground">Updated {formatDate(order.updatedAt)}</p></div>
        <div className="flex flex-wrap gap-2">
          {order.canEdit ? (
            <Button type="button" variant="outline" onClick={() => setJobDetailsOpen(true)}>
              <Pencil data-icon="inline-start" />
              Job details
            </Button>
          ) : null}
          {order.canSubmit ? (
            <Button
              type="button"
              onClick={() => { action.reset(); setSubmitConcurrencyMessage(null); setSubmitOpen(true) }}
              disabled={action.isPending || !sourceProfileComplete}
            >
              Submit for pricing
            </Button>
          ) : null}
          {order.canAcceptQuote ? <Button type="button" onClick={() => setDialog('accept')}>Accept quote</Button> : null}
          {order.canWithdraw ? <Button type="button" variant="outline" onClick={() => setDialog('withdraw')}>Withdraw</Button> : null}
          {order.canRequestCancellation ? <Button type="button" variant="outline" onClick={() => setDialog('cancel')}>Request cancellation</Button> : null}
        </div>
      </section>
      {order.tenantSafeReason ? <Alert className="mb-5"><AlertTitle>Action needed</AlertTitle><AlertDescription>{order.tenantSafeReason}</AlertDescription></Alert> : null}
      {order.labCustomerActionSummary ? <Alert className="mb-5"><AlertTitle>Laboratory action needed</AlertTitle><AlertDescription>{order.labCustomerActionSummary}</AlertDescription></Alert> : null}
      {action.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Order was not updated</AlertTitle><AlertDescription>{getOrderErrorMessage(action.error, 'Reload and try again.')}</AlertDescription></Alert> : null}
      {downloadAction.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Download did not complete</AlertTitle><AlertDescription>{getOrderErrorMessage(downloadAction.error, 'The incomplete transfer was not counted. Try again while downloads remain open.')}</AlertDescription></Alert> : null}

      {order.labMilestone ? <Card className="mb-5"><CardHeader><CardTitle>Laboratory progress</CardTitle><CardDescription>Current customer-safe milestone from the laboratory record.</CardDescription></CardHeader><CardContent><div className="flex flex-wrap items-center gap-3"><OrderStatusBadge status={order.labMilestone} />{order.labScheduleHealth ? <span className="text-sm text-muted-foreground">Schedule: {humanizeStatus(order.labScheduleHealth)}</span> : null}{order.labExpectedCompletionAtUtc ? <span className="text-sm text-muted-foreground">Expected {formatDate(order.labExpectedCompletionAtUtc)}</span> : null}</div>{order.labPermittedQcProjectionJson ? <details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Approved QC summary</summary><pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">{prettyJson(order.labPermittedQcProjectionJson)}</pre></details> : null}{order.labReadyForRelease ? <p className="mt-3 text-sm">Scientific review is complete. Phaeno must still complete the Commercial release before any result file appears here.</p> : null}</CardContent></Card> : null}

      <Tabs defaultValue="samples">
        <TabsList aria-label="Lab job sections" className="grid h-auto w-full grid-cols-2 sm:w-fit sm:grid-cols-4">
          <TabsTrigger value="samples">Samples &amp; shipping</TabsTrigger>
          <TabsTrigger value="quote">Quote &amp; billing</TabsTrigger>
          <TabsTrigger value="data">Data &amp; results</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="samples" className="mt-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Job sample profile</CardTitle>
              <CardDescription>
                These requirements apply to every sample in this job.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sample type</dt>
                  <dd className="mt-1 text-sm">Extracted RNA</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quantity unit</dt>
                  <dd className="mt-1 text-sm">Tubes</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Committed samples</dt>
                  <dd className="mt-1 text-sm">{order.requestedSpecimenCount}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Biological source</dt>
                  <dd className="mt-1 text-sm">{order.sourceGroups.map((group) => `${group.biologicalSource} (${group.specimenCount})`).join(', ')}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Storage requirements</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm">{order.storageRequirements}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Safety declaration</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm">{order.safetyDeclaration}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Samples</CardTitle>
                  <CardDescription>
                    {order.placedAt
                      ? `${order.samples.length} of ${order.requestedSpecimenCount} samples entered. Add them manually or replace the draft from CSV.`
                      : 'Sample entry opens only after your organization accepts the Job price.'}
                  </CardDescription>
                </div>
                {order.canEditSamples ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => void downloadLabSampleTemplate(order.id, order.orderNumber)}><Download data-icon="inline-start" />CSV template</Button>
                    <Button type="button" variant="outline" onClick={() => { setSampleImportPreview(null); setSampleImportFile(null); setSampleImportOpen(true) }}>Upload CSV</Button>
                    <Button type="button" onClick={() => setSampleDialog(null)} disabled={order.samples.length >= order.requestedSpecimenCount}><Plus data-icon="inline-start" />Add sample</Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {!order.placedAt && order.samples.length > 0 ? (
                <Alert className="mb-4">
                  <AlertTitle>This draft contains sample rows from the former workflow</AlertTitle>
                  <AlertDescription>
                    Remove each legacy row before submitting the Job for pricing.
                    You can enter the sample roster again after accepting the price.
                  </AlertDescription>
                </Alert>
              ) : null}
              {order.samples.length ? (
                <div className="divide-y">
                  {order.samples.map((sample) => (
                    <section key={sample.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="font-medium">{sample.customerSampleId}</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatTubeQuantity(sample.quantity)}
                            {order.hasMixedBiologicalSources
                              ? ` · ${sample.biologicalSource}`
                              : null}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <OrderStatusBadge status={sample.status} />
                          {order.canEditSamples ? (
                            <>
                              <Button type="button" size="sm" variant="outline" onClick={() => setSampleDialog(sample)}>
                                <Pencil data-icon="inline-start" />
                                Edit
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => { removeSampleAction.reset(); setSampleToRemove(sample) }}>
                                <Trash2 data-icon="inline-start" />
                                Remove
                              </Button>
                            </>
                          ) : !order.placedAt && order.canEdit ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => { removeSampleAction.reset(); setSampleToRemove(sample) }}>
                              <Trash2 data-icon="inline-start" />
                              Remove legacy row
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {sample.accessionId ? <p className="mt-2 text-sm">Accession <span className="font-mono">{sample.accessionId}</span></p> : null}
                      {sample.trackingNumber ? <p className="mt-2 text-sm">Shipment {sample.carrier ?? ''} <span className="font-mono">{sample.trackingNumber}</span></p> : null}
                      {sample.receiptCondition ? <p className="mt-1 text-sm text-muted-foreground">Receipt: {sample.receiptCondition}</p> : null}
                      {sample.tenantSafeReason ? <p className="mt-2 text-sm text-destructive">{sample.tenantSafeReason}</p> : null}
                    </section>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <p className="font-medium">No samples added</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    {order.placedAt
                      ? `Enter exactly ${order.requestedSpecimenCount} samples, then finalize the list for return-kit preparation.`
                      : 'Submit the Job for pricing and accept the price before entering any sample IDs.'}
                  </p>
                  {order.canEditSamples ? (
                    <Button
                      type="button"
                      className="mt-4"
                      onClick={() => setSampleDialog(null)}
                    >
                      <Plus data-icon="inline-start" />Add sample
                    </Button>
                  ) : null}
                </div>
              )}
              {order.canEditSamples && order.samples.length > 0 ? (
                <section className="mt-5 space-y-3 border-t pt-5">
                  <div className="flex items-start gap-3"><Checkbox id="roster-confirm" checked={rosterConfirmed} onCheckedChange={(value) => setRosterConfirmed(value === true)} /><Label htmlFor="roster-confirm" className="font-normal leading-5">I reviewed the sample IDs, confirmed they contain no patient identifiers or PHI, and confirm that the source and tube counts match the accepted Job.</Label></div>
                  {finalizeRosterAction.error ? <Alert variant="destructive"><AlertTitle>Sample list was not finalized</AlertTitle><AlertDescription>{getOrderErrorMessage(finalizeRosterAction.error, 'Review the count mismatches and try again.')}</AlertDescription></Alert> : null}
                  <div className="flex justify-end"><Button type="button" disabled={!rosterConfirmed || !order.canFinalizeSamples || finalizeRosterAction.isPending} onClick={() => finalizeRosterAction.mutate()}>{finalizeRosterAction.isPending ? 'Finalizing…' : 'Finalize sample list'}</Button></div>
                </section>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Samples and shipping</CardTitle>
              <CardDescription>
                Prepare and return this job's samples after the laboratory work is authorized.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!order.placedAt ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <PackageCheck aria-hidden="true" className="mb-2 size-7 text-muted-foreground" />
                  <p className="font-medium">Shipping begins after authorization</p>
                  <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                    Complete the request and accept the current quote before preparing samples for shipment.
                  </p>
                </div>
              ) : (
                <>
                  <section aria-labelledby="submission-instructions-heading" className="rounded-lg border bg-muted/20 p-4">
                    <h3 id="submission-instructions-heading" className="font-medium">Submission instructions</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {order.submissionInstructions || 'Phaeno is preparing the submission instructions for this job.'}
                    </p>
                  </section>

                  {shipmentsQuery.error ? (
                    <Alert variant="destructive">
                      <AlertTitle>Authorized shipments could not be loaded</AlertTitle>
                      <AlertDescription>{getOrderErrorMessage(shipmentsQuery.error, 'Reload the job and try again.')}</AlertDescription>
                    </Alert>
                  ) : null}

                  {shipmentsQuery.isLoading ? (
                    <p role="status" className="text-sm text-muted-foreground">Loading authorized shipments…</p>
                  ) : null}

                  {jobShipments.length > 0 ? (
                    <div className="divide-y">
                      {jobShipments.map((shipment) => {
                        const matchedCount = shipment.crosswalk.filter((item) => item.supplierTubeBarcode).length
                        return (
                          <section key={shipment.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">Shipment {shipment.shipmentNumber}</p>
                                <Badge variant="outline">{humanizeStatus(shipment.status)}</Badge>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {shipment.destinationName} · {matchedCount} of {shipment.crosswalk.length} tubes matched
                              </p>
                            </div>
                            <Button asChild variant="outline">
                              <Link to="/sample-shipping/$shipmentId" params={{ shipmentId: shipment.id }}>
                                Open shipment
                              </Link>
                            </Button>
                          </section>
                        )
                      })}
                    </div>
                  ) : !shipmentsQuery.isLoading ? (
                    awaitingShipment.length > 0 ? (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Record carrier details after each sample leaves your organization.
                        </p>
                        <div className="mt-3 divide-y">
                          {awaitingShipment.map((sample) => (
                            <section key={sample.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                              <div>
                                <p className="font-medium">{sample.customerSampleId}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {sample.trackingNumber
                                    ? `${sample.carrier ?? 'Carrier'} · ${sample.trackingNumber}`
                                    : 'Shipment not recorded'}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setShipmentSampleId(sample.id)
                                  setCarrier(sample.carrier ?? '')
                                  setTrackingNumber(sample.trackingNumber ?? '')
                                  setDialog('shipment')
                                }}
                              >
                                Record shipment
                              </Button>
                            </section>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Every sample in this job has been received by Phaeno.
                      </p>
                    )
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="data" className="mt-5">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Data and results</CardTitle>
                  <CardDescription>Scientific readiness and commercial release are separate. Files appear here only after all release gates pass.</CardDescription>
                </div>
                {canViewData ? (
                  <Button asChild variant="outline">
                    <Link to="/data-library" search={{ jobId: order.id }}>
                      <Library data-icon="inline-start" />
                      Open in Data Library
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {order.resultReleases.some((release) => release.releaseStatus === 'Released') ? (
                <div className="mb-5 space-y-4">
                  {order.resultReleases
                    .filter((release) => release.releaseStatus === 'Released')
                    .map((release) => (
                      <section key={release.id} aria-labelledby={`result-release-${release.id}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p id={`result-release-${release.id}`} className="text-sm font-medium">
                            {sampleName(order.samples, release.labSampleId)} · Result release {release.releaseVersion}
                          </p>
                          <Button type="button" size="sm" variant="outline" disabled={downloadAction.isPending} onClick={() => downloadAction.mutate({ kind: 'package', releaseId: release.id, releaseVersion: release.releaseVersion })}><FileArchive data-icon="inline-start" />{downloadAction.isPending && downloadAction.variables?.kind === 'package' && downloadAction.variables.releaseId === release.id ? 'Downloading…' : 'Download package'}</Button>
                        </div>
                        <ReleasedDeliverableRetentionNotice retention={release.retention} />
                      </section>
                    ))}
                </div>
              ) : null}
              {order.resultFiles.length ? (
                <ul className="divide-y">
                  {order.resultFiles.map((file) => (
                    <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)} · Released {file.releasedAt ? formatDate(file.releasedAt) : '—'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{fileDownloadStatus(file)}</p>
                      </div>
                      <Button type="button" variant="outline" disabled={downloadAction.isPending} onClick={() => downloadAction.mutate({ kind: 'file', file })}><Download data-icon="inline-start" />{downloadAction.isPending && downloadAction.variables?.kind === 'file' && downloadAction.variables.file.id === file.id ? 'Downloading…' : 'Download'}</Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <FileCheck2 aria-hidden="true" className="mb-2 size-7 text-muted-foreground" />
                  <p className="font-medium">No released results</p>
                  <p className="mt-1 text-sm text-muted-foreground">Results may still be processing or awaiting payment.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quote" className="mt-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Quote and commercial status</CardTitle>
              <CardDescription>Job-specific pricing is immutable by revision.</CardDescription>
            </CardHeader>
            <CardContent>
              {quote ? (
                <>
                  <QuoteSummary quote={quote} />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => downloadSnapshot(`${order.orderNumber}-quote-r${quote.revision}.json`, JSON.stringify({ ...quote, lines: parseLines(quote.linesJson) }, null, 2))}
                  >
                    <Download data-icon="inline-start" />
                    Download quote
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Phaeno has not issued pricing yet.</p>
              )}
              {order.documents.map((document) => (
                <div key={document.id} className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{document.kind} {document.documentNumber ?? ''}</span>
                    <OrderStatusBadge status={document.syncStatus} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Balance {formatMoney(document.balance, document.currency)}</p>
                  {document.documentUrl ? (
                    <a href={document.documentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">
                      Open in QuickBooks
                    </a>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          {(order.requestRevisions?.length ?? 0) > 0 ? <Card><CardHeader><CardTitle>Submitted request revisions</CardTitle><CardDescription>Each submission preserves the Job name, description, samples, analyses, and instructions that Phaeno reviewed.</CardDescription></CardHeader><CardContent className="divide-y">{order.requestRevisions?.map((revision) => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">Revision {revision.revision}</p><p className="text-xs text-muted-foreground">Submitted {formatDateTime(revision.submittedAt)}</p>{revision.correctionReason ? <p className="mt-1 text-sm">Correction: {revision.correctionReason}</p> : null}</div><Button type="button" variant="outline" onClick={() => downloadSnapshot(`${order.orderNumber}-request-r${revision.revision}.json`, revision.snapshotJson)}><Download data-icon="inline-start" />Download snapshot</Button></div>)}</CardContent></Card> : null}
        </TabsContent>

        <TabsContent value="timeline" className="mt-5">
          <Card><CardHeader><CardTitle>Timeline</CardTitle><CardDescription>Customer-safe milestones and reasons for this request.</CardDescription></CardHeader><CardContent><ol className="space-y-4">{order.timeline.map((item) => <li key={item.id} className="border-l-2 border-border pl-4"><p className="text-sm font-medium">{humanizeStatus(item.toStatus)}</p><p className="text-xs text-muted-foreground">{formatDateTime(item.occurredAt)}</p>{item.reason ? <p className="mt-1 text-sm">{item.reason}</p> : null}</li>)}</ol></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialog === 'accept'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>Accept quote for {order.orderNumber}?</DialogTitle><DialogDescription>This accepts the priced scope and opens sample-list entry. It does not authorize laboratory work; that occurs only after the exact sample list is finalized. The accepted snapshot remains in the Job history.</DialogDescription></DialogHeader>{quote ? <QuoteSummary quote={quote} /> : null}<DialogFooter><DialogClose asChild><Button type="button" variant="outline">Keep reviewing</Button></DialogClose><Button type="button" onClick={() => action.mutate('accept')} disabled={action.isPending}>{action.isPending ? 'Accepting…' : 'Accept price and open sample entry'}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={dialog === 'cancel' || dialog === 'withdraw'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>{dialog === 'withdraw' ? 'Withdraw' : 'Request cancellation for'} {order.orderNumber}</DialogTitle><DialogDescription>{dialog === 'withdraw' ? 'This closes the request before work is placed.' : 'Phaeno will review completed work and financial effects before deciding the request.'}</DialogDescription></DialogHeader><div><Label htmlFor="cancellationReason"><RequiredFieldName>Reason</RequiredFieldName></Label><textarea id="cancellationReason" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Keep order</Button></DialogClose><Button type="button" variant="destructive" disabled={!cancellationReason.trim() || action.isPending} onClick={() => action.mutate(dialog === 'withdraw' ? 'withdraw' : 'cancel')}>{action.isPending ? 'Updating…' : dialog === 'withdraw' ? 'Withdraw request' : 'Request cancellation'}</Button></RequiredDialogFooter></DialogContent></Dialog>
      <Dialog open={dialog === 'shipment'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>Record sample shipment</DialogTitle><DialogDescription>Add the carrier and tracking number after the sample leaves your organization.</DialogDescription></DialogHeader><div className="grid gap-4"><div><Label htmlFor="sampleCarrier">Carrier</Label><input id="sampleCarrier" value={carrier} onChange={(event) => setCarrier(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div><div><Label htmlFor="sampleTrackingNumber">Tracking number</Label><input id="sampleTrackingNumber" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div></div><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="button" disabled={action.isPending} onClick={() => action.mutate('shipment')}>{action.isPending ? 'Saving…' : 'Record shipment'}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(sampleToRemove)} onOpenChange={(open) => { if (!open && !removeSampleAction.isPending) setSampleToRemove(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {sampleToRemove?.customerSampleId}?</DialogTitle>
            <DialogDescription>
              This removes the sample from the draft Job. It can be entered
              again after the price is accepted.
            </DialogDescription>
          </DialogHeader>
          {removeSampleAction.error ? (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Sample was not removed</AlertTitle>
              <AlertDescription>{getOrderErrorMessage(removeSampleAction.error, 'Reload the job and try again.')}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={removeSampleAction.isPending}>Keep sample</Button></DialogClose>
            <Button type="button" variant="destructive" disabled={!sampleToRemove || removeSampleAction.isPending} onClick={() => sampleToRemove && removeSampleAction.mutate(sampleToRemove.id)}>
              {removeSampleAction.isPending ? 'Removing…' : 'Remove sample'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={submitOpen} onOpenChange={(open) => { setSubmitOpen(open); if (!open) { setProhibitedDataConfirmed(false); setSubmitConcurrencyMessage(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit {order.orderNumber} for pricing?</DialogTitle>
            <DialogDescription>
              Submission requests pricing; it does not authorize laboratory work. Sample entry opens after an issued quote is accepted, and work is authorized only after the exact sample list is finalized.
            </DialogDescription>
          </DialogHeader>
          {action.error && action.variables === 'submit' ? (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Request was not submitted</AlertTitle>
              <AlertDescription>{submitConcurrencyMessage ?? getOrderErrorMessage(action.error, 'Reload the job and try again.')}</AlertDescription>
            </Alert>
          ) : null}
          <label htmlFor="lab-prohibited-data-confirmation" className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
            <Checkbox
              id="lab-prohibited-data-confirmation"
              checked={prohibitedDataConfirmed}
              onCheckedChange={(checked) => setProhibitedDataConfirmed(checked === true)}
            />
            <span className="text-sm leading-5">
              I confirm that these Job pricing details contain no patient identifiers, PHI, or unnecessary personal data.
              {' '}<RequiredMark />
            </span>
          </label>
          <RequiredDialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Keep reviewing</Button></DialogClose>
            <Button type="button" disabled={!prohibitedDataConfirmed || action.isPending} onClick={() => action.mutate('submit')}>
              {action.isPending ? 'Submitting…' : 'Submit request for pricing'}
            </Button>
          </RequiredDialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sampleImportOpen} onOpenChange={(open) => { setSampleImportOpen(open); if (!open) { setSampleImportFile(null); setSampleImportPreview(null); importPreviewAction.reset(); importConfirmAction.reset() } }}>
        <DialogContent className="max-h-[90dvh] overflow-hidden p-0 [--dialog-inset:0px] sm:max-w-3xl">
          <DialogHeader className="pt-5 pr-12 pl-5"><DialogTitle>Upload sample list CSV</DialogTitle><DialogDescription>Use the Job template and keep identifiers formatted as text. The CSV cannot contain barcodes. Confirming a valid preview replaces the current editable sample list.</DialogDescription></DialogHeader>
          {importPreviewAction.error || importConfirmAction.error ? <DialogFeedback><Alert variant="destructive"><AlertTitle>Sample list was not imported</AlertTitle><AlertDescription>{getOrderErrorMessage(importPreviewAction.error ?? importConfirmAction.error, 'Review the file and try again.')}</AlertDescription></Alert></DialogFeedback> : null}
          <div className="max-h-[65dvh] space-y-4 overflow-y-auto px-5">
            <div><Label htmlFor="sample-list-csv"><RequiredFieldName>CSV file</RequiredFieldName></Label><Input id="sample-list-csv" className="mt-2" type="file" accept=".csv,text/csv" onChange={(event) => { setSampleImportFile(event.target.files?.[0] ?? null); setSampleImportPreview(null) }} /></div>
            {sampleImportPreview ? <section className="space-y-3 rounded-lg border p-4" aria-live="polite"><div><h3 className="font-medium">Preview</h3><p className="mt-1 text-sm text-muted-foreground">{sampleImportPreview.validRowCount} valid rows · {sampleImportPreview.blankRowCount} blank rows ignored</p></div><ul className="text-sm">{order.sourceGroups.map((group) => <li key={group.id}>{group.biologicalSource}: {sampleImportPreview.sourceCounts[group.biologicalSource] ?? 0} of {group.specimenCount}</li>)}</ul>{sampleImportPreview.errors.length ? <Alert variant="destructive"><AlertTitle>{sampleImportPreview.errors.length} issue{sampleImportPreview.errors.length === 1 ? '' : 's'} must be corrected</AlertTitle><AlertDescription><ul className="mt-2 list-disc space-y-1 pl-5">{sampleImportPreview.errors.map((error, index) => <li key={`${error.rowNumber}-${error.column}-${index}`}>{error.rowNumber > 0 ? `Row ${error.rowNumber}, ` : ''}{error.column}: {error.message}</li>)}</ul></AlertDescription></Alert> : <Alert><AlertTitle>Ready to replace the draft list</AlertTitle><AlertDescription>All sample and source counts match the accepted Job.</AlertDescription></Alert>}</section> : null}
          </div>
          <RequiredDialogFooter className="border-t bg-muted/40 px-5 py-4"><Button type="button" variant="outline" onClick={() => setSampleImportOpen(false)}>Cancel</Button><Button type="button" variant="secondary" disabled={!sampleImportFile || importPreviewAction.isPending} onClick={() => importPreviewAction.mutate()}>{importPreviewAction.isPending ? 'Validating…' : 'Preview CSV'}</Button><Button type="button" disabled={!sampleImportPreview || sampleImportPreview.errors.length > 0 || importConfirmAction.isPending} onClick={() => importConfirmAction.mutate()}>{importConfirmAction.isPending ? 'Replacing…' : 'Replace sample list'}</Button></RequiredDialogFooter>
        </DialogContent>
      </Dialog>

      <LabJobDetailsDialog
        open={jobDetailsOpen}
        order={order}
        onOpenChange={handleJobDetailsOpenChange}
        onSaved={() => {
          handleJobDetailsOpenChange(false)
        }}
      />
      <LabSampleDialog
        open={sampleDialog !== undefined}
        order={order}
        sample={sampleDialog}
        onOpenChange={(open) => { if (!open) setSampleDialog(undefined) }}
        onSaved={() => {
          setSampleDialog(undefined)
        }}
      />
    </main>
  )

  function handleJobDetailsOpenChange(open: boolean) {
    setJobDetailsOpen(open)
    onJobDetailsOpenChange?.(open)
  }
}

function QuoteSummary({ quote }: { quote: Quote }) {
  const lines = parseLines(quote.linesJson)
  return <div><div className="flex items-center justify-between gap-2"><span className="font-medium">Revision {quote.revision}</span><OrderStatusBadge status={quote.status} /></div><p className="mt-1 text-sm text-muted-foreground">Expires {formatDate(quote.expiresAt)}</p>{lines.length ? <ul className="mt-3 divide-y">{lines.map((line, index) => <li key={`${line.description}-${index}`} className="flex justify-between gap-3 py-2 text-sm"><span>{line.description} × {line.quantity}</span><span>{formatMoney(line.quantity * line.unitPrice, quote.currency)}</span></li>)}</ul> : null}<div className="mt-3 flex justify-between border-t pt-3 font-semibold"><span>Total</span><span>{formatMoney(quote.total, quote.currency)}</span></div></div>
}

function currentQuote(quotes: Quote[]) { return quotes.find((quote) => quote.status === 'Issued') ?? quotes[0] ?? null }
function parseLines(value: string): Array<{ description: string; quantity: number; unitPrice: number }> { try { return JSON.parse(value) as Array<{ description: string; quantity: number; unitPrice: number }> } catch { return [] } }
function formatMoney(value: number, currency: string) { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value) }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value)) }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatBytes(value: number) { return new Intl.NumberFormat('en-US', { style: 'unit', unit: value >= 1_000_000 ? 'megabyte' : 'kilobyte', maximumFractionDigits: 1 }).format(value >= 1_000_000 ? value / 1_000_000 : value / 1_000) }
function formatTubeQuantity(value: number) { return `${value} ${value === 1 ? 'tube' : 'tubes'}` }
function sampleName(samples: Array<{ id: string; customerSampleId: string }>, sampleId: string) { return samples.find((sample) => sample.id === sampleId)?.customerSampleId ?? 'Sample' }
function downloadSnapshot(fileName: string, value: string) { const url = URL.createObjectURL(new Blob([value], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = fileName; link.click(); URL.revokeObjectURL(url) }
function prettyJson(value: string) { try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value } }
type LabResultDownloadRequest =
  | { kind: 'file'; file: OperationalFile }
  | { kind: 'package'; releaseId: string; releaseVersion: number }
function fileDownloadStatus(file: OperationalFile) {
  if (file.download?.isDownloaded) return `Downloaded${file.download.downloadedAtUtc ? ` ${formatDateTime(file.download.downloadedAtUtc)}` : ''}`
  if ((file.download?.activeAttemptCount ?? 0) > 0) return 'Download in progress; it counts only after completion.'
  return 'Not downloaded'
}
