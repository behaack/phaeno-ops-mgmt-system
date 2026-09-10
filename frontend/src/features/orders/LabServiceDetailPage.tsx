import { LabCustomerProgressPanel } from './LabCustomerProgressPanel'
import { customerLabStatus } from './lab-customer-progress'
import { LabJobWorkspaceActions } from './LabJobWorkspaceActions'
import { LabOrderScope } from './LabOrderScope'
import { labJobVisibility } from './lab-job-visibility'
import { LabJobShippingWorkspace } from './LabJobShippingWorkspace'
import { LabJobAfterSend } from './LabJobAfterSend'
import { LabJobOrderProgress } from './LabJobOrderProgress'
import type { ChangeLabJobWorkspace, LabJobWorkspaceSearch } from './lab-job-workspace-search'
import type { ShipmentKitSupply } from '#/api/transportation-kit-requests'
import type { ShipmentHeaderAction } from '#/features/sample-shipping/SampleShippingDetailPage'
import { useSourceSampleShipments } from '#/features/sample-shipping/use-source-sample-shipments'
import { LabManagedResultReleases } from './LabManagedResultReleases'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Download, FileCheck2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { acceptLabQuote, downloadLabQuotePdf, getLabOrder, getOrderErrorMessage, requestLabCancellation, submitLabOrder, type Quote, withdrawLabOrder } from '#/api/order-management'
import { downloadCustomerInvoicePdf, downloadCustomerResultArtifact, listCustomerInvoices, listCustomerResultPackages, type CustomerResultPackage, type InvoiceReceivable } from '#/api/pseq-order-to-cash'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { GovernedResultPackagePanel } from './GovernedResultPackagePanel'
import { humanizeStatus, OrderStatusBadge } from './OrderStatusBadge'
import { useOrderDraftGuard } from './use-order-draft-guard'
import { StandardLabServicePanel } from './StandardLabServicePanel'
import { LabServiceTimingPanel } from './LabServiceTimingPanel'
import { LabQuoteExtensionDialog } from './LabQuoteExtensionDialog'
import { LabQuoteDeclineDialog } from './LabQuoteDeclineDialog'
import { currentLabQuote, quoteStatusAt, useQuoteStatus } from './use-quote-status'

export function LabServiceDetailPage({ orderId, workspace: controlledWorkspace, onWorkspaceChange }: { orderId: string; workspace?: LabJobWorkspaceSearch; onWorkspaceChange?: ChangeLabJobWorkspace }) {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const shipping = useSourceSampleShipments(orderId)
  const [localWorkspace, setLocalWorkspace] = useState<LabJobWorkspaceSearch>({})
  const workspace = controlledWorkspace ?? localWorkspace
  const orderActionRef = useRef<HTMLButtonElement>(null)
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null)
  const [sendActionTarget, setSendActionTarget] = useState<HTMLDivElement | null>(null)
  const [shippingActive, setShippingActive] = useState(false)
  const [navigationLocked, setNavigationLocked] = useState(false)
  const [kitSupply, setKitSupply] = useState<ShipmentKitSupply | undefined>(undefined)
  useBlocker({ shouldBlockFn: () => navigationLocked, enableBeforeUnload: navigationLocked, disabled: !navigationLocked })
  const changeWorkspace: ChangeLabJobWorkspace = (patch, options) => {
    if (onWorkspaceChange) return onWorkspaceChange(patch, options)
    if (!shippingActive) setLocalWorkspace(previous => ({ ...previous, ...patch }))
    return Promise.resolve()
  }
  const [dialog, setDialog] = useState<'accept' | 'cancel' | 'withdraw' | 'decline' | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('')
  const [extensionQuote, setExtensionQuote] = useState<Quote | null>(null)
  const [decisionQuote, setDecisionQuote] = useState<Quote | null>(null)
  const apiEnabled = Boolean(session?.capabilities.canViewLabServiceOrders) && authProvider !== 'mock'
  const canViewInvoices = session?.capabilities.canViewLabServiceInvoices === true
  const orderQuery = useQuery({ queryKey: ['lab-service-order', orderId], queryFn: () => getLabOrder(orderId), enabled: apiEnabled })
  const quote = orderQuery.data ? currentLabQuote(orderQuery.data.quotes) : null
  const quoteStatus = useQuoteStatus(quote)
  const deadlinePassed = quote?.status === 'Issued' && quoteStatus === 'Expired'
  useEffect(() => {
    if (deadlinePassed) void queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] })
  }, [deadlinePassed, orderId, queryClient])
  const invoicesQuery = useQuery({ queryKey: ['customer-invoices', session?.selectedOrganization?.organizationId, session?.selectedDepartment?.departmentId], queryFn: listCustomerInvoices, enabled: apiEnabled && canViewInvoices })
  const resultPackagesQuery = useQuery({ queryKey: ['customer-result-packages', orderId], queryFn: () => listCustomerResultPackages(orderId), enabled: apiEnabled })
  const invoiceDownload = useMutation({ mutationFn: (invoice: InvoiceReceivable) => downloadCustomerInvoicePdf(invoice) })
  const quoteDownload = useMutation({ mutationFn: ({ orderNumber, quote }: { orderNumber: string; quote: Quote }) => downloadLabQuotePdf(orderId, orderNumber, quote) })
  const resultDownload = useMutation({ mutationFn: ({ resultPackage, artifact }: { resultPackage: CustomerResultPackage; artifact: CustomerResultPackage['artifacts'][number] }) => downloadCustomerResultArtifact(orderId, resultPackage, artifact), onSettled: () => queryClient.invalidateQueries({ queryKey: ['customer-result-packages', orderId] }) })
  const action = useMutation({
    mutationFn: async (kind: 'submit' | 'accept' | 'cancel' | 'withdraw' | { kind: 'decline'; reason: string }) => {
      const order = orderQuery.data
      if (!order) throw new Error('The order has not loaded.')
      if (typeof kind === 'object') return withdrawLabOrder(order.id, order.version, kind.reason)
      if (kind === 'submit') return submitLabOrder(order.id, order.version)
      if (kind === 'accept') {
        const current = currentLabQuote(order.quotes)
        if (!current || current.id !== decisionQuote?.id) throw new Error('The quote changed. Close this dialog and review the current quote.')
        if (quoteStatusAt(current, Date.now()) === 'Expired') throw new Error('This quote has expired and cannot be accepted. Request an extension to continue.')
        if (!order.canAcceptQuote) throw new Error(order.quoteAcceptanceBlockedReason || 'This quote is not available for acceptance.')
        return acceptLabQuote(order.id, current.id, order.version, purchaseOrderNumber)
      }
      if (kind === 'withdraw') return withdrawLabOrder(order.id, order.version, cancellationReason)
      return requestLabCancellation(order.id, order.version, cancellationReason)
    },
    onSuccess: async () => {
      setDialog(null); setCancellationReason(''); setPurchaseOrderNumber('')
      await queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] })
      await queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] })
    },
  })

  const dialogDirty = dialog === 'accept' ? purchaseOrderNumber !== '' : dialog !== null && cancellationReason !== ''
  useOrderDraftGuard(dialogDirty, dialog !== null && action.isPending)
  function openDecision(next: 'accept' | 'cancel' | 'withdraw' | 'decline') {
    if (action.isPending) return
    action.reset(); setCancellationReason(''); setPurchaseOrderNumber(''); setDecisionQuote(next === 'accept' ? quote : null); setDialog(next)
  }
  function closeDecision() {
    if (!action.isPending && (!dialogDirty || window.confirm('Discard unsaved order changes?'))) setDialog(null)
  }

  if (!apiEnabled) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle>Connected order detail is unavailable</AlertTitle><AlertDescription>Use a signed-in Customer or Partner session to review this laboratory request.</AlertDescription></Alert></main>
  if (orderQuery.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading laboratory order…</p></main>
  if (orderQuery.error || !orderQuery.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Laboratory order could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(orderQuery.error, 'Return to Lab services and try again.')}</AlertDescription></Alert></main>

  const order = orderQuery.data
  const canManageQuotes = order.canManageQuotes ?? (order.canAcceptQuote || session?.capabilities.canAcceptLabServiceQuotes === true)
  const awaitingQuoteAcceptance = !order.standardCommercialSnapshot && (quoteStatus === 'Issued' || quoteStatus === 'Expired')
  const extensionPending = quote?.extensionRequest?.status === 'Pending'
  const acceptanceBlocked = quoteStatus === 'Expired' || !order.canAcceptQuote
  const acceptanceExplanation = quoteStatus === 'Expired'
    ? 'This quote has expired and cannot be accepted. Phaeno must issue a new revision before you can continue.'
    : order.quoteAcceptanceBlockedReason || 'This quote is not currently available for acceptance. Contact Phaeno for help.'
  const requiresPurchaseOrder = session?.selectedDepartment?.purchaseOrderRequired === true
  const invoices = canViewInvoices ? invoicesQuery.data?.filter((invoice) => invoice.labServiceOrderId === order.id) ?? [] : []
  const resultPackages = resultPackagesQuery.data ?? []
  const visibility = labJobVisibility(order, shipping.related, resultPackages.length > 0)
  const detailsCollapsible = visibility.confirmed && !awaitingQuoteAcceptance
  const CommercialSection = detailsCollapsible ? 'details' : 'section'
  const orderActions: ShipmentHeaderAction[] = []
  if (order.canEdit) orderActions.push({ kind: 'command', label: 'Edit request', disabled: shippingActive || action.isPending, onSelect: () => { void navigate({ to: '/lab-services/$orderId/edit', params: { orderId: order.id }, search: previous => previous }) } })
  if (order.canSubmit) orderActions.push({ kind: 'command', label: 'Submit for pricing', disabled: shippingActive || action.isPending, onSelect: () => action.mutate('submit') })
  if (quote && !order.standardCommercialSnapshot) orderActions.push({ kind: 'command', label: 'Download quote PDF', disabled: quoteDownload.isPending || shippingActive, busy: quoteDownload.isPending, onSelect: () => quoteDownload.mutate({ orderNumber: order.orderNumber, quote }) })
  if (awaitingQuoteAcceptance && !extensionPending && order.canRequestQuoteExtension && quoteStatus === 'Expired' && quote) orderActions.push({ kind: 'command', label: 'Request quote extension', disabled: shippingActive || action.isPending, onSelect: () => setExtensionQuote(quote) })
  if (order.canWithdraw && !awaitingQuoteAcceptance) orderActions.push({ kind: 'command', label: 'Withdraw request', disabled: shippingActive || action.isPending, onSelect: () => openDecision('withdraw') })
  if (order.canRequestCancellation) orderActions.push({ kind: 'command', label: 'Request cancellation', disabled: shippingActive || action.isPending, onSelect: () => openDecision('cancel') })
  const openStep = (step: string) => {
    const targetId = step === 'confirm-order' ? 'job-commercial' : 'samples-and-shipping'
    const showTarget = () => { const target = document.getElementById(targetId); target?.scrollIntoView({ block: 'start' }); target?.focus({ preventScroll: true }) }
    if (step === 'confirm-order') showTarget()
    else void changeWorkspace({ shippingView: step === 'samples' ? undefined : 'tubes', orderKits: undefined }).then(() => window.requestAnimationFrame(showTarget))
  }
  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><Link to="/lab-services" search={previous => previous} className="inline-flex min-h-6 cursor-pointer items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-4" aria-hidden="true" />Back to lab services</Link><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold">{order.orderNumber}</h1><OrderStatusBadge status={order.status === 'QuoteIssued' && quoteStatus === 'Expired' ? 'QuoteExpired' : customerLabStatus(order.status, order.laboratoryProgress)} /></div><p className="mt-2 text-sm text-muted-foreground">{order.customerReference || 'No Customer reference'} · Updated {formatDate(order.updatedAt)}</p></div>
        <div ref={setHeaderTarget} className="shrink-0">{!visibility.samplesRelevant ? <LabJobWorkspaceActions orderActions={orderActions} triggerRef={orderActionRef} dialogOpen={Boolean(dialog) || Boolean(extensionQuote)} /> : null}</div>
      </section>
      {order.tenantSafeReason ? <Alert className="mb-5"><AlertTitle>Action needed</AlertTitle><AlertDescription>{order.tenantSafeReason}</AlertDescription></Alert> : null}
      {order.labCustomerActionSummary ? <Alert className="mb-5"><AlertTitle>Laboratory action needed</AlertTitle><AlertDescription>{order.labCustomerActionSummary}</AlertDescription></Alert> : null}
      {action.error && !dialog ? <Alert variant="destructive" className="mb-5"><AlertTitle>Order was not updated</AlertTitle><AlertDescription>{getOrderErrorMessage(action.error, 'Reload and try again.')}</AlertDescription></Alert> : null}
      {quoteDownload.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Quote could not be downloaded</AlertTitle><AlertDescription>{getOrderErrorMessage(quoteDownload.error, 'Try Download quote PDF again. If the problem continues, contact Phaeno.')}</AlertDescription></Alert> : null}
      <section id="ordering-and-shipping" className="space-y-5">
        <LabJobOrderProgress order={order} shipments={shipping.related} shippingState={shipping.receiptState} kitSupply={kitSupply} canManageShipping={session?.capabilities.canManageSampleShipping === true} canAcceptOrder={Boolean(canManageQuotes || order.canPlaceStandardOrder)} onStepSelect={openStep} sendActionTargetRef={setSendActionTarget} />
        <section id="job-commercial" tabIndex={-1} className="space-y-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <StandardLabServicePanel order={order} />
          <CommercialSection key={visibility.confirmed ? 'confirmed' : 'unconfirmed'} aria-labelledby="order-details-heading" className="rounded-lg border bg-card p-4">
            {detailsCollapsible ? <summary id="order-details-heading" className="cursor-pointer font-semibold">Order details and billing</summary> : <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="order-details-heading" className="font-semibold">Order details and billing</h2>
              {awaitingQuoteAcceptance && (canManageQuotes || order.canWithdraw) ? <div role="group" aria-label="Quote actions" className="flex flex-wrap gap-2">
                {canManageQuotes ? <Button disabled={acceptanceBlocked || shippingActive || action.isPending} aria-describedby={acceptanceBlocked ? 'quote-acceptance-help' : undefined} onClick={() => openDecision('accept')}>Accept quote</Button> : null}
                {order.canWithdraw ? <Button variant="outline" disabled={shippingActive || action.isPending} onClick={() => openDecision('decline')}>Decline quote</Button> : null}
              </div> : null}
            </div>}
            <div className={`mt-4 grid gap-5${visibility.samplesRelevant ? ' lg:grid-cols-2' : ''}`}>
          <Card><CardHeader><CardTitle>{order.standardCommercialSnapshot ? "Billing" : "Quote and billing"}</CardTitle><CardDescription>{order.standardCommercialSnapshot ? "The accepted standard bundle is recorded above. Issued invoices and audited adjustments remain with this Job." : "Proposed pricing is not a quote. Issued and accepted POMS pricing remains immutable; corrections appear as audited revisions or adjustments."}</CardDescription></CardHeader><CardContent><LabOrderScope order={order} />{order.proposedUnitPrice != null ? <div className={quote ? 'mb-4 border-b pb-4' : 'mb-4'}><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your proposed price</p><p className="mt-1 font-semibold">{formatMoney(order.proposedUnitPrice, order.proposedCurrency ?? 'USD')} per specimen</p><p className="mt-1 text-sm text-muted-foreground">Proposed subtotal {formatMoney(order.proposedUnitPrice * order.requestedSpecimenCount, order.proposedCurrency ?? 'USD')} for {order.requestedSpecimenCount} specimens. Phaeno may approve or amend this before issuing the quote.</p>{order.priceProposalNote ? <p className="mt-2 text-sm">{order.priceProposalNote}</p> : null}</div> : null}{order.standardCommercialSnapshot ? <p className="text-sm text-muted-foreground">Standard bundle accepted. No separate assembly quote is required.</p> : quote ? <>
            <QuoteSummary quote={quote} status={quoteStatus ?? quote.status} />
            {awaitingQuoteAcceptance ? <div className="mt-4 space-y-3">
              {canManageQuotes ? acceptanceBlocked && acceptanceExplanation ? <p id="quote-acceptance-help" className="text-sm text-muted-foreground">{acceptanceExplanation}</p> : null
                : <p className="text-sm text-muted-foreground">An organization or department administrator must accept this quote{quoteStatus === 'Expired' ? ' or request an extension' : ''}. Your Member access lets you review and download it.</p>}
              {extensionPending ? <div className="space-y-1" role="status"><p className="text-sm font-medium">Extension requested</p><p className="text-sm text-muted-foreground">Phaeno is reviewing the request. A new quote revision will appear here if approved.</p></div> : null}
            </div> : null}
          </> : <p className="text-sm text-muted-foreground">Phaeno has not issued pricing yet.</p>}{canViewInvoices && invoicesQuery.isLoading ? <p role="status" className="mt-4 border-t pt-4 text-sm text-muted-foreground">Loading invoices…</p> : null}{canViewInvoices && invoicesQuery.isFetching && !invoicesQuery.isLoading ? <p role="status" className="mt-4 text-xs text-muted-foreground">Refreshing invoice status…</p> : null}{canViewInvoices && (invoicesQuery.error || invoiceDownload.error) ? <Alert variant="destructive" className="mt-4"><AlertTitle>Invoice could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(invoicesQuery.error ?? invoiceDownload.error, 'Refresh and try again.')}</AlertDescription></Alert> : null}{invoices.map((invoice) => <div key={invoice.id} className="mt-4 border-t pt-4"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">Invoice {invoice.invoiceNumber}</span><OrderStatusBadge status={invoice.status} /></div><p className="mt-1 text-sm text-muted-foreground">Due {formatDate(invoice.dueOn)} · Balance {formatMoney(invoice.balance, invoice.currency)}</p><Button type="button" size="sm" variant="outline" className="mt-2" disabled={invoiceDownload.isPending} onClick={() => invoiceDownload.mutate(invoice)}><Download data-icon="inline-start" />Download invoice PDF</Button></div>)}{canViewInvoices && !invoicesQuery.isLoading && !invoicesQuery.error && !invoices.length ? <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">No POMS invoice has been issued for this order.</p> : null}{!canViewInvoices ? <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">Contact Phaeno for billing records.</p> : null}{order.documents.map((document) => <div key={document.id} className="mt-4 border-t pt-4"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">Legacy billing source · {document.kind} {document.documentNumber ?? ''}</span><OrderStatusBadge status={document.syncStatus} /></div><p className="mt-1 text-sm text-muted-foreground">Finance review required · Historical balance {formatMoney(document.balance, document.currency)}</p>{document.documentUrl ? <a href={document.documentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">Open legacy record</a> : null}</div>)}</CardContent></Card>
          {visibility.samplesRelevant ? <Card><CardHeader><CardTitle>Sample submission</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-6">{order.submissionInstructions || 'Finalize the accepted sample list, then follow the instructions in the shipping insert. Contact Phaeno if instructions are unavailable.'}</p></CardContent></Card> : null}
            </div>
          </CommercialSection>
        </section>
        {visibility.samplesRelevant ? <LabJobShippingWorkspace order={order} workspace={workspace} onWorkspaceChange={changeWorkspace} headerTarget={headerTarget} sendActionTarget={sendActionTarget} orderActions={orderActions} orderDialogOpen={Boolean(dialog) || Boolean(extensionQuote)} onActivityChange={setShippingActive} navigationLocked={navigationLocked} onNavigationLockChange={setNavigationLocked} onKitSupplyChange={setKitSupply} /> : null}
      </section>
      {visibility.trackingRelevant ? <section id="after-you-send" className="mt-8 space-y-5" aria-labelledby="after-send-title">
        <div><h2 id="after-send-title" className="text-xl font-semibold">After you send</h2><p className="mt-1 text-sm text-muted-foreground">Track your shipments, laboratory progress and results here. We will show any action needed from you above.</p></div>
        <LabJobAfterSend orderId={order.id} />
        <LabServiceTimingPanel orderId={order.id} timing={order.timing} />
      <LabCustomerProgressPanel order={order} />
          <Card id="results">
            <CardHeader>
              <CardTitle>Files and results</CardTitle>
              <CardDescription>Scientific approval and release are governed in POMS. Payment balance and credit status never gate PSeq result release.</CardDescription>
            </CardHeader>
            <CardContent>
              {resultPackagesQuery.isLoading ? <p role="status" className="text-sm text-muted-foreground">Checking released result packages…</p> : null}
              {resultPackagesQuery.isFetching && !resultPackagesQuery.isLoading ? <p role="status" className="text-xs text-muted-foreground">Refreshing result availability…</p> : null}
              {resultPackagesQuery.error || resultDownload.error ? <Alert variant="destructive"><AlertTitle>Result files could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(resultPackagesQuery.error ?? resultDownload.error, 'Refresh and try again.')}</AlertDescription></Alert> : null}
              {resultPackages.length ? <div className="divide-y">{resultPackages.map((resultPackage) => <GovernedResultPackagePanel
                key={resultPackage.id} resultPackage={resultPackage}
                sampleName={order.samples.find((item) => item.id === resultPackage.labSampleId)?.customerSampleId ?? 'Sample'}
                isDownloading={resultDownload.isPending}
                onDownload={(artifact) => resultDownload.mutate({ resultPackage, artifact })}
              />)}</div> : null}
              {order.resultFiles.length ? <LabManagedResultReleases orderId={order.id} releases={order.resultReleases} files={order.resultFiles} /> : null}
              {!resultPackagesQuery.isLoading && !resultPackages.length && !order.resultFiles.length ? <div className="flex flex-col items-center py-8 text-center"><FileCheck2 aria-hidden="true" className="mb-2 size-7 text-muted-foreground" /><p className="font-medium">No released results</p><p className="mt-1 text-sm text-muted-foreground">Results may still be processing, under scientific review, or awaiting a Result Release Manager.</p></div> : null}
            </CardContent>
          </Card>

      </section> : null}
      <details className="mt-6 rounded-lg border bg-card p-4">
        <summary className="cursor-pointer font-semibold">Order history</summary>
        <div className="mt-4 space-y-5">
          {(order.requestRevisions?.length ?? 0) > 0 ? <Card><CardHeader><CardTitle>Submitted request revisions</CardTitle><CardDescription>Each submission preserves the Customer reference, samples, analyses, and instructions that Phaeno reviewed.</CardDescription></CardHeader><CardContent className="divide-y">{order.requestRevisions?.map((revision) => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">Revision {revision.revision}</p><p className="text-xs text-muted-foreground">Submitted {formatDateTime(revision.submittedAt)}</p>{revision.correctionReason ? <p className="mt-1 text-sm">Correction: {revision.correctionReason}</p> : null}</div><Button type="button" variant="outline" onClick={() => downloadSnapshot(`${order.orderNumber}-request-r${revision.revision}.json`, revision.snapshotJson)}><Download data-icon="inline-start" />Download snapshot</Button></div>)}</CardContent></Card> : null}

          <Card><CardHeader><CardTitle>Timeline</CardTitle><CardDescription>Customer-safe milestones and reasons for this request.</CardDescription></CardHeader><CardContent><ol className="space-y-4">{order.timeline.map((item) => <li key={item.id} className="border-l-2 border-border pl-4"><p className="text-sm font-medium">{humanizeStatus(item.toStatus)}</p><p className="text-xs text-muted-foreground">{formatDateTime(item.occurredAt)}</p>{item.reason ? <p className="mt-1 text-sm">{item.reason}</p> : null}</li>)}</ol></CardContent></Card>
        </div>
      </details>

      <Dialog open={dialog === 'accept'} onOpenChange={(open) => { if (!open) closeDecision() }}>
        <DialogContent showCloseButton={!action.isPending} aria-busy={action.isPending}>
          <DialogHeader>
            <DialogTitle>Accept quote for {order.orderNumber}?</DialogTitle>
            <DialogDescription>
              This accepts the quoted scope and opens sample entry. Laboratory work and shipping are authorized after you finalize the exact sample list.{' '}
              {quote?.taxDecisionSnapshotJson ? 'The displayed total includes the current tax determination.' : 'This quote is pre-tax; applicable tax will be calculated at invoicing.'}{' '}
              The accepted Department and commercial settings remain in the order history.
            </DialogDescription>
          </DialogHeader>{action.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(action.error, 'Review the details and try again.')}</AlertDescription></Alert> : null}
          {decisionQuote ? <QuoteSummary quote={decisionQuote} status={decisionQuote.id === quote?.id ? quoteStatus ?? decisionQuote.status : decisionQuote.status} /> : null}
          {acceptanceBlocked || decisionQuote?.id !== quote?.id ? <Alert variant="destructive"><AlertTitle>Quote cannot be accepted</AlertTitle><AlertDescription>{decisionQuote?.id !== quote?.id ? 'The quote changed. Close this dialog and review the current revision.' : acceptanceExplanation || 'Close this dialog and review the current quote.'}</AlertDescription></Alert> : null}
          {requiresPurchaseOrder ? (
            <div>
              <Label htmlFor="labPurchaseOrderNumber"><RequiredFieldName>Purchase order number</RequiredFieldName></Label>
              <Input disabled={action.isPending} id="labPurchaseOrderNumber" className="mt-2" value={purchaseOrderNumber} onChange={(event) => setPurchaseOrderNumber(event.target.value)} />
            </div>
          ) : null}
          <RequiredDialogFooter showLegend={requiresPurchaseOrder}>
            <DialogClose asChild><Button type="button" variant="outline" disabled={action.isPending}>Keep reviewing</Button></DialogClose>
            <Button type="button" onClick={() => action.mutate('accept')} disabled={action.isPending || acceptanceBlocked || decisionQuote?.id !== quote?.id || (requiresPurchaseOrder && !purchaseOrderNumber.trim())}>{action.isPending ? 'Accepting…' : 'Accept quote and place order'}</Button>
          </RequiredDialogFooter>
        </DialogContent>
      </Dialog>
      {extensionQuote ? <LabQuoteExtensionDialog order={order} quote={extensionQuote} onClose={() => setExtensionQuote(null)} /> : null}
      {dialog === 'decline' ? <LabQuoteDeclineDialog orderNumber={order.orderNumber} busy={action.isPending} error={action.error} onDecline={reason => action.mutateAsync({ kind: 'decline', reason })} onClose={() => setDialog(null)} /> : null}
      <Dialog open={dialog === 'cancel' || dialog === 'withdraw'} onOpenChange={(open) => { if (!open) closeDecision() }}><DialogContent showCloseButton={!action.isPending} aria-busy={action.isPending}><DialogHeader><DialogTitle>{dialog === 'withdraw' ? 'Withdraw' : 'Request cancellation for'} {order.orderNumber}</DialogTitle><DialogDescription>{dialog === 'withdraw' ? 'This closes the request before work is placed.' : 'Phaeno will review completed work and financial effects before deciding the request.'}</DialogDescription></DialogHeader>{action.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(action.error, 'Review the details and try again.')}</AlertDescription></Alert> : null}<div><Label htmlFor="cancellationReason"><RequiredFieldName>Reason</RequiredFieldName></Label><textarea disabled={action.isPending} id="cancellationReason" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={action.isPending}>Keep order</Button></DialogClose><Button type="button" variant="destructive" disabled={!cancellationReason.trim() || action.isPending} onClick={() => action.mutate(dialog === 'withdraw' ? 'withdraw' : 'cancel')}>{action.isPending ? 'Updating…' : dialog === 'withdraw' ? 'Withdraw request' : 'Request cancellation'}</Button></RequiredDialogFooter></DialogContent></Dialog>

    </main>
  )
}

function QuoteSummary({ quote, status = quote.status }: { quote: Quote; status?: string }) {
  const lines = parseLines(quote.linesJson)
  const taxIncluded = Boolean(quote.taxDecisionSnapshotJson)
  return <div><div className="flex items-center justify-between gap-2"><span className="font-medium">Revision {quote.revision}</span><OrderStatusBadge status={status} /></div>{status === 'Expired' ? <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-destructive"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Expired on {formatDate(quote.expiresAt)}</p> : status === 'Accepted' ? quote.acceptedAt ? <p className="mt-1 text-sm text-muted-foreground">Accepted {formatDate(quote.acceptedAt)}</p> : null : <p className="mt-1 text-sm text-muted-foreground">Expires {formatDate(quote.expiresAt)}</p>}{quote.pricingDecision ? <p className="mt-1 text-sm text-muted-foreground">{pricingDecisionLabel(quote.pricingDecision)}</p> : null}{lines.length ? <ul className="mt-3 divide-y">{lines.map((line, index) => <li key={`${line.description}-${index}`} className="flex justify-between gap-3 py-2 text-sm"><span>{line.description} × {line.quantity}</span><span>{formatMoney(line.quantity * line.unitPrice, quote.currency)}</span></li>)}</ul> : null}<div className="mt-3 space-y-2 border-t pt-3 text-sm"><div className="flex justify-between gap-3"><span>Subtotal</span><span>{formatMoney(quote.subtotal, quote.currency)}</span></div>{taxIncluded ? <div className="flex justify-between gap-3"><span>Tax</span><span>{formatMoney(quote.tax, quote.currency)}</span></div> : null}<div className="flex justify-between gap-3 font-semibold"><span>{taxIncluded ? 'Total' : 'Pre-tax total'}</span><span>{formatMoney(quote.total, quote.currency)}</span></div>{taxIncluded ? null : <p className="text-xs text-muted-foreground">Applicable tax will be calculated at invoicing.</p>}</div></div>
}

function pricingDecisionLabel(decision: NonNullable<Quote['pricingDecision']>) {
  if (decision === 'ApprovedAsProposed') return 'Phaeno approved the proposed unit price.'
  if (decision === 'AmendedProposal') return 'Phaeno amended the proposed unit price when issuing this quote.'
  return 'Phaeno set the price when issuing this quote.'
}

function parseLines(value: string): Array<{ description: string; quantity: number; unitPrice: number }> { try { return JSON.parse(value) as Array<{ description: string; quantity: number; unitPrice: number }> } catch { return [] } }
function formatMoney(value: number, currency: string) { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value) }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value)) }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function downloadSnapshot(fileName: string, value: string) { const url = URL.createObjectURL(new Blob([value], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = fileName; link.click(); URL.revokeObjectURL(url) }
