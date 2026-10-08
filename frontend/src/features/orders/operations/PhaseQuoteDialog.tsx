import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { LabServiceOrder, OrderConfiguration, Quote, QuoteLineInput } from '#/api/order-management'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '#/components/ui/dialog'
import { Field, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { sampleServicePricing } from '../sample-service-pricing'
import { useOrderDraftGuard } from '../use-order-draft-guard'
import { usePhaseQuote } from './use-phase-quote'

const price = z.number().nonnegative().multipleOf(0.01).nullable()
const schema = z.object({
  catalogItemId: z.string().uuid('Select a laboratory service.'),
  expiresAt: z.string().refine(value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && Date.parse(`${value}T00:00:00Z`) > Date.now(), 'Choose a future expiration date.'),
  phases: z.array(z.object({ id: z.string().uuid(), unitPrice: price.refine(value => value !== null, 'Enter the price per sample.'),
    additionalRunPrice: price, turnaroundBusinessDays: z.number().int().min(1).max(365) })).min(1),
  pricingDecisionReason: z.string().trim().max(2000),
})
type Values = z.infer<typeof schema>
type FormValues = z.input<typeof schema>

export function PhaseQuoteDialog({ open, order, sourceQuote, catalogItems, onOpenChange, onSaved }: {
  open: boolean; order: LabServiceOrder; sourceQuote?: Quote | null; catalogItems: OrderConfiguration['catalogItems'];
  onOpenChange: (open: boolean) => void; onSaved: () => Promise<void>
}) {
  const scoped = Boolean(order.phaseScopes?.length)
  // Customer-originated single scopes use the same pricing model as Sales phases.
  const phases = scoped ? order.phaseScopes! : [{ id: order.id, name: 'Order pricing', sampleCount: order.requestedSpecimenCount,
    scope: { sources: order.sourceGroups, sequencingRunCount: order.requestedSequencingRunCount ?? order.requestedSpecimenCount, runsPerSample: null },
    proposedUnitPrice: order.proposedUnitPrice ?? null, proposedAdditionalRunPrice: null, pricingNote: order.priceProposalNote,
    turnaroundBusinessDays: sourceQuote?.deliveryTargetBusinessDays ?? null }]
  const offerings = catalogItems.filter(item => item.isActive && item.isPSeqLabService && item.salesUnit.toLowerCase() === 'specimen')
  const savedLines = readLines(sourceQuote)
  function defaults(): FormValues {
    const selectedItem = offerings.find(item => item.id === order.requestedCatalogItemId) ?? (offerings.length === 1 ? offerings[0] : undefined)
    return { catalogItemId: order.requestedCatalogItemId ?? savedLines[0]?.catalogItemId ?? selectedItem?.id ?? '', expiresAt: '', pricingDecisionReason: '',
      phases: phases.map(phase => { const lines = savedLines.filter(line => scoped ? line.phaseId === phase.id : !line.phaseId)
        const standard = lines.find(line => line.pricingComponent === 'StandardSample')
        const additional = lines.find(line => line.pricingComponent === 'AdditionalRun')
        return { id: phase.id, unitPrice: standard?.unitPrice ?? phase.proposedUnitPrice ?? selectedItem?.basePrice ?? null,
          additionalRunPrice: additional?.unitPrice ?? phase.proposedAdditionalRunPrice, turnaroundBusinessDays: standard?.turnaroundBusinessDays ?? phase.turnaroundBusinessDays ?? 14 } }) }
  }
  const form = useForm<FormValues, unknown, Values>({ resolver: zodResolver(schema), defaultValues: defaults(), mode: 'onBlur' })
  const [discardOpen, setDiscardOpen] = useState(false)
  const mutation = usePhaseQuote(order, onSaved, () => { form.reset(defaults()); onOpenChange(false) }, sourceQuote)
  useOrderDraftGuard(form.formState.isDirty && open, mutation.isPending)
  useEffect(() => { if (open && !form.formState.isDirty) form.reset(defaults()) }, [open, order.id, sourceQuote?.id, catalogItems, order.phaseScopes, form]) // eslint-disable-line react-hooks/exhaustive-deps
  const values = form.watch()
  const pricing = phases.map((phase, index) => sampleServicePricing(phase.sampleCount, phase.scope.sequencingRunCount, values.phases[index]?.unitPrice, values.phases[index]?.additionalRunPrice))
  const subtotal = pricing.every(row => row.subtotal !== null) ? pricing.reduce((sum, row) => sum + row.subtotal!, 0) : null
  const amended = phases.some((phase, index) => phase.proposedUnitPrice !== null && values.phases[index]?.unitPrice !== phase.proposedUnitPrice
    || pricing[index].additionalRuns > 0 && phase.proposedAdditionalRunPrice !== null && values.phases[index]?.additionalRunPrice !== phase.proposedAdditionalRunPrice)
  function discard() { form.reset(defaults()); mutation.reset(); setDiscardOpen(false); onOpenChange(false) }
  function close() { if (!mutation.isPending) { if (form.formState.isDirty) setDiscardOpen(true); else discard() } }
  async function submit(input: Values) {
    let missing = false
    phases.forEach((phase, index) => { if (phase.scope.sequencingRunCount > phase.sampleCount && input.phases[index].additionalRunPrice === null) {
      form.setError(`phases.${index}.additionalRunPrice`, { message: 'Enter the price per additional run.' }, { shouldFocus: true }); missing = true
    } })
    if (missing) return
    if (sourceQuote && !input.expiresAt) { form.setError('expiresAt', { message: 'Choose the replacement quote’s expiration date.' }, { shouldFocus: true }); return }
    if (amended && !input.pricingDecisionReason) { form.setError('pricingDecisionReason', { message: 'Explain changes to the proposed prices.' }, { shouldFocus: true }); return }
    const item = offerings.find(value => value.id === input.catalogItemId)
    if (!item) { form.setError('catalogItemId', { message: 'The requested service is unavailable. Review its catalog configuration before issuing pricing.' }, { shouldFocus: true }); return }
    mutation.mutate({ ...input, currency: item.currency, deliveryTargetBusinessDays: scoped ? undefined : input.phases[0].turnaroundBusinessDays,
      lines: input.phases.flatMap((phase, index): QuoteLineInput[] => {
        const scope = phases[index]
        const lines: QuoteLineInput[] = [{ catalogItemId: item.id, description: `${scope.name} · Standard sample service`, pricingComponent: 'StandardSample',
          phaseId: scoped ? phase.id : null, quantity: scope.sampleCount, unitPrice: phase.unitPrice!, turnaroundBusinessDays: scoped ? phase.turnaroundBusinessDays : null }]
        const extra = scope.scope.sequencingRunCount - scope.sampleCount
        if (extra > 0) lines.push({ catalogItemId: item.id, description: `${scope.name} · Additional sequencing runs`, pricingComponent: 'AdditionalRun',
          phaseId: scoped ? phase.id : null, quantity: extra, unitPrice: phase.additionalRunPrice! })
        return lines
      }) })
  }
  const numberOrNull = (value: string | number | null | undefined) => value == null || value === '' ? null : Number(value)
  return <>
    <Dialog open={open} onOpenChange={value => { if (!value) close() }}><DialogContent className="sm:max-w-3xl" showCloseButton={!mutation.isPending}>
      <DialogHeader><DialogTitle>{sourceQuote ? 'Reissue laboratory quote' : 'Review laboratory pricing'}</DialogTitle><DialogDescription>Review the sample price, additional-run price and turnaround for {phases.length > 1 ? 'each phase' : 'this order'}. Issue one quote for Customer acceptance.</DialogDescription></DialogHeader>
      <form id="phase-quote" noValidate onSubmit={form.handleSubmit(submit)} className="max-h-[65vh] space-y-5 overflow-y-auto px-1">
        <fieldset disabled={mutation.isPending} className="space-y-5">
          <Field><Label htmlFor="phase-quote-offering"><RequiredFieldName>Laboratory service</RequiredFieldName></Label><NativeSelect id="phase-quote-offering" {...form.register('catalogItemId')} disabled={Boolean(order.requestedCatalogItemId)} aria-invalid={Boolean(form.formState.errors.catalogItemId)} aria-describedby="phase-quote-offering-help phase-quote-offering-error"><option value="">Select a service</option>{order.requestedCatalogItemId && !offerings.some(item => item.id === order.requestedCatalogItemId) ? <option value={order.requestedCatalogItemId}>Requested service unavailable</option> : null}{offerings.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect>{order.requestedCatalogItemId ? <p id="phase-quote-offering-help" className="text-xs text-muted-foreground">The catalog service selected for this order is retained for pricing.</p> : null}<FieldError id="phase-quote-offering-error">{form.formState.errors.catalogItemId?.message}</FieldError></Field>
          {phases.map((phase, index) => <section key={phase.id} className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">{phases.length > 1 ? phase.name : 'Order pricing'}</h3>
            <p className="text-sm">{phase.sampleCount} standard sample services · {pricing[index].additionalRuns} additional runs · {phase.scope.sequencingRunCount} total runs</p>
            <p className="text-xs text-muted-foreground">Each sample includes one library preparation, one sequencing run and data assembly. Additional runs use its existing prepared library while material remains available.</p>
            <ul className="text-xs text-muted-foreground">{phase.scope.sources.map(source => <li key={source.biologicalSource}>{source.biologicalSource} · {source.specimenCount} samples</li>)}</ul>
            <p className="text-sm">Proposed sample price: {phase.proposedUnitPrice === null ? 'No price proposed' : money(phase.proposedUnitPrice)}{pricing[index].additionalRuns > 0 ? ` · Additional-run price: ${phase.proposedAdditionalRunPrice === null ? 'No price proposed' : money(phase.proposedAdditionalRunPrice)}` : ''}</p>
            {phase.pricingNote ? <p className="whitespace-pre-wrap text-sm">{phase.pricingNote}</p> : null}
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <Field><Label htmlFor={`phase-quote-price-${index}`}><RequiredFieldName>Final price per sample (USD)</RequiredFieldName></Label><Input id={`phase-quote-price-${index}`} type="number" min={0} step="0.01" {...form.register(`phases.${index}.unitPrice`, { setValueAs: numberOrNull })} aria-invalid={Boolean(form.formState.errors.phases?.[index]?.unitPrice)} aria-describedby={`phase-quote-price-${index}-error`} /><FieldError id={`phase-quote-price-${index}-error`}>{form.formState.errors.phases?.[index]?.unitPrice?.message}</FieldError></Field>
              {pricing[index].additionalRuns > 0 ? <Field><Label htmlFor={`phase-quote-extra-${index}`}><RequiredFieldName>Final price per additional run (USD)</RequiredFieldName></Label><Input id={`phase-quote-extra-${index}`} type="number" min={0} step="0.01" {...form.register(`phases.${index}.additionalRunPrice`, { setValueAs: numberOrNull })} aria-invalid={Boolean(form.formState.errors.phases?.[index]?.additionalRunPrice)} aria-describedby={`phase-quote-extra-${index}-error`} /><FieldError id={`phase-quote-extra-${index}-error`}>{form.formState.errors.phases?.[index]?.additionalRunPrice?.message}</FieldError></Field> : null}
              <Field><Label htmlFor={`phase-quote-tat-${index}`}><RequiredFieldName>Turnaround (business days)</RequiredFieldName></Label><Input id={`phase-quote-tat-${index}`} type="number" min={1} max={365} {...form.register(`phases.${index}.turnaroundBusinessDays`, { valueAsNumber: true })} aria-invalid={Boolean(form.formState.errors.phases?.[index]?.turnaroundBusinessDays)} aria-describedby={`phase-quote-tat-${index}-error`} /><FieldError id={`phase-quote-tat-${index}-error`}>{form.formState.errors.phases?.[index]?.turnaroundBusinessDays?.message}</FieldError></Field>
            </div>
            <p className="text-sm font-medium" aria-live="polite">Subtotal: {pricing[index].subtotal === null ? 'Complete both prices' : money(pricing[index].subtotal!)}</p>
          </section>)}
          <p className="text-xs text-muted-foreground">Turnaround starts when Phaeno physically receives every required tube for that scope. Business days exclude Phaeno holidays.</p>
          <Field><Label htmlFor="phase-quote-reason">{amended ? <RequiredFieldName>Price amendment reason</RequiredFieldName> : 'Pricing decision note (optional)'}</Label><Textarea id="phase-quote-reason" {...form.register('pricingDecisionReason')} aria-invalid={Boolean(form.formState.errors.pricingDecisionReason)} aria-describedby="phase-quote-reason-error" /><FieldError id="phase-quote-reason-error">{form.formState.errors.pricingDecisionReason?.message}</FieldError></Field>
          <Field><Label htmlFor="phase-quote-expiry">{sourceQuote ? <RequiredFieldName>Expiration date</RequiredFieldName> : 'Expiration override (optional)'}</Label><Input id="phase-quote-expiry" type="date" {...form.register('expiresAt')} aria-invalid={Boolean(form.formState.errors.expiresAt)} aria-describedby="phase-quote-expiry-error" /><FieldError id="phase-quote-expiry-error">{form.formState.errors.expiresAt?.message}</FieldError></Field>
        </fieldset>
        <p className="font-semibold">Quote subtotal: {subtotal === null ? 'Complete the prices' : money(subtotal)}</p><p className="text-xs text-muted-foreground">Tax follows the existing Finance rules.</p>
        {mutation.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(mutation.error, 'Pricing was retained. Refresh the order, review its current scope, and try again.')}</AlertDescription></Alert> : null}
      </form><RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="phase-quote" disabled={mutation.isPending || offerings.length === 0}>{mutation.isPending ? 'Issuing…' : sourceQuote ? 'Issue new revision' : 'Issue quote'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog>
    <Dialog open={discardOpen} onOpenChange={setDiscardOpen}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById('phase-quote-keep-editing')?.focus() }}><DialogHeader><DialogTitle>Discard unsaved prices?</DialogTitle></DialogHeader><div><DialogDescription>The sample prices, additional-run prices and turnaround edits in this form will be discarded.</DialogDescription></div><DialogFooter><Button id="phase-quote-keep-editing" variant="outline" onClick={() => setDiscardOpen(false)}>Keep editing</Button><Button variant="destructive" onClick={discard}>Discard changes</Button></DialogFooter></DialogContent></Dialog>
  </>
}
function readLines(quote?: Quote | null): QuoteLineInput[] { try { return quote ? JSON.parse(quote.linesJson) as QuoteLineInput[] : [] } catch { return [] } }
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
