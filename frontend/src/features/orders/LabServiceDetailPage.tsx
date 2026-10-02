import { QuoteTurnaround } from './QuoteTurnaround'
import { LabPhasesPanel } from './LabPhasesPanel'
import { LabChangeQuotes } from './LabChangeQuotes'
import { customerLabStatus } from './lab-customer-progress'
import { LabJobWorkspaceActions } from './LabJobWorkspaceActions'
import { LabOrderQuoteReview } from './LabOrderQuoteReview'
import { QuoteSummary } from './QuoteSummary'
import { LabQuoteActions } from './LabQuoteActions'
import { labJobVisibility } from './lab-job-visibility'
import { hasMultipleLabPhases, labSampleCount } from './lab-job-presentation'
import { LabJobShippingWorkspace } from './LabJobShippingWorkspace'
import { LabJobPhaseShipping } from './LabJobPhaseShipping'
import { currentShippingPhase, phaseShippingProgress } from './lab-phase-shipping'
import { buildLabJobProgress } from './lab-job-progress'
import { LabJobDetailTabs, type LabJobDetailTab } from './LabJobDetailTabs'
import { LabJobHistory } from './LabJobHistory'
import { LabJobHoldNotice, LabJobTrackingSummary } from './LabJobTrackingSummary'
import { useLabPhasePlan } from './use-lab-phases'
import { LabJobOrderProgress } from './LabJobOrderProgress'
import type { ChangeLabJobWorkspace, LabJobWorkspaceSearch } from './lab-job-workspace-search'
import { getLabPhaseKitSupply, type ShipmentKitSupply } from '#/api/transportation-kit-requests'
import type { ShipmentHeaderAction } from '#/features/sample-shipping/SampleShippingDetailPage'
import { useSourceSampleShipments } from '#/features/sample-shipping/use-source-sample-shipments'
import { LabManagedResultReleases } from './LabManagedResultReleases'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Download, FileCheck2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { acceptLabQuote, declineLabQuote, downloadLabQuotePdf, getLabOrder, getLabSampleTubePairs, getOrderErrorMessage, isOrderConcurrencyError, requestLabCancellation, submitLabOrder, type Quote, withdrawLabOrder } from '#/api/order-management'
import { downloadCustomerInvoicePdf, downloadCustomerResultArtifact, listCustomerInvoices, listCustomerResultPackages, type CustomerResultPackage, type InvoiceReceivable } from '#/api/pseq-order-to-cash'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Field } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { GovernedResultPackagePanel } from './GovernedResultPackagePanel'
import { OrderStatusBadge } from './OrderStatusBadge'
import { useOrderDecisionDismissal } from './use-order-decision-dismissal'
import { StandardLabServicePanel } from './StandardLabServicePanel'
import { LabQuoteExtensionDialog } from './LabQuoteExtensionDialog'
import { LabQuoteDeclineDialog } from './LabQuoteDeclineDialog'
import { LabQuoteProposalDialog } from './LabQuoteProposalDialog'
import { currentLabQuote, quoteStatusAt, useQuoteStatus } from './use-quote-status'

export function LabServiceDetailPage({ orderId, workspace: controlledWorkspace, onWorkspaceChange }: { orderId: string; workspace?: LabJobWorkspaceSearch; onWorkspaceChange?: ChangeLabJobWorkspace }) {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const shipping = useSourceSampleShipments(orderId)
  const [localWorkspace, setLocalWorkspace] = useState<LabJobWorkspaceSearch>({})
  const workspace = controlledWorkspace ?? localWorkspace
  const orderActionRef = useRef<HTMLButtonElement>(null)
  const quoteActionRef = useRef<HTMLButtonElement>(null)
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null)
  const [sampleReviewTarget, setSampleReviewTarget] = useState<HTMLDivElement | null>(null)
  const [sendActionTarget, setSendActionTarget] = useState<HTMLDivElement | null>(null)
  const [shippingActive, setShippingActive] = useState(false)
  const [navigationLocked, setNavigationLocked] = useState(false)
  const [kitSupply, setKitSupply] = useState<ShipmentKitSupply | undefined>(undefined)
  const [kitOrderOpen, setKitOrderOpen] = useState(false)
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false)
  const [holdDialogOpen, setHoldDialogOpen] = useState(false)
  const [phaseDecisionOpen, setPhaseDecisionOpen] = useState(false)
  useBlocker({ shouldBlockFn: () => navigationLocked, enableBeforeUnload: navigationLocked, disabled: !navigationLocked })
  const changeWorkspace: ChangeLabJobWorkspace = (patch, options) => {
    if (onWorkspaceChange) return onWorkspaceChange(patch, options)
    if (!shippingActive) setLocalWorkspace(previous => ({ ...previous, ...patch }))
    return Promise.resolve()
  }
  const [dialog, setDialog] = useState<'accept' | 'cancel' | 'withdraw' | 'decline' | 'propose' | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('')
  const [sampleTypeConfirmed, setSampleTypeConfirmed] = useState(false)
  const [extensionQuote, setExtensionQuote] = useState<Quote | null>(null)
  const [decisionQuote, setDecisionQuote] = useState<Quote | null>(null)
  const [decisionVersion, setDecisionVersion] = useState<number | null>(null)
  const declineAttempt = useRef<{ payload: string; key: string } | null>(null)
  const apiEnabled = Boolean(session?.capabilities.canViewLabServiceOrders) && authProvider !== 'mock'
  const canViewInvoices = session?.capabilities.canViewLabServiceInvoices === true
  const orderQuery = useQuery({ queryKey: ['lab-service-order', orderId], queryFn: () => getLabOrder(orderId), enabled: apiEnabled })
  const pairWorkspace = useQuery({ queryKey: ['lab-sample-tube-pairs', orderId], queryFn: () => getLabSampleTubePairs(orderId),
    enabled: apiEnabled && orderQuery.data?.usesPairedPreparation === true && Boolean(orderQuery.data.placedAt) })
  const phasePlan = useLabPhasePlan(orderId, false, apiEnabled && Boolean(orderQuery.data?.placedAt || orderQuery.data?.quotes.some(q => q.status === 'Accepted')))
  const shippingPhase = currentShippingPhase(phasePlan.data?.phases, orderQuery.data, pairWorkspace.data, shipping.related)
  const phaseSupply = useQuery({ queryKey: ['lab-phase-kit-supply', orderId, undefined, shippingPhase?.id, phasePlan.data?.revision],
    queryFn: () => getLabPhaseKitSupply(orderId), enabled: apiEnabled && orderQuery.data?.usesPairedPreparation === true && Boolean(orderQuery.data.placedAt && shippingPhase) })
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
      if (typeof kind === 'object') {
        const current = currentLabQuote(order.quotes)
        if (!current || current.id !== decisionQuote?.id || decisionVersion !== order.version || !order.canDeclineQuote)
          throw new Error('The order or quote changed. Close this dialog and review the current quote.')
        const payload = JSON.stringify({ quoteId: current.id, version: decisionVersion, reason: kind.reason })
        if (declineAttempt.current?.payload !== payload) declineAttempt.current = { payload, key: crypto.randomUUID() }
        return declineLabQuote(order.id, current.id, decisionVersion, kind.reason, declineAttempt.current.key)
      }
      if (kind === 'submit') return submitLabOrder(order.id, order.version)
      if (kind === 'accept') {
        const current = currentLabQuote(order.quotes)
        if (!current || current.id !== decisionQuote?.id) throw new Error('The quote changed. Close this dialog and review the current quote.')
        if (quoteStatusAt(current, Date.now()) === 'Expired') throw new Error('This quote has expired and cannot be accepted. Request an extension to continue.')
        if (!order.canAcceptQuote) throw new Error(order.quoteAcceptanceBlockedReason || 'This quote is not available for acceptance.')
        if (!sampleTypeConfirmed || !order.sampleTypeDefinitionId) throw new Error('Confirm the quoted Sample type.')
        return acceptLabQuote(order.id, current.id, order.version, purchaseOrderNumber, order.sampleTypeDefinitionId)
      }
      if (kind === 'withdraw') return withdrawLabOrder(order.id, order.version, cancellationReason)
      return requestLabCancellation(order.id, order.version, cancellationReason)
    },
    onSuccess: async (updated, kind) => {
      queryClient.setQueryData(['lab-service-order', orderId], updated)
      setDialog(null); setCancellationReason(''); setPurchaseOrderNumber(''); setSampleTypeConfirmed(false)
      if (kind === 'accept') await changeWorkspace({ detailTab: 'phases', shipmentId: undefined, phaseId: undefined }, { afterSave: true })
      await queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] })
      await queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] })
    },
    onError: async error => { if (isOrderConcurrencyError(error)) await queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] }) },
  })

  const dialogDirty = dialog === 'accept' ? purchaseOrderNumber !== '' || sampleTypeConfirmed : (dialog === 'withdraw' || dialog === 'cancel') && cancellationReason !== ''
  const decisionDismissal = useOrderDecisionDismissal(dialogDirty, (dialog === 'accept' || dialog === 'withdraw' || dialog === 'cancel') && action.isPending, () => setDialog(null), { scope: 'order changes', description: 'The entries in this dialog will be discarded. Your saved order will remain unchanged.' })
  function openDecision(next: 'accept' | 'cancel' | 'withdraw' | 'decline' | 'propose') {
    if (action.isPending) return
    action.reset(); setCancellationReason(''); setPurchaseOrderNumber(''); setSampleTypeConfirmed(false); setDecisionQuote(['accept', 'decline', 'propose'].includes(next) ? quote : null); setDecisionVersion(orderQuery.data?.version ?? null); setDialog(next)
  }
  function closeDecision() {
    decisionDismissal.close()
  }

  if (!apiEnabled) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle>Connected order detail is unavailable</AlertTitle><AlertDescription>Use a signed-in Customer or Partner session to review this laboratory request.</AlertDescription></Alert></main>
  if (orderQuery.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading laboratory order…</p></main>
  if (orderQuery.error || !orderQuery.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Laboratory order could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(orderQuery.error, 'Return to Lab services and try again.')}</AlertDescription></Alert></main>

  const order = orderQuery.data
  const canManageQuotes = order.canManageQuotes ?? (order.canAcceptQuote || session?.capabilities.canAcceptLabServiceQuotes === true)
  const awaitingQuoteAcceptance = order.status === 'QuoteIssued' && !order.placedAt && !order.standardCommercialSnapshot && (quoteStatus === 'Issued' || quoteStatus === 'Expired')
  const proposal = order.quoteChangeProposal
  const declineUnavailable = !order.canDeclineQuote || quote?.id !== decisionQuote?.id || order.version !== decisionVersion
    ? 'The order or quote changed. Close this dialog and review the current quote before declining.' : undefined
  const restoreQuoteFocus = () => {
    const target = quoteActionRef.current ?? orderActionRef.current ?? document.getElementById('job-commercial')
    target?.focus()
  }
  const extensionPending = quote?.extensionRequest?.status === 'Pending'
  const acceptanceBlocked = quoteStatus === 'Expired' || !order.canAcceptQuote || (awaitingQuoteAcceptance && !quote?.deliveryTargetBusinessDays)
  const acceptanceExplanation = quoteStatus === 'Expired'
    ? 'This quote has expired and cannot be accepted. Phaeno must issue a new revision before you can continue.'
    : !quote?.deliveryTargetBusinessDays ? 'Phaeno must issue a new quote revision with a business-day delivery target before this order can be approved.'
    : order.quoteAcceptanceBlockedReason || 'This quote is not currently available for acceptance. Contact Phaeno for help.'
  const requiresPurchaseOrder = session?.selectedDepartment?.purchaseOrderRequired === true
  const invoices = canViewInvoices ? invoicesQuery.data?.filter((invoice) => invoice.labServiceOrderId === order.id) ?? [] : []
  const resultPackages = resultPackagesQuery.data ?? []
  const visibility = labJobVisibility(order, shipping.related, resultPackages.length > 0)
  const shippingPhaseId = shippingPhase?.id
  // Retain the mounted task during background refresh; its controls still use current query/error guards.
  const taskProgress = order.usesPairedPreparation && shippingPhase && phaseSupply.data && pairWorkspace.data && shipping.shipments.data
    ? phaseShippingProgress(shippingPhase, order, phaseSupply.data.requests, pairWorkspace.data, shipping.related) : null
  const legacyShippingFinished = !order.usesPairedPreparation && buildLabJobProgress({ order, shipments: shipping.related, shippingState: shipping.receiptState, kitSupply,
    canManageShipping: session?.capabilities.canManageSampleShipping === true, canAcceptOrder: Boolean(canManageQuotes || order.canPlaceStandardOrder), now: Date.now() }).allSent
  const showShippingWorkspace = visibility.samplesRelevant && (order.usesPairedPreparation ? taskProgress?.next === 'prepare' || taskProgress?.next === 'send' : !legacyShippingFinished)
  const detailsDisabled = navigationLocked || shippingActive || action.isPending || kitOrderOpen || phaseDialogOpen || holdDialogOpen || phaseDecisionOpen || Boolean(dialog) || Boolean(extensionQuote)
  const detailTab = workspace.detailTab ?? (visibility.confirmed ? 'phases' : 'billing')
  const changeDetails = (tab: LabJobDetailTab, phaseId?: string) => {
    if (detailsDisabled) return
    void changeWorkspace({ detailTab: tab, ...(phaseId && tab === 'phases' ? { detailPhaseId: phaseId } : phaseId && tab === 'results' ? { resultPhaseId: phaseId } : {}) }).then(() => {
      if (phaseId) window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        const target = document.getElementById(tab === 'phases' ? `phase-summary-${phaseId}` : 'results')
        target?.scrollIntoView({ block: 'nearest' }); target?.focus({ preventScroll: true })
      }))
    })
  }
  const filteredSampleIds = workspace.resultPhaseId ? new Set([
    ...order.samples.filter(s => s.phaseId === workspace.resultPhaseId).map(s => s.id),
    ...(phasePlan.data?.samples.filter(s => s.phaseId === workspace.resultPhaseId).map(s => s.id) ?? []),
    ...(phasePlan.data?.phases.find(p => p.id === workspace.resultPhaseId)?.sampleIds ?? []),
  ]) : null
  const filteredResultPackages = resultPackages.filter(p => !filteredSampleIds || filteredSampleIds.has(p.labSampleId))
  const filteredReleases = order.resultReleases.filter(r => !filteredSampleIds || filteredSampleIds.has(r.labSampleId))
  const orderActions: ShipmentHeaderAction[] = []
  const openKitOrder = () => {
    if (shippingActive || navigationLocked || dialog || extensionQuote) return
    setKitOrderOpen(true)
  }
  if (order.canEdit) orderActions.push({ kind: 'command', label: order.customerDraft ? 'Edit Draft' : 'Edit request', disabled: shippingActive || action.isPending, onSelect: () => { void navigate({ to: '/lab-services/$orderId/edit', params: { orderId: order.id }, search: previous => previous }) } })
  if (order.canSubmit) orderActions.push({ kind: 'command', label: 'Submit for pricing', disabled: shippingActive || action.isPending, onSelect: () => action.mutate('submit') })
  if (order.canWithdraw && !awaitingQuoteAcceptance) orderActions.push({ kind: 'command', label: 'Withdraw request', disabled: shippingActive || action.isPending, onSelect: () => openDecision('withdraw') })
  if (order.canRequestCancellation) orderActions.push({ kind: 'command', label: 'Request cancellation', variant: 'destructive', disabled: shippingActive || action.isPending, onSelect: () => openDecision('cancel') })
  const quoteActions = quote && !order.standardCommercialSnapshot ? <LabQuoteActions
    canAccept={awaitingQuoteAcceptance && canManageQuotes} canPropose={awaitingQuoteAcceptance && canManageQuotes && order.canProposeQuoteChanges === true}
    canDecline={awaitingQuoteAcceptance && canManageQuotes && order.canDeclineQuote === true}
    canExtend={awaitingQuoteAcceptance && !extensionPending && order.canRequestQuoteExtension === true && quoteStatus === 'Expired'}
    canDownload downloadBusy={quoteDownload.isPending} disabled={shippingActive || action.isPending}
    acceptanceBlocked={acceptanceBlocked} triggerRef={quoteActionRef}
    onAccept={() => openDecision('accept')} onPropose={() => openDecision('propose')} onDecline={() => openDecision('decline')}
    onExtend={() => setExtensionQuote(quote)} onDownload={() => quoteDownload.mutate({ orderNumber: order.orderNumber, quote })} /> : null
  const openStep = (step: string) => {
    if (step === 'receive-kits') { openKitOrder(); return }
    const targetId = step === 'confirm-order' ? 'job-commercial' : step === 'phase-progress' ? 'job-phase-progress' : step === 'prepare' ? 'paired-sample-preparation' : 'samples-and-shipping'
    const showTarget = () => window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId); target?.scrollIntoView({ block: 'start' }); target?.focus({ preventScroll: true })
    }))
    if (step === 'confirm-order' || step === 'phase-progress') void changeWorkspace({ detailTab: step === 'confirm-order' ? 'billing' : 'phases' }).then(showTarget)
    else void changeWorkspace({ phaseId: shippingPhaseId, shippingView: step === 'samples' || step === 'receive-kits' || step === 'prepare' ? undefined : 'tubes', orderKits: undefined }).then(showTarget)
  }
  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><Link to="/lab-services" search={previous => previous} className="inline-flex min-h-6 cursor-pointer items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-4" aria-hidden="true" />Back to lab services</Link><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold">{order.orderNumber}</h1><OrderStatusBadge status={order.status === 'QuoteIssued' && quoteStatus === 'Expired' ? 'QuoteExpired' : customerLabStatus(order.status, order.laboratoryProgress)} /></div><p className="mt-2 text-sm text-muted-foreground">{order.customerReference || 'No Customer reference'} · Updated {formatDate(order.updatedAt)}</p>{visibility.confirmed && phasePlan.data ? <p className="mt-1 text-xs text-muted-foreground">{labSampleCount(phasePlan.data.sampleCount)}{hasMultipleLabPhases(order, phasePlan.data) ? ` · ${phasePlan.data.phases.length} phases` : ''} · {phasePlan.data.phases.reduce((total, phase) => total + phase.deliveredSamples, 0)} results available</p> : null}</div>
        <div ref={setHeaderTarget} className="shrink-0">{!showShippingWorkspace ? <LabJobWorkspaceActions orderActions={orderActions} triggerRef={orderActionRef} dialogOpen={Boolean(dialog) || Boolean(extensionQuote) || kitOrderOpen || phaseDialogOpen} /> : null}</div>
      </section>
      {order.tenantSafeReason && (order.status === 'ChangesRequested' || order.tenantSafeReason !== proposal?.reason) ? <Alert className="mb-5"><AlertTitle>Action needed</AlertTitle><AlertDescription>{order.tenantSafeReason}</AlertDescription></Alert> : null}
      {visibility.trackingRelevant ? <LabJobHoldNotice order={order} onReview={phaseId => changeDetails('phases', phaseId)} /> : null}
      {order.labCustomerActionSummary ? <Alert className="mb-5"><AlertTitle>Laboratory action needed</AlertTitle><AlertDescription>{order.labCustomerActionSummary}</AlertDescription></Alert> : null}
      {action.error && !dialog ? <Alert variant="destructive" className="mb-5"><AlertTitle>Order was not updated</AlertTitle><AlertDescription>{getOrderErrorMessage(action.error, 'Reload and try again.')}</AlertDescription></Alert> : null}
      {quoteDownload.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Quote could not be downloaded</AlertTitle><AlertDescription>{getOrderErrorMessage(quoteDownload.error, 'Try Download quote PDF again. If the problem continues, contact Phaeno.')}</AlertDescription></Alert> : null}
      <section id="ordering-and-shipping" className="space-y-5">
        {order.placedAt && order.usesPairedPreparation ? <LabJobPhaseShipping order={order} phasePlan={phasePlan.data}
          phaseState={phasePlan.error ? 'unavailable' : phasePlan.data ? 'ready' : 'loading'} onPhaseRefresh={() => { void phasePlan.refetch() }}
          pairs={pairWorkspace.data} shipments={shipping.related} shippingReady={shipping.receiptState === 'ready'}
          canManage={session?.capabilities.canManageSampleShipping === true} actionsDisabled={shippingActive || navigationLocked || action.isPending} requestOpen={kitOrderOpen}
          onRequestOpenChange={setKitOrderOpen} onModalChange={setPhaseDialogOpen} onStepSelect={openStep} sendActionTargetRef={setSendActionTarget} />
          : <LabJobOrderProgress order={order} shipments={shipping.related} shippingState={shipping.receiptState} kitSupply={kitSupply}
            canManageShipping={session?.capabilities.canManageSampleShipping === true} canAcceptOrder={Boolean(canManageQuotes || order.canPlaceStandardOrder)}
            onStepSelect={openStep} sendActionTargetRef={setSendActionTarget} sampleReviewTargetRef={setSampleReviewTarget} />}
        {showShippingWorkspace ? <LabJobShippingWorkspace order={order} taskOnly={order.usesPairedPreparation} workspace={{ ...workspace, phaseId: shippingPhaseId }} onWorkspaceChange={changeWorkspace} headerTarget={headerTarget} sendActionTarget={sendActionTarget} sampleReviewTarget={sampleReviewTarget} orderActions={orderActions} orderDialogOpen={Boolean(dialog) || Boolean(extensionQuote) || kitOrderOpen || phaseDialogOpen || holdDialogOpen || phaseDecisionOpen} onActivityChange={setShippingActive} navigationLocked={navigationLocked} onNavigationLockChange={setNavigationLocked} onKitSupplyChange={setKitSupply} pairWorkspace={pairWorkspace.data} pairState={pairWorkspace.isLoading ? 'loading' : pairWorkspace.error ? 'unavailable' : 'ready'} onPairRefresh={() => { void pairWorkspace.refetch() }} /> : null}
      </section>
      <LabJobDetailTabs value={detailTab} onChange={tab => changeDetails(tab)} disabled={detailsDisabled}
        phases={visibility.confirmed ? <div className="space-y-4">
          <LabPhasesPanel order={order} onSaved={async () => { await queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] }); await queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] }) }}
            onModalChange={setPhaseDecisionOpen} tracking={{ shipments: shipping.related, shippingReady: shipping.receiptState === 'ready', pairs: pairWorkspace.data, requests: phaseSupply.data?.requests,
              expandedPhaseId: workspace.detailPhaseId, onExpand: id => { if (!detailsDisabled) void changeWorkspace({ detailPhaseId: id }) }, onResults: id => changeDetails('results', hasMultipleLabPhases(order, phasePlan.data) ? id : undefined),
              disabled: detailsDisabled, onHoldModalChange: setHoldDialogOpen }} />
          <LabJobTrackingSummary order={order} />
        </div> : <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Progress becomes available after the order is accepted. Review scope and pricing in Order and billing.</p>}
        results={          <Card>
            <CardHeader>
              <CardTitle>Files and results</CardTitle>
              <CardDescription>Phaeno manages scientific approval and release. Payment balance and credit status do not delay result release.</CardDescription>
            </CardHeader>
            <CardContent>
              {phasePlan.data && phasePlan.data.phases.length > 1 ? <Field className="mb-4 max-w-sm"><Label htmlFor="result-phase-filter">Phase</Label><NativeSelect id="result-phase-filter" value={workspace.resultPhaseId ?? ''} onChange={event => { void changeWorkspace({ resultPhaseId: event.target.value || undefined }) }}><option value="">All phases</option>{phasePlan.data.phases.map(phase => <option key={phase.id} value={phase.id}>{phase.name}</option>)}</NativeSelect></Field> : null}
              {workspace.resultPhaseId && !phasePlan.data?.phases.some(phase => phase.id === workspace.resultPhaseId) ? <Alert><AlertTitle>Selected phase is unavailable</AlertTitle><AlertDescription><Button variant="outline" size="sm" onClick={() => { void changeWorkspace({ resultPhaseId: undefined }) }}>Show all results</Button></AlertDescription></Alert> : null}
              {resultPackagesQuery.isLoading ? <p role="status" className="text-sm text-muted-foreground">Checking released result packages…</p> : null}
              {resultPackagesQuery.isFetching && !resultPackagesQuery.isLoading ? <p role="status" className="text-xs text-muted-foreground">Refreshing result availability…</p> : null}
              {resultPackagesQuery.error || resultDownload.error ? <Alert variant="destructive"><AlertTitle>Result files could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(resultPackagesQuery.error ?? resultDownload.error, 'Refresh and try again.')}</AlertDescription></Alert> : null}
              {filteredResultPackages.length ? <div className="divide-y">{filteredResultPackages.map((resultPackage) => <GovernedResultPackagePanel
                key={resultPackage.id} resultPackage={resultPackage}
                sampleName={order.samples.find((item) => item.id === resultPackage.labSampleId)?.customerSampleId ?? 'Sample'}
                isDownloading={resultDownload.isPending}
                onDownload={(artifact) => resultDownload.mutate({ resultPackage, artifact })}
              />)}</div> : null}
              {order.resultFiles.length ? <LabManagedResultReleases orderId={order.id} releases={filteredReleases} files={order.resultFiles} /> : null}
              {!resultPackagesQuery.isLoading && !resultPackagesQuery.error && !filteredResultPackages.length && !filteredReleases.some(r => r.releaseStatus === 'Released') ? <div className="flex flex-col items-center py-8 text-center"><FileCheck2 aria-hidden="true" className="mb-2 size-7 text-muted-foreground" /><p className="font-medium">{workspace.resultPhaseId && hasMultipleLabPhases(order, phasePlan.data) ? 'No released results for this phase' : 'No released results'}</p><p className="mt-1 text-sm text-muted-foreground">Results may still be processing, under scientific review, or awaiting a Result Release Manager.</p></div> : null}
            </CardContent>
          </Card>} billing={<><StandardLabServicePanel order={order} />
          <LabChangeQuotes order={order} onSaved={async () => { await queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] }); await queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] }) }} />
          <section aria-labelledby="order-details-heading" className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="order-details-heading" className="font-semibold">Order details and billing</h2>{quoteActions}</div>
            <LabOrderQuoteReview order={order} quote={quote} status={quoteStatus ?? quote?.status}
              quoteHelp={proposal ? <Alert className="mt-4"><AlertTitle>Changes proposed</AlertTitle><AlertDescription><p>Quote revision {proposal.quoteRevision} · Sent {formatDateTime(proposal.proposedAt)}</p><p className="whitespace-pre-wrap break-words">{proposal.reason}</p><p>Phaeno is reviewing your proposal. Your request remains open. You can accept after Phaeno issues a revised quote.</p></AlertDescription></Alert> : awaitingQuoteAcceptance ? <div className="mt-4 space-y-3">
              {canManageQuotes ? acceptanceBlocked && acceptanceExplanation ? <p id="quote-acceptance-help" className="text-sm text-muted-foreground">{acceptanceExplanation}</p> : null
                : <p className="text-sm text-muted-foreground">An organization or department administrator must accept this quote{quoteStatus === 'Expired' ? ' or request an extension' : ''}. Your Member access lets you review and download it.</p>}
              {extensionPending ? <div className="space-y-1" role="status"><p className="text-sm font-medium">Extension requested</p><p className="text-sm text-muted-foreground">Phaeno is reviewing the request. A new quote revision will appear here if approved.</p></div> : null}
            </div> : null}
              billing={<>
                {canViewInvoices && invoicesQuery.isLoading ? <p role="status" className="mt-4 border-t pt-4 text-sm text-muted-foreground">Loading invoices…</p> : null}{canViewInvoices && invoicesQuery.isFetching && !invoicesQuery.isLoading ? <p role="status" className="mt-4 text-xs text-muted-foreground">Refreshing invoice status…</p> : null}{canViewInvoices && (invoicesQuery.error || invoiceDownload.error) ? <Alert variant="destructive" className="mt-4"><AlertTitle>Invoice could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(invoicesQuery.error ?? invoiceDownload.error, 'Refresh and try again.')}</AlertDescription></Alert> : null}{invoices.map((invoice) => <div key={invoice.id} className="mt-4 border-t pt-4"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">Invoice {invoice.invoiceNumber}</span><OrderStatusBadge status={invoice.status} /></div><p className="mt-1 text-sm text-muted-foreground">Due {formatDate(invoice.dueOn)} · Balance {formatMoney(invoice.balance, invoice.currency)}</p><Button type="button" size="sm" variant="outline" className="mt-2" disabled={invoiceDownload.isPending} onClick={() => invoiceDownload.mutate(invoice)}><Download data-icon="inline-start" />Download invoice PDF</Button></div>)}{canViewInvoices && !invoicesQuery.isLoading && !invoicesQuery.error && !invoices.length ? <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">No invoice has been issued for this order.</p> : null}{!canViewInvoices ? <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">Contact Phaeno for billing records.</p> : null}{order.documents.map((document) => <div key={document.id} className="mt-4 border-t pt-4"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">Legacy billing source · {document.kind} {document.documentNumber ?? ''}</span><OrderStatusBadge status={document.syncStatus} /></div><p className="mt-1 text-sm text-muted-foreground">Finance review required · Historical balance {formatMoney(document.balance, document.currency)}</p>{document.documentUrl ? <a href={document.documentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">Open legacy record</a> : null}</div>)}
              </>}
            />
          </section></>} history={<LabJobHistory order={order} />} />

      <Dialog open={dialog === 'accept'} onOpenChange={(open) => { if (!open) closeDecision() }}>
        <DialogContent showCloseButton={!action.isPending} aria-busy={action.isPending} onOpenAutoFocus={event => { event.preventDefault(); document.getElementById('accept-quote-keep-reviewing')?.focus() }} onCloseAutoFocus={event => { event.preventDefault(); restoreQuoteFocus() }}>
          <DialogHeader>
            <DialogTitle>Accept quote for {order.orderNumber}?</DialogTitle>
            <DialogDescription>Review the quote, then confirm your Sample type. Request transportation kits later when ready.</DialogDescription>
          </DialogHeader>{action.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(action.error, 'Review the details and try again.')}</AlertDescription></Alert> : null}
          {decisionQuote ? <section aria-labelledby="accept-quote-details" className="overflow-hidden rounded-lg border">
            <h3 id="accept-quote-details" className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">Quote details</h3>
            <div className="p-4"><QuoteSummary quote={decisionQuote} status={decisionQuote.id === quote?.id ? quoteStatus ?? decisionQuote.status : decisionQuote.status} /><QuoteTurnaround quote={decisionQuote} /></div>
          </section> : null}
          {acceptanceBlocked || decisionQuote?.id !== quote?.id ? <Alert variant="destructive"><AlertTitle>Quote cannot be accepted</AlertTitle><AlertDescription>{decisionQuote?.id !== quote?.id ? 'The quote changed. Close this dialog and review the current revision.' : acceptanceExplanation || 'Close this dialog and review the current quote.'}</AlertDescription></Alert> : null}
          <section aria-labelledby="accept-order-details" className="overflow-hidden rounded-lg border">
            <h3 id="accept-order-details" className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">Sample type</h3>
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="confirmed-lab-sample-type"><RequiredFieldName>Sample type</RequiredFieldName></Label>
                <p className="text-sm">{order.sampleTypeName ?? 'No Sample type was quoted'}</p>
                <label className="flex items-start gap-2 text-sm"><input id="confirmed-lab-sample-type" type="checkbox" className="mt-1" checked={sampleTypeConfirmed} disabled={action.isPending || !order.sampleTypeDefinitionId} onChange={event => setSampleTypeConfirmed(event.target.checked)} /><span>I confirm this is the Sample type I will send. A different type requires a revised quote.</span></label>
              </div>

            </div>
            <p className="border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground">Request transportation kits when you are ready. Lab work is authorized after you confirm {hasMultipleLabPhases(order, phasePlan.data) ? 'each phase’s' : 'your'} samples and tubes. Your accepted terms are saved in order history.</p>
          </section>
          {requiresPurchaseOrder ? (
            <section aria-labelledby="accept-billing-reference" className="overflow-hidden rounded-lg border">
              <h3 id="accept-billing-reference" className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">Billing reference</h3>
              <Field className="p-4"><Label htmlFor="labPurchaseOrderNumber"><RequiredFieldName>Purchase order number</RequiredFieldName></Label>
                <Input disabled={action.isPending} id="labPurchaseOrderNumber" value={purchaseOrderNumber} onChange={(event) => setPurchaseOrderNumber(event.target.value)} />
              </Field>
            </section>
          ) : null}
          <RequiredDialogFooter showLegend>
            <DialogClose asChild><Button id="accept-quote-keep-reviewing" type="button" variant="outline" disabled={action.isPending}>Keep reviewing</Button></DialogClose>
            <Button type="button" onClick={() => action.mutate('accept')} disabled={action.isPending || acceptanceBlocked || decisionQuote?.id !== quote?.id || !sampleTypeConfirmed || (requiresPurchaseOrder && !purchaseOrderNumber.trim())}>{action.isPending ? 'Accepting…' : 'Confirm price and order'}</Button>
          </RequiredDialogFooter>
        </DialogContent>
      </Dialog>
      {extensionQuote ? <LabQuoteExtensionDialog order={order} quote={extensionQuote} onClose={() => setExtensionQuote(null)} onCloseFocus={restoreQuoteFocus} /> : null}
      {dialog === 'propose' && decisionQuote ? <LabQuoteProposalDialog order={order} quote={decisionQuote} onClose={() => setDialog(null)} onCloseFocus={restoreQuoteFocus} /> : null}
      {dialog === 'decline' ? <LabQuoteDeclineDialog orderNumber={order.orderNumber} quoteRevision={decisionQuote?.revision} busy={action.isPending} error={action.error} unavailableReason={declineUnavailable} onDecline={reason => action.mutateAsync({ kind: 'decline', reason })} onClose={() => setDialog(null)} onCloseFocus={restoreQuoteFocus} /> : null}
      <Dialog open={dialog === 'cancel' || dialog === 'withdraw'} onOpenChange={(open) => { if (!open) closeDecision() }}><DialogContent showCloseButton={!action.isPending} aria-busy={action.isPending}><DialogHeader><DialogTitle>{dialog === 'withdraw' ? 'Withdraw' : 'Request cancellation for'} {order.orderNumber}</DialogTitle><DialogDescription>{dialog === 'withdraw' ? 'This closes the request before work is placed.' : 'Phaeno will review completed work and financial effects before deciding the request.'}</DialogDescription></DialogHeader>{action.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(action.error, 'Review the details and try again.')}</AlertDescription></Alert> : null}<div><Label htmlFor="cancellationReason"><RequiredFieldName>Reason</RequiredFieldName></Label><textarea disabled={action.isPending} id="cancellationReason" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={action.isPending}>Keep order</Button></DialogClose><Button type="button" variant="destructive" disabled={!cancellationReason.trim() || action.isPending} onClick={() => action.mutate(dialog === 'withdraw' ? 'withdraw' : 'cancel')}>{action.isPending ? 'Updating…' : dialog === 'withdraw' ? 'Withdraw request' : 'Request cancellation'}</Button></RequiredDialogFooter></DialogContent></Dialog>

    {decisionDismissal.confirmation}
    </main>
  )
}

function formatMoney(value: number, currency: string) { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value) }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value)) }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
