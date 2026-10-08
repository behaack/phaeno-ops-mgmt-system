import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { acceptLabQuote, declineLabChangeQuote, downloadLabQuotePdf, getOrderErrorMessage, issuePlatformQuote, type LabServiceOrder, type OrderConfiguration, type Quote } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { useQuoteStatus } from './use-quote-status'
import { sampleServicePricing } from './sample-service-pricing'

const changeSchema = z.object({
  sources: z.array(z.object({ biologicalSource: z.string().trim().min(1).max(500), specimenCount: z.coerce.number().int().min(1).max(10000) })).min(1),
  runs: z.string().trim().refine(v => !v || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 10000), "Enter a whole number from 1 to 10,000."),
  unitPrice: z.coerce.number().positive().refine(value => Math.round(value * 100) / 100 === value, 'Use at most two decimal places.'),
  additionalRunPrice: z.number().nonnegative().multipleOf(0.01).nullable(),
}).superRefine((values, context) => {
  const samples = values.sources.reduce((sum, source) => sum + source.specimenCount, 0)
  if (values.runs && Number(values.runs) > samples && values.additionalRunPrice === null)
    context.addIssue({ code: 'custom', path: ['additionalRunPrice'], message: 'Enter the price per additional sequencing run.' })
})

export function IssueLabChangeQuote({ order, catalogItems, onSaved, renderTrigger, onCloseFocus }: { order: LabServiceOrder; catalogItems: OrderConfiguration['catalogItems']; onSaved: () => Promise<void>; renderTrigger?: (open: () => void) => ReactNode; onCloseFocus?: () => void }) {
  const [open, setOpen] = useState(false)
  const [reviewVersion, setReviewVersion] = useState(order.version)
  const accepted = order.quotes.find(quote => quote.purpose === 'Initial' && quote.status === 'Accepted')
  const acceptedIds = acceptedCatalogIds(accepted)
  const matched = catalogItems.filter(item => acceptedIds.includes(item.id) && item.isPSeqLabService && item.isActive && item.salesUnit.toLowerCase() === 'specimen')
  const catalog = matched.length === 1 ? matched[0] : undefined
  const form = useForm<z.input<typeof changeSchema>, unknown, z.output<typeof changeSchema>>({ resolver: zodResolver(changeSchema), defaultValues: { sources: [{ biologicalSource: '', specimenCount: 1 }], runs: '', unitPrice: catalog?.basePrice ?? 0, additionalRunPrice: null } })
  const sources = useFieldArray({ control: form.control, name: 'sources' })
  const watched = form.watch()
  const sampleCount = watched.sources.reduce((sum, source) => sum + (Number(source.specimenCount) || 0), 0)
  const totalRuns = watched.runs ? Number(watched.runs) : sampleCount
  const pricing = sampleServicePricing(sampleCount, totalRuns, Number(watched.unitPrice) || null, watched.additionalRunPrice)
  const change = useMutation({
    mutationFn: async (values: z.output<typeof changeSchema>) => {
      if (!catalog) throw new Error('The accepted Job’s laboratory offering must be available for additional work.')
      const quantity = values.sources.reduce((total, source) => total + source.specimenCount, 0)
      if (quantity + order.requestedSpecimenCount > 10000) throw new Error('A Job can contain at most 10,000 accepted samples.')
      const runs = values.runs ? Number(values.runs) : quantity
      if (runs < quantity || runs + (order.requestedSequencingRunCount ?? order.requestedSpecimenCount) > 10000) throw new Error('Runs must cover every new sample without exceeding 10,000 total runs.')
      if (runs > quantity && values.additionalRunPrice === null) throw new Error('Enter the separate price per additional sequencing run.')
      return issuePlatformQuote('lab', order.id, { version: reviewVersion, purpose: 'Change', currency: 'USD', tax: 0, additionalSources: values.sources, additionalSequencingRunCount: runs,
        lines: [{ catalogItemId: catalog.id, description: `${catalog.name} standard sample service`, quantity, unitPrice: values.unitPrice, pricingComponent: 'StandardSample' },
          ...(runs > quantity ? [{ catalogItemId: catalog.id, description: 'Additional sequencing runs using prepared library', quantity: runs - quantity, unitPrice: values.additionalRunPrice!, pricingComponent: 'AdditionalRun' as const }] : [])] })
    },
    onSuccess: async () => { await onSaved(); setOpen(false); form.reset() },
  })
  function close() { if (!change.isPending && (!form.formState.isDirty || window.confirm('Discard this unsaved Change quote?'))) setOpen(false) }
  function openQuote() { setReviewVersion(order.version); change.reset(); setOpen(true) }
  return <>
    {renderTrigger ? renderTrigger(openQuote) : <Button variant="outline" onClick={openQuote}>Issue Change quote</Button>}
    <Dialog open={open} onOpenChange={value => { if (!value) close() }}><DialogContent onCloseAutoFocus={onCloseFocus ? event => { event.preventDefault(); onCloseFocus() } : undefined}>
      <DialogHeader><DialogTitle>Quote additional samples</DialogTitle><DialogDescription>These counts and charges are additions to the accepted Job. The Customer must accept before entering additional samples. Existing work continues under its original agreement.</DialogDescription></DialogHeader>
      <p className="text-sm">{catalog ? `Service: ${catalog.name}` : 'The accepted Job’s offering is unavailable. Review that service before quoting additional work.'}</p>
      <form id="change-quote" onSubmit={form.handleSubmit(values => change.mutate(values))} className="max-h-[60vh] space-y-4 overflow-y-auto">
        <fieldset disabled={change.isPending} className="space-y-4">
          {sources.fields.map((field, index) => <div key={field.id} className="space-y-2 rounded-md border p-3">
            <Label htmlFor={`change-source-${index}`}>Biological source *</Label><Input id={`change-source-${index}`} {...form.register(`sources.${index}.biologicalSource`)} aria-invalid={Boolean(form.formState.errors.sources?.[index]?.biologicalSource)} aria-describedby={`change-source-error-${index}`} />
            <p id={`change-source-error-${index}`} role="alert" className="text-sm text-destructive">{form.formState.errors.sources?.[index]?.biologicalSource?.message}</p>
            <Label htmlFor={`change-count-${index}`}>Additional samples *</Label><Input id={`change-count-${index}`} type="number" min={1} max={10000} {...form.register(`sources.${index}.specimenCount`)} aria-invalid={Boolean(form.formState.errors.sources?.[index]?.specimenCount)} aria-describedby={`change-count-error-${index}`} />
            <p id={`change-count-error-${index}`} role="alert" className="text-sm text-destructive">{form.formState.errors.sources?.[index]?.specimenCount?.message}</p>
            {sources.fields.length > 1 ? <Button type="button" variant="ghost" onClick={() => sources.remove(index)}>Remove source {index + 1}</Button> : null}
          </div>)}
          <Button type="button" variant="outline" onClick={() => sources.append({ biologicalSource: '', specimenCount: 1 })}>Add biological source</Button>
          <Label htmlFor="change-runs">Total runs for added samples</Label><Input id="change-runs" type="number" min={1} max={10000} step={1} placeholder="One per additional sample" {...form.register('runs')} aria-invalid={Boolean(form.formState.errors.runs)} aria-describedby="change-runs-help" />
          <p id="change-runs-help" className="text-xs text-muted-foreground">{form.formState.errors.runs?.message ?? 'Leave blank for one run per new sample. Allocate these runs when identifying the additional samples.'}</p>
          <Label htmlFor="change-price">Price per sample (USD) *</Label><Input id="change-price" type="number" min="0.01" step="0.01" {...form.register('unitPrice')} aria-invalid={Boolean(form.formState.errors.unitPrice)} aria-describedby="change-price-error" />
          <p id="change-price-error" role="alert" className="text-sm text-destructive">{form.formState.errors.unitPrice?.message}</p>
          <p className="text-xs text-muted-foreground">Tax is included when approved information is available; otherwise it is calculated at invoicing.</p>
          <p className="text-xs text-muted-foreground">The sample price includes one library preparation, one run and data assembly.</p>
          {pricing.additionalRuns > 0 ? <div className="space-y-2"><Label htmlFor="change-extra-price">Price per additional run (USD) *</Label><Input id="change-extra-price" type="number" min={0} step="0.01" {...form.register('additionalRunPrice', { setValueAs: value => value === '' ? null : Number(value) })} aria-invalid={Boolean(form.formState.errors.additionalRunPrice)} aria-describedby="change-extra-price-error" /><p id="change-extra-price-error" role="alert" className="text-sm text-destructive">{form.formState.errors.additionalRunPrice?.message}</p><p className="text-xs text-muted-foreground">Uses the existing prepared library while material remains available.</p></div> : null}
          <p className="text-sm">{sampleCount} standard sample services · {pricing.additionalRuns} additional runs · Subtotal: {pricing.subtotal === null ? 'Complete the prices' : money(pricing.subtotal)}</p>
        </fieldset>
      </form>
      {change.error ? <Alert variant="destructive"><AlertTitle>Quote was not issued</AlertTitle><AlertDescription>{getOrderErrorMessage(change.error, 'Refresh the Job and review the additional scope again.')}</AlertDescription></Alert> : null}
      <RequiredDialogFooter><Button variant="outline" disabled={change.isPending} onClick={close}>Cancel</Button><Button form="change-quote" type="submit" disabled={change.isPending || !catalog}>{change.isPending ? 'Issuing…' : 'Issue Change quote'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog>
  </>
}

export function LabChangeQuotes({ order, onSaved }: { order: LabServiceOrder; onSaved: () => Promise<void> }) {
  return <>{order.quotes.filter(quote => quote.purpose === 'Change').map(quote => <ChangeQuote key={quote.id} order={order} quote={quote} onSaved={onSaved} />)}</>
}

function ChangeQuote({ order, quote, onSaved }: { order: LabServiceOrder; quote: Quote; onSaved: () => Promise<void> }) {
  const { session } = usePhaenoSession()
  const status = useQuoteStatus(quote)
  const [decision, setDecision] = useState<{ kind: 'accept' | 'decline'; version: number } | null>(null)
  const [po, setPo] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const canDecide = session?.selectedOrganization?.organizationId === order.organizationId && session?.capabilities.canAcceptLabServiceQuotes === true && status === 'Issued' && ['PlacedAwaitingSamples', 'InProgress', 'ResultsAvailable'].includes(order.status)
  const requiresPo = session?.selectedDepartment?.purchaseOrderRequired === true
  const scope = readScope(quote)
  const save = useMutation({ mutationFn: async () => {
    if (!decision || status !== 'Issued') throw new Error('The quote is no longer available for a decision.')
    return decision.kind === 'accept' ? acceptLabQuote(order.id, quote.id, decision.version, po) : declineLabChangeQuote(order.id, quote.id, decision.version)
  }, onSuccess: async () => { await onSaved(); setDecision(null); setPo(''); setConfirmed(false) } })
  const download = useMutation({ mutationFn: () => downloadLabQuotePdf(order.id, order.orderNumber, quote) })
  if (!scope) return <Alert><AlertTitle>Change quote requires review</AlertTitle><AlertDescription>The saved scope is unavailable. Contact Phaeno.</AlertDescription></Alert>
  return <Card className="mb-5"><CardHeader><CardTitle>Change quote · revision {quote.revision} · {status}</CardTitle></CardHeader><CardContent className="space-y-3">
    <ul className="list-inside list-disc">{scope.additionalSources.map(source => <li key={source.biologicalSource}>{source.specimenCount} additional samples · {source.biologicalSource}</li>)}</ul>
    <p>Additional {quote.taxDecisionSnapshotJson ? 'total' : 'subtotal before tax'}: <strong>{money(quote.total)}</strong>. Original agreement and existing work are retained.</p>
    <p className="text-sm">Expires {new Date(quote.expiresAt).toLocaleString()}.</p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => download.mutate()} disabled={download.isPending}>Download Change quote</Button>
      {canDecide ? <><Button onClick={() => { save.reset(); setDecision({ kind: 'accept', version: order.version }) }}>Review and accept addition</Button><Button variant="outline" onClick={() => { save.reset(); setDecision({ kind: 'decline', version: order.version }) }}>Decline addition</Button></> : null}</div>
    {download.error ? <p role="alert">{getOrderErrorMessage(download.error, 'Download failed. Try again.')}</p> : null}
    <Dialog open={decision !== null} onOpenChange={value => { if (!value && !save.isPending && (!po || window.confirm('Discard the unsaved purchase order number?'))) { setDecision(null); setPo(''); setConfirmed(false) } }}><DialogContent>
      <DialogHeader><DialogTitle>{decision?.kind === 'accept' ? 'Accept additional scope' : 'Decline additional scope'}</DialogTitle><DialogDescription>Revision {quote.revision}: {scope.additionalSources.reduce((sum, source) => sum + source.specimenCount, 0)} additional samples for {money(quote.total)}{quote.taxDecisionSnapshotJson ? ' including tax' : ' before tax'}. The original agreement remains in effect.</DialogDescription></DialogHeader>
      {decision?.kind === 'accept' ? <><Label htmlFor={`change-po-${quote.id}`}>Purchase order number{requiresPo ? ' *' : ''}</Label><Input id={`change-po-${quote.id}`} value={po} maxLength={255} onChange={event => setPo(event.target.value)} disabled={save.isPending} />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={save.isPending} />I accept this additional scope and price. Additional laboratory work requires finalizing the new sample list.</label></> : null}
      {save.error ? <Alert variant="destructive"><AlertTitle>Decision was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(save.error, 'Refresh the Job and review the quote again.')}</AlertDescription></Alert> : null}
      <RequiredDialogFooter><Button variant="outline" disabled={save.isPending} onClick={() => { setDecision(null); setPo(''); setConfirmed(false) }}>Cancel</Button><Button disabled={save.isPending || status !== 'Issued' || decision?.kind === 'accept' && (!confirmed || requiresPo && !po.trim())} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : decision?.kind === 'accept' ? 'Accept addition' : 'Decline addition'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog>
  </CardContent></Card>
}

function readScope(quote: Quote): { additionalSources: Array<{ biologicalSource: string; specimenCount: number }> } | null {
  try { const value = JSON.parse(quote.changeScopeSnapshotJson ?? 'null'); return Array.isArray(value?.additionalSources) ? value : null } catch { return null }
}
function acceptedCatalogIds(quote: Quote | undefined): string[] {
  try {
    const lines: unknown = JSON.parse(quote?.linesJson ?? '[]')
    if (!Array.isArray(lines)) return []
    return lines.flatMap(line => typeof line?.catalogItemId === 'string' ? [line.catalogItemId] : [])
  } catch { return [] }
}
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
