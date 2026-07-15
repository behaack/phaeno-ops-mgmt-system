import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, FileCheck2 } from 'lucide-react'
import { useState } from 'react'

import { acceptLabQuote, downloadLabResult, getLabOrder, getOrderErrorMessage, recordLabSampleShipment, requestLabCancellation, submitLabOrder, type Quote, withdrawLabOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'
import { humanizeStatus, OrderStatusBadge } from './OrderStatusBadge'

export function LabServiceDetailPage({ orderId }: { orderId: string }) {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<'accept' | 'cancel' | 'withdraw' | 'shipment' | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [shipmentSampleId, setShipmentSampleId] = useState('')
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const apiEnabled = Boolean(session?.capabilities.canViewLabServiceOrders) && authProvider !== 'mock'
  const orderQuery = useQuery({ queryKey: ['lab-service-order', orderId], queryFn: () => getLabOrder(orderId), enabled: apiEnabled })
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
    onSuccess: async () => {
      setDialog(null); setCancellationReason(''); setShipmentSampleId(''); setCarrier(''); setTrackingNumber('')
      await queryClient.invalidateQueries({ queryKey: ['lab-service-order', orderId] })
      await queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] })
    },
  })

  if (!apiEnabled) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle>Connected order detail is unavailable</AlertTitle><AlertDescription>Use a signed-in Customer session to review this laboratory request.</AlertDescription></Alert></main>
  if (orderQuery.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading laboratory order…</p></main>
  if (orderQuery.error || !orderQuery.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Laboratory order could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(orderQuery.error, 'Return to Lab services and try again.')}</AlertDescription></Alert></main>

  const order = orderQuery.data
  const quote = currentQuote(order.quotes)
  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-sm text-muted-foreground"><Link to="/lab-services" className="hover:underline">Lab services</Link> / <span className="font-mono">{order.orderNumber}</span></p><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold">{order.orderNumber}</h1><OrderStatusBadge status={order.status} /></div><p className="mt-2 text-sm text-muted-foreground">{order.customerReference || 'No Customer reference'} · Updated {formatDate(order.updatedAt)}</p></div>
        <div className="flex flex-wrap gap-2">{order.canEdit ? <Button type="button" variant="outline" asChild><Link to="/lab-services/$orderId/edit" params={{ orderId: order.id }}>Edit request</Link></Button> : null}{order.canSubmit ? <Button type="button" onClick={() => action.mutate('submit')} disabled={action.isPending}>Submit for pricing</Button> : null}{order.canAcceptQuote ? <Button type="button" onClick={() => setDialog('accept')}>Accept quote</Button> : null}{order.canWithdraw ? <Button type="button" variant="outline" onClick={() => setDialog('withdraw')}>Withdraw</Button> : null}{order.canRequestCancellation ? <Button type="button" variant="outline" onClick={() => setDialog('cancel')}>Request cancellation</Button> : null}</div>
      </section>
      {order.tenantSafeReason ? <Alert className="mb-5"><AlertTitle>Action needed</AlertTitle><AlertDescription>{order.tenantSafeReason}</AlertDescription></Alert> : null}
      {action.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Order was not updated</AlertTitle><AlertDescription>{getOrderErrorMessage(action.error, 'Reload and try again.')}</AlertDescription></Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Samples</CardTitle><CardDescription>Each sample progresses independently after physical receipt and accession.</CardDescription></CardHeader><CardContent className="divide-y">{order.samples.map((sample) => <section key={sample.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-medium">{sample.customerSampleId}</h2><p className="mt-1 text-sm text-muted-foreground">{sample.materialType} · {sample.quantity} {sample.quantityUnit} · {sample.biologicalSource}</p></div><div className="flex flex-wrap items-center gap-2"><OrderStatusBadge status={sample.status} />{!sample.receivedAt && order.placedAt ? <Button type="button" size="sm" variant="outline" onClick={() => { setShipmentSampleId(sample.id); setCarrier(sample.carrier ?? ''); setTrackingNumber(sample.trackingNumber ?? ''); setDialog('shipment') }}>Record shipment</Button> : null}</div></div>{sample.accessionId ? <p className="mt-2 text-sm">Accession <span className="font-mono">{sample.accessionId}</span></p> : null}{sample.trackingNumber ? <p className="mt-2 text-sm">Shipment {sample.carrier ?? ''} <span className="font-mono">{sample.trackingNumber}</span></p> : null}{sample.receiptCondition ? <p className="mt-1 text-sm text-muted-foreground">Receipt: {sample.receiptCondition}</p> : null}{sample.tenantSafeReason ? <p className="mt-2 text-sm text-destructive">{sample.tenantSafeReason}</p> : null}</section>)}</CardContent></Card>

          <Card><CardHeader><CardTitle>Files and results</CardTitle><CardDescription>Scientific readiness and commercial release are separate. Files appear here only after all release gates pass.</CardDescription></CardHeader><CardContent>{order.resultFiles.length ? <ul className="divide-y">{order.resultFiles.map((file) => <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{file.fileName}</p><p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)} · Released {file.releasedAt ? formatDate(file.releasedAt) : '—'}</p></div><Button type="button" variant="outline" onClick={() => downloadLabResult(order.id, file)}><Download data-icon="inline-start" />Download</Button></li>)}</ul> : <div className="flex flex-col items-center py-8 text-center"><FileCheck2 aria-hidden="true" className="mb-2 size-7 text-muted-foreground" /><p className="font-medium">No released results</p><p className="mt-1 text-sm text-muted-foreground">Results may still be processing or awaiting payment.</p></div>}</CardContent></Card>

          {(order.requestRevisions?.length ?? 0) > 0 ? <Card><CardHeader><CardTitle>Submitted request revisions</CardTitle><CardDescription>Each submission preserves the Customer reference, samples, analyses, and instructions that Phaeno reviewed.</CardDescription></CardHeader><CardContent className="divide-y">{order.requestRevisions?.map((revision) => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">Revision {revision.revision}</p><p className="text-xs text-muted-foreground">Submitted {formatDateTime(revision.submittedAt)}</p>{revision.correctionReason ? <p className="mt-1 text-sm">Correction: {revision.correctionReason}</p> : null}</div><Button type="button" variant="outline" onClick={() => downloadSnapshot(`${order.orderNumber}-request-r${revision.revision}.json`, revision.snapshotJson)}><Download data-icon="inline-start" />Download snapshot</Button></div>)}</CardContent></Card> : null}

          <Card><CardHeader><CardTitle>Timeline</CardTitle><CardDescription>Customer-safe milestones and reasons for this request.</CardDescription></CardHeader><CardContent><ol className="space-y-4">{order.timeline.map((item) => <li key={item.id} className="border-l-2 border-border pl-4"><p className="text-sm font-medium">{humanizeStatus(item.toStatus)}</p><p className="text-xs text-muted-foreground">{formatDateTime(item.occurredAt)}</p>{item.reason ? <p className="mt-1 text-sm">{item.reason}</p> : null}</li>)}</ol></CardContent></Card>
        </div>

        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Quote and commercial status</CardTitle><CardDescription>Job-specific pricing is immutable by revision.</CardDescription></CardHeader><CardContent>{quote ? <><QuoteSummary quote={quote} /><Button type="button" variant="outline" className="mt-4" onClick={() => downloadSnapshot(`${order.orderNumber}-quote-r${quote.revision}.json`, JSON.stringify({ ...quote, lines: parseLines(quote.linesJson) }, null, 2))}><Download data-icon="inline-start" />Download quote</Button></> : <p className="text-sm text-muted-foreground">Phaeno has not issued pricing yet.</p>}{order.documents.map((document) => <div key={document.id} className="mt-4 border-t pt-4"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{document.kind} {document.documentNumber ?? ''}</span><OrderStatusBadge status={document.syncStatus} /></div><p className="mt-1 text-sm text-muted-foreground">Balance {formatMoney(document.balance, document.currency)}</p>{document.documentUrl ? <a href={document.documentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">Open in QuickBooks</a> : null}</div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Sample submission</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-6">{order.submissionInstructions || 'Phaeno will provide submission instructions with the quote.'}</p></CardContent></Card>
        </div>
      </div>

      <Dialog open={dialog === 'accept'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>Accept quote for {order.orderNumber}?</DialogTitle><DialogDescription>This places the complete quoted scope and authorizes Phaeno to perform the work. The accepted snapshot remains in the order history.</DialogDescription></DialogHeader>{quote ? <QuoteSummary quote={quote} /> : null}<DialogFooter><DialogClose asChild><Button type="button" variant="outline">Keep reviewing</Button></DialogClose><Button type="button" onClick={() => action.mutate('accept')} disabled={action.isPending}>{action.isPending ? 'Accepting…' : 'Accept quote and place order'}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={dialog === 'cancel' || dialog === 'withdraw'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>{dialog === 'withdraw' ? 'Withdraw' : 'Request cancellation for'} {order.orderNumber}</DialogTitle><DialogDescription>{dialog === 'withdraw' ? 'This closes the request before work is placed.' : 'Phaeno will review completed work and financial effects before deciding the request.'}</DialogDescription></DialogHeader><div><Label htmlFor="cancellationReason">Reason <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span></Label><textarea id="cancellationReason" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Keep order</Button></DialogClose><Button type="button" variant="destructive" disabled={!cancellationReason.trim() || action.isPending} onClick={() => action.mutate(dialog === 'withdraw' ? 'withdraw' : 'cancel')}>{action.isPending ? 'Updating…' : dialog === 'withdraw' ? 'Withdraw request' : 'Request cancellation'}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={dialog === 'shipment'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>Record sample shipment</DialogTitle><DialogDescription>Add the carrier and tracking number after the sample leaves your organization.</DialogDescription></DialogHeader><div className="grid gap-4"><div><Label htmlFor="sampleCarrier">Carrier</Label><input id="sampleCarrier" value={carrier} onChange={(event) => setCarrier(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div><div><Label htmlFor="sampleTrackingNumber">Tracking number</Label><input id="sampleTrackingNumber" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div></div><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="button" disabled={action.isPending} onClick={() => action.mutate('shipment')}>{action.isPending ? 'Saving…' : 'Record shipment'}</Button></DialogFooter></DialogContent></Dialog>
    </main>
  )
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
function downloadSnapshot(fileName: string, value: string) { const url = URL.createObjectURL(new Blob([value], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = fileName; link.click(); URL.revokeObjectURL(url) }
