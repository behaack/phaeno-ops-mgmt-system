import { DetailField, DetailSummary, DetailHeading } from '#/components/ui/detail-summary'
import { formatDisplayCurrency, formatDisplayDate, formatDisplayTimestamp } from '#/lib/display-format'
import { Field as PortalField } from '#/components/ui/field'
import { RecordLink } from '#/components/ui/record-link'
import { PageTitle } from '#/components/ui/page-header'
import { BackLink } from '#/components/ui/back-link'
import { KitLotSubmissionSummary, KitLotAssessmentView } from './KitLotSubmission'
import type { KitLotAssessment } from '#/api/pseq-kit-lots'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, FileArchive } from 'lucide-react'
import { useState } from 'react'

import { acceptAssemblyQuote, downloadAssemblyOutput, downloadAssemblyOutputPackage, getAssemblyRequest, getOrderErrorMessage, requestAssemblyCancellation, submitAssemblyRequest, type OperationalFile, type Quote, withdrawAssemblyRequest } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { humanizeStatus, OrderStatusBadge } from './OrderStatusBadge'
import { ReleasedDeliverableRetentionNotice } from './ReleasedDeliverableRetentionNotice'
import { useOrderDraftGuard } from './use-order-draft-guard'

export function DataAssemblyDetailPage({ requestId }: { requestId: string }) {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<'accept' | 'cancel' | 'withdraw' | null>(null)
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('')
  const [reason, setReason] = useState('')
  const apiEnabled = Boolean(session?.capabilities.canViewDataAssemblyRequests) && authProvider !== 'mock'
  const requestQuery = useQuery({ queryKey: ['data-assembly-request', requestId], queryFn: () => getAssemblyRequest(requestId), enabled: apiEnabled })
  const action = useMutation({
    mutationFn: async (kind: 'submit' | 'accept' | 'cancel' | 'withdraw') => {
      const request = requestQuery.data
      if (!request) throw new Error('The request has not loaded.')
      if (kind === 'submit') return submitAssemblyRequest(request.id, request.version, request.inputFiles, request.kitLotSubmission?.currentAssessment.lotVersion)
      if (kind === 'cancel') return requestAssemblyCancellation(request.id, request.version, reason)
      if (kind === 'withdraw') return withdrawAssemblyRequest(request.id, request.version, reason)
      const quote = currentQuote(request.quotes)
      if (!quote) throw new Error('No current quote is available.')
      return acceptAssemblyQuote(request.id, quote.id, request.version, purchaseOrderNumber)
    },
    onError: async () => { await queryClient.invalidateQueries({ queryKey: ['data-assembly-request', requestId] }) },
    onSuccess: async () => { setDialog(null); setReason(''); setPurchaseOrderNumber(''); await Promise.all([queryClient.invalidateQueries({ queryKey: ['data-assembly-request', requestId] }), queryClient.invalidateQueries({ queryKey: ['data-assembly-requests'] })]) },
  })
  const downloadAction = useMutation({
    mutationFn: async (download: AssemblyDownloadRequest) => download.kind === 'package'
      ? downloadAssemblyOutputPackage(requestId, download.releaseId, download.releaseVersion)
      : downloadAssemblyOutput(requestId, download.releaseId, download.file),
    onSettled: async () => queryClient.invalidateQueries({ queryKey: ['data-assembly-request', requestId] }),
  })

  const dialogDirty = dialog === 'accept' ? purchaseOrderNumber !== '' : dialog !== null && reason !== ''
  useOrderDraftGuard(dialogDirty, dialog !== null && action.isPending)
  function openDecision(next: 'accept' | 'cancel' | 'withdraw') {
    if (action.isPending) return
    action.reset(); setReason(''); setPurchaseOrderNumber(''); setDialog(next)
  }
  async function closeDecision() {
    if (!action.isPending && (!dialogDirty || (await confirmPortal('Discard unsaved request changes?')))) setDialog(null)
  }

  if (!apiEnabled) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle><CustomerSourceText source={"Connected request detail is unavailable"} /></AlertTitle><AlertDescription><CustomerSourceText source={"Use a signed-in Partner session to review this assembly request."} /></AlertDescription></Alert></main>
  if (requestQuery.isLoading) return <main className="page-wrap px-4 py-8"><p role="status"><CustomerSourceText source={"Loading assembly request…"} /></p></main>
  if (requestQuery.error || !requestQuery.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Assembly request could not be loaded"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(requestQuery.error, 'Return to Data assembly and try again.')} />}</AlertDescription></Alert></main>
  const request = requestQuery.data
  const quote = currentQuote(request.quotes)

  return <main className="page-wrap px-4 py-8">
    <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm text-muted-foreground"><BackLink asChild><Link to="/data-assembly" search={previous => previous}><CustomerSourceText source={"Assembly cases"} /></Link></BackLink> / <span className="font-mono">{request.requestNumber}</span></p><div className="mt-2 flex flex-wrap items-center gap-3"><PageTitle>{request.projectReference}</PageTitle><OrderStatusBadge status={request.status} /></div><p className="mt-2 text-sm text-muted-foreground">{request.requestNumber} · {request.profileName} v{request.assemblyProfileVersion}</p></div><ActionMenu keepSingleActionInMenu={request.canRequestCancellation && !request.canEdit && !request.canSubmit && !(request.canAcceptQuote && !request.isIncludedAssembly) && !request.canWithdraw}><DropdownMenuTrigger asChild><Button type="button" variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end">{request.canEdit ? <DropdownMenuItem asChild><Link to="/data-assembly/$requestId/edit" params={{ requestId: request.id }} search={previous => previous}><CustomerSourceText source={"Edit request"} /></Link></DropdownMenuItem> : null}{request.canSubmit ? <DropdownMenuItem onSelect={() => action.mutate('submit')} disabled={action.isPending}><CustomerSourceText source={"Submit for intake"} /></DropdownMenuItem> : null}{request.canAcceptQuote && !request.isIncludedAssembly ? <DropdownMenuItem onSelect={() => openDecision('accept')}><CustomerSourceText source={"Accept quote"} /></DropdownMenuItem> : null}{request.canWithdraw ? <DropdownMenuItem onSelect={() => openDecision('withdraw')}><CustomerSourceText source={"Withdraw"} /></DropdownMenuItem> : null}{request.canRequestCancellation ? <DropdownMenuItem variant="destructive" onSelect={() => openDecision('cancel')}><CustomerSourceText source={"Request cancellation"} /></DropdownMenuItem> : null}</DropdownMenuContent></ActionMenu></section>
    {request.isIncludedAssembly && request.kitOrderId ? <Alert className="mb-5"><AlertTitle><CustomerSourceText source={"Included assembly ·"} /> {request.kitCaseNumber}</AlertTitle><AlertDescription><CustomerSourceText source={"This case is included in"} /> <RecordLink asChild><Link to="/reagent-orders/$orderId" params={{ orderId: request.kitOrderId }}>{request.kitOrderNumber}</Link></RecordLink><CustomerSourceText source={". Input corrections remain with this case; no second quote or sale is created."} /></AlertDescription></Alert> : null}
    {request.tenantSafeReason ? <Alert className="mb-5"><AlertTitle><CustomerSourceText source={"Action needed"} /></AlertTitle><AlertDescription>{request.tenantSafeReason}</AlertDescription></Alert> : null}
    {action.error && !dialog ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerSourceText source={"Request was not updated"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(action.error, 'Reload and try again.')} />}</AlertDescription></Alert> : null}
    {downloadAction.error ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerSourceText source={"Download did not complete"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(downloadAction.error, 'The incomplete transfer was not counted. Try again while downloads remain open.')} />}</AlertDescription></Alert> : null}
    {request.isIncludedAssembly ? <Card className="mb-5"><CardHeader><CardTitle>Kit lot</CardTitle><CardDescription>Current recall and expiration information for the submitted kit.</CardDescription></CardHeader><CardContent><KitLotSubmissionSummary submission={request.kitLotSubmission} /></CardContent></Card> : null}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]"><div className="space-y-5">
      <Card><CardHeader><CardTitle><DetailHeading><CustomerSourceText source={"Input revisions"} /></DetailHeading></CardTitle><CardDescription><CustomerSourceText source={"The submitted profile, metadata, files, validation, and manifest remain traceable."} /></CardDescription></CardHeader><CardContent><DetailSummary><DetailField label={<><CustomerSourceText source={"CURRENT REVISION"} /></>} value={<>{request.inputRevision || 'Draft'}</>} /><DetailField label={<><CustomerSourceText source={"REQUESTED OUTPUT"} /></>} value={<>{request.requestedOutput}</>} /><div className="sm:col-span-2"><DetailField label={<><CustomerSourceText source={"PROJECT METADATA"} /></>} value={<>{metadataText(request.metadataJson)}</>} /></div></DetailSummary>{request.inputRevisions.length ? <div className="mt-5 divide-y">{request.inputRevisions.map((revision) => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium"><CustomerSourceText source={"Revision"} /> {revision.revision}</p><p className="text-xs text-muted-foreground"><CustomerSourceText source={"Submitted"} /> {formatDateTime(revision.submittedAt)}</p>{revision.kitLotAssessmentJson ? <details className="mt-2 text-sm"><summary className="cursor-pointer">Lot assessment at submission</summary><KitLotAssessmentView assessment={JSON.parse(revision.kitLotAssessmentJson) as KitLotAssessment} usedOn={revision.kitUsedOn} /></details> : null}{revision.correctionReason ? <p className="mt-1 text-sm"><CustomerSourceText source={"Correction:"} /> {revision.correctionReason}</p> : null}</div><Button type="button" variant="outline" size="sm" onClick={() => downloadJson(`${request.requestNumber}-input-r${revision.revision}.json`, JSON.stringify({ manifest: JSON.parse(revision.manifestJson), validation: JSON.parse(revision.validationSummaryJson), kitLot: revision.kitLotAssessmentJson ? JSON.parse(revision.kitLotAssessmentJson) : null, kitUsedOn: revision.kitUsedOn }, null, 2))}><Download data-icon="inline-start" /><CustomerSourceText source={"Input receipt"} /></Button></div>)}</div> : null}<ul className="mt-5 divide-y">{request.inputFiles.map((file) => <li key={file.id} className="flex justify-between gap-3 py-3 text-sm"><span>{file.fileName}</span><span className="text-muted-foreground"><CustomerSourceText source={"Scan:"} /> {humanizeStatus(file.scanStatus)}</span></li>)}</ul></CardContent></Card>
      <Card>
        <CardHeader>
          <CardTitle><DetailHeading><CustomerSourceText source={"Output releases"} /></DetailHeading></CardTitle>
          <CardDescription>{request.isIncludedAssembly ? <CustomerSourceText source={"Released results belong to this kit case. Review and the applicable Partner credit or payment rules still apply; assembly creates no second billing source."} /> : <CustomerSourceText source={"This historical request retains its original review, accounting-source and credit or payment rules."} />}</CardDescription>
        </CardHeader>
        <CardContent>
          {request.outputReleases.some((release) => release.releaseStatus === 'Released') ? (
            <div className="space-y-5">
              {request.outputReleases
                .filter((release) => release.releaseStatus === 'Released')
                .map((release) => (
                  <section key={release.id} aria-labelledby={`assembly-release-${release.id}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p id={`assembly-release-${release.id}`} className="font-medium"><CustomerSourceText source={"Release"} /> {release.releaseVersion}</p>
                        <p className="text-xs text-muted-foreground"><CustomerSourceText source={"Pipeline"} /> {release.pipelineVersion} <CustomerSourceText source={"· Generated"} /> {formatDateTime(release.generatedAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusBadge status={release.releaseStatus} />
                        <Button type="button" size="sm" variant="outline" disabled={downloadAction.isPending || Boolean(release.retention?.isQuarantined || release.retention?.downloadAccessClosedAtUtc || release.retention?.byteDeletedAtUtc) || !release.files.length || release.files.some((file) => file.releaseStatus !== 'Released' || file.scanStatus !== 'Clean')} onClick={() => downloadAction.mutate({ kind: 'package', releaseId: release.id, releaseVersion: release.releaseVersion })}><FileArchive data-icon="inline-start" />{downloadAction.isPending && downloadAction.variables?.kind === 'package' && downloadAction.variables.releaseId === release.id ? <CustomerSourceText source={"Downloading…"} /> : <CustomerSourceText source={"Download package"} />}</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => downloadJson(`${request.requestNumber}-output-r${release.releaseVersion}.json`, release.manifestJson)}><Download data-icon="inline-start" /><CustomerSourceText source={"Manifest"} /></Button>
                      </div>
                    </div>
                    <ReleasedDeliverableRetentionNotice retention={release.retention} />
                    <ul className="mt-3 divide-y">
                      {release.files.map((file) => (
                        <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                          <div>
                            <p className="text-sm">{file.fileName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{fileDownloadStatus(file)}</p>
                          </div>
                          <Button type="button" variant="outline" disabled={downloadAction.isPending || Boolean(release.retention?.isQuarantined || release.retention?.downloadAccessClosedAtUtc || release.retention?.byteDeletedAtUtc) || file.releaseStatus !== 'Released' || file.scanStatus !== 'Clean'} onClick={() => downloadAction.mutate({ kind: 'file', releaseId: release.id, file })}><Download data-icon="inline-start" />{downloadAction.isPending && downloadAction.variables?.kind === 'file' && downloadAction.variables.file.id === file.id ? <CustomerSourceText source={"Downloading…"} /> : <CustomerSourceText source={"Download"} />}</Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <FileArchive aria-hidden="true" className="mb-2 size-7 text-muted-foreground" />
              <p className="font-medium"><CustomerSourceText source={"No downloadable outputs"} /></p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground"><CustomerSourceText source={"Outputs may still be processing, under review, waiting for an accounting source record, or awaiting payment."} /></p>
            </div>
          )}
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle><DetailHeading><CustomerSourceText source={"Timeline"} /></DetailHeading></CardTitle></CardHeader><CardContent><ol className="space-y-4">{request.timeline.map((item) => <li key={item.id} className="border-l-2 pl-4"><p className="text-sm font-medium">{humanizeStatus(item.toStatus)}</p><p className="text-xs text-muted-foreground">{formatDateTime(item.occurredAt)}</p>{item.reason ? <p className="mt-1 text-sm">{item.reason}</p> : null}</li>)}</ol></CardContent></Card>
    </div><div className="space-y-5">{request.isIncludedAssembly ? <Card><CardHeader><CardTitle><DetailHeading><CustomerSourceText source={"Kit bundle purchase"} /></DetailHeading></CardTitle></CardHeader><CardContent><p className="text-sm"><CustomerSourceText source={"The kit order owns pricing, shipment billing and the included assembly entitlement."} /></p>{request.kitOrderId ? <Button variant="outline" className="mt-3" asChild><Link to="/reagent-orders/$orderId" params={{ orderId: request.kitOrderId }}><CustomerSourceText source={"View Kit order"} /></Link></Button> : null}</CardContent></Card> : <><Card><CardHeader><CardTitle><DetailHeading><CustomerSourceText source={"Quote and PO"} /></DetailHeading></CardTitle><CardDescription><CustomerSourceText source={"Assembly pricing is per job and immutable by revision."} /></CardDescription></CardHeader><CardContent>{quote ? <QuoteSummary quote={quote} /> : <p className="text-sm text-muted-foreground"><CustomerSourceText source={"Pricing has not been issued."} /></p>}{request.purchaseOrderNumber ? <p className="mt-4 border-t pt-4 text-sm">PO <span className="font-mono">{request.purchaseOrderNumber}</span></p> : null}</CardContent></Card><Card><CardHeader><CardTitle><DetailHeading><CustomerSourceText source={"Commercial gate"} /></DetailHeading></CardTitle></CardHeader><CardContent>{request.documents.length ? request.documents.map((document) => <div key={document.id} className="border-b py-3 first:pt-0 last:border-0"><div className="flex justify-between gap-2"><span className="text-sm font-medium">{document.kind} {document.documentNumber ?? ''}</span><OrderStatusBadge status={document.syncStatus === 'Succeeded' ? 'Recorded' : document.syncStatus} /></div><p className="mt-1 text-sm text-muted-foreground"><CustomerSourceText source={"Balance"} /> {formatMoney(document.balance, document.currency)}</p></div>) : <p className="text-sm text-muted-foreground"><CustomerSourceText source={"No commercial documents yet."} /></p>}</CardContent></Card></>}</div></div>
    <Dialog open={dialog === 'accept'} onOpenChange={(open) => { if (!open) closeDecision() }}><DialogContent showCloseButton={!action.isPending} aria-busy={action.isPending}><DialogHeader><DialogTitle><CustomerSourceText source={"Accept assembly quote?"} /></DialogTitle><DialogDescription><CustomerSourceText source={"This freezes the validated input/profile/commercial snapshot and places"} /> {request.requestNumber} <CustomerSourceText source={"in the processing queue."} /></DialogDescription></DialogHeader>{action.error ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(action.error, 'Review the details and try again.')} />}</AlertDescription></Alert> : null}{quote ? <QuoteSummary quote={quote} /> : null}<PortalField><Label htmlFor="assemblyPo"><RequiredFieldName><CustomerSourceText source={"Purchase order number"} /></RequiredFieldName></Label><Input disabled={action.isPending} id="assemblyPo" value={purchaseOrderNumber} onChange={(event) => setPurchaseOrderNumber(event.target.value)}  /></PortalField><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={action.isPending}><CustomerSourceText source={"Keep reviewing"} /></Button></DialogClose><Button type="button" disabled={!purchaseOrderNumber.trim() || action.isPending} onClick={() => action.mutate('accept')}><CustomerSourceText source={"Accept quote and queue work"} /></Button></RequiredDialogFooter></DialogContent></Dialog>
    <Dialog open={dialog === 'cancel' || dialog === 'withdraw'} onOpenChange={(open) => { if (!open) closeDecision() }}><DialogContent showCloseButton={!action.isPending} aria-busy={action.isPending}><DialogHeader><DialogTitle>{dialog === 'withdraw' ? <CustomerSourceText source={"Withdraw request?"} /> : <CustomerSourceText source={"Request cancellation?"} />}</DialogTitle><DialogDescription>{dialog === 'withdraw' ? <CustomerSourceText source={"This closes the request before processing is placed."} /> : <CustomerSourceText source={"Phaeno will preserve completed processing and financial history while deciding the remaining scope."} />}</DialogDescription></DialogHeader>{action.error ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(action.error, 'Review the details and try again.')} />}</AlertDescription></Alert> : null}<div><Label htmlFor="assemblyCancellationReason"><RequiredFieldName><CustomerSourceText source={"Reason"} /></RequiredFieldName></Label><textarea disabled={action.isPending} id="assemblyCancellationReason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={action.isPending}><CustomerSourceText source={"Keep request"} /></Button></DialogClose><Button type="button" variant="destructive" disabled={!reason.trim() || action.isPending} onClick={() => action.mutate(dialog === 'withdraw' ? 'withdraw' : 'cancel')}>{dialog === 'withdraw' ? <CustomerSourceText source={"Withdraw request"} /> : <CustomerSourceText source={"Request cancellation"} />}</Button></RequiredDialogFooter></DialogContent></Dialog>
  </main>
}

function QuoteSummary({ quote }: { quote: Quote }) { return <div><div className="flex justify-between gap-2"><span className="font-medium"><CustomerSourceText source={"Revision"} /> {quote.revision}</span><OrderStatusBadge status={quote.status} /></div><p className="mt-1 text-sm text-muted-foreground"><CustomerSourceText source={"Expires"} /> {formatDate(quote.expiresAt)}</p><div className="mt-3 flex justify-between border-t pt-3 font-semibold"><span><CustomerSourceText source={"Total"} /></span><span>{formatMoney(quote.total, quote.currency)}</span></div></div> }
function currentQuote(quotes: Quote[]) { return quotes.find((quote) => quote.status === 'Issued') ?? quotes[0] ?? null }
function metadataText(value: string) { try { const parsed = JSON.parse(value) as { projectMetadata?: string }; return parsed.projectMetadata ?? value } catch { return value } }
function formatMoney(value: number, currency: string) { return formatDisplayCurrency(value, currency) }
function formatDate(value: string) { return formatDisplayDate(value) }
function formatDateTime(value: string) { return formatDisplayTimestamp(value) }
function downloadJson(fileName: string, value: string) { const url = URL.createObjectURL(new Blob([value], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = fileName; link.click(); URL.revokeObjectURL(url) }
type AssemblyDownloadRequest =
  | { kind: 'file'; releaseId: string; file: OperationalFile }
  | { kind: 'package'; releaseId: string; releaseVersion: number }
function fileDownloadStatus(file: OperationalFile) {
  if (file.download?.isDownloaded) return `Downloaded${file.download.downloadedAtUtc ? ` ${formatDateTime(file.download.downloadedAtUtc)}` : ''}`
  if ((file.download?.activeAttemptCount ?? 0) > 0) return 'Download in progress; it counts only after completion.'
  return 'Not downloaded'
}
