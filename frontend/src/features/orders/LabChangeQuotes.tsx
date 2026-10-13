import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { GuardedFormDialog, ConfirmationFormContent } from '#/components/GuardedFormDialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState, type ReactNode } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { acceptLabQuote, declineLabChangeQuote, downloadLabQuotePdf, getOrderErrorMessage, issuePlatformQuote, type LabServiceOrder, type OrderConfiguration, type Quote } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Field } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
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
  const __customerText = useCustomerText()

  const [open, setOpen] = useState(false)
  const [reviewVersion, setReviewVersion] = useState(order.version)
  const accepted = order.quotes.find(quote => quote.purpose === 'Initial' && quote.status === 'Accepted')
  const acceptedIds = acceptedCatalogIds(accepted)
  const matched = catalogItems.filter(item => acceptedIds.includes(item.id) && item.isPSeqLabService && item.isActive && item.salesUnit.toLowerCase() === 'specimen')
  const catalog = matched.length === 1 ? matched[0] : undefined
  const form = useForm<z.input<typeof changeSchema>, unknown, z.output<typeof changeSchema>>({ resolver: zodResolver(changeSchema), defaultValues: { sources: [{ biologicalSource: '', specimenCount: 1 }], runs: '', unitPrice: catalog?.basePrice ?? 0, additionalRunPrice: null } })
  const { isDirty: __formDraftDirty } = form.formState

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
          ...(runs > quantity ? [{ catalogItemId: catalog.id, description: __customerText('m_e495d2a4de34'), quantity: runs - quantity, unitPrice: values.additionalRunPrice!, pricingComponent: 'AdditionalRun' as const }] : [])] })
    },
    onSuccess: async () => { await onSaved(); setOpen(false); form.reset() },
  })

  function openQuote() { setReviewVersion(order.version); change.reset(); setOpen(true) }
  return <>
    {renderTrigger ? renderTrigger(openQuote) : <Button variant="outline" onClick={openQuote}><CustomerText message="m_0a83102183ed" /></Button>}
    <GuardedFormDialog open={open} dirty={__formDraftDirty} pending={change.isPending} onOpenChange={value => { if (!value) { form.reset(); change.reset() }; setOpen(value) }}><DialogContent showCloseButton={!change.isPending} onCloseAutoFocus={onCloseFocus ? event => { event.preventDefault(); onCloseFocus() } : undefined}>
      <DialogHeader><DialogTitle><CustomerText message="m_70fac9b962be" /></DialogTitle><DialogDescription><CustomerText message="m_54429f16435a" /></DialogDescription></DialogHeader>
      <p className="text-sm">{catalog ? __customerText('m_b400b378f050', { p0: String(catalog.name) }) : __customerText('m_ddec6fc97777')}</p>
      <form id="change-quote" onSubmit={form.handleSubmit(values => { if (!change.isPending) change.mutate(values) })} className="space-y-4">
        <fieldset disabled={change.isPending} className="space-y-4">
          {sources.fields.map((field, index) => <div key={field.id} className="space-y-2 rounded-md border p-3">
            <Field><Label htmlFor={`change-source-${index}`}><RequiredFieldName><CustomerText message="m_62cda8311410" /></RequiredFieldName></Label><Input id={`change-source-${index}`} {...form.register(`sources.${index}.biologicalSource`)} aria-required aria-invalid={Boolean(form.formState.errors.sources?.[index]?.biologicalSource)} aria-describedby={`change-source-error-${index}`} />
            <p id={`change-source-error-${index}`} role="alert" className="text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.sources?.[index]?.biologicalSource?.message} />}</p>
            </Field><Field><Label htmlFor={`change-count-${index}`}><RequiredFieldName><CustomerText message="m_7da418252ec3" /></RequiredFieldName></Label><Input id={`change-count-${index}`} type="number" min={1} max={10000} {...form.register(`sources.${index}.specimenCount`)} aria-required aria-invalid={Boolean(form.formState.errors.sources?.[index]?.specimenCount)} aria-describedby={`change-count-error-${index}`} />
            <p id={`change-count-error-${index}`} role="alert" className="text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.sources?.[index]?.specimenCount?.message} />}</p>
            </Field>{sources.fields.length > 1 ? <Button type="button" variant="ghost" onClick={() => sources.remove(index)}><CustomerText message="m_5339824edc7c" />{index + 1}</Button> : null}
          </div>)}
          <Button type="button" variant="outline" onClick={() => sources.append({ biologicalSource: '', specimenCount: 1 })}><CustomerText message="m_b117e4f52915" /></Button>
          <Field><Label htmlFor="change-runs"><CustomerText message="m_208c931edc2f" /></Label><Input id="change-runs" type="number" min={1} max={10000} step={1} placeholder={__customerText('m_91f10d0b47fd')} {...form.register('runs')} aria-invalid={Boolean(form.formState.errors.runs)} aria-describedby="change-runs-help" />
          <p id="change-runs-help" className="text-xs text-muted-foreground">{form.formState.errors.runs?.message ?? 'Leave blank for one run per new sample. Allocate these runs when identifying the additional samples.'}</p>
          </Field><Field><Label htmlFor="change-price"><RequiredFieldName><CustomerText message="m_9ddc78e7a54d" /></RequiredFieldName></Label><Input id="change-price" type="number" min="0.01" step="0.01" {...form.register('unitPrice')} aria-required aria-invalid={Boolean(form.formState.errors.unitPrice)} aria-describedby="change-price-error" />
          <p id="change-price-error" role="alert" className="text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.unitPrice?.message} />}</p>
          <p className="text-xs text-muted-foreground"><CustomerText message="m_98e15dbb153c" /></p>
          <p className="text-xs text-muted-foreground"><CustomerText message="m_1bf9d1b9f07a" /></p>
          </Field>
          {pricing.additionalRuns > 0 ? <Field><Label htmlFor="change-extra-price"><RequiredFieldName><CustomerText message="m_f983968eda19" /></RequiredFieldName></Label><Input id="change-extra-price" type="number" min={0} step="0.01" {...form.register('additionalRunPrice', { setValueAs: value => value === '' ? null : Number(value) })} aria-required aria-invalid={Boolean(form.formState.errors.additionalRunPrice)} aria-describedby="change-extra-price-error" /><p id="change-extra-price-error" role="alert" className="text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.additionalRunPrice?.message} />}</p><p className="text-xs text-muted-foreground"><CustomerText message="m_6225176916e1" /></p></Field> : null}
          <p className="text-sm">{sampleCount} <CustomerText message="m_2c0c2071d895" />{pricing.additionalRuns} <CustomerText message="m_53fbeae5c160" />{pricing.subtotal === null ? <CustomerSourceText source={"Complete the prices"} /> : money(pricing.subtotal)}</p>
        </fieldset>
      </form>
      {change.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_360dfa8a00f6" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(change.error, 'Refresh the Job and review the additional scope again.')} />}</AlertDescription></Alert> : null}
      <RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={change.isPending}><CustomerText message="m_19766ed6ccb2" /></Button></DialogClose><Button form="change-quote" type="submit" disabled={change.isPending || !catalog}>{change.isPending ? <CustomerSourceText source={"Issuing…"} /> : __customerText('m_0a83102183ed')}</Button></RequiredDialogFooter>
    </DialogContent></GuardedFormDialog>
  </>
}

export function LabChangeQuotes({ order, onSaved }: { order: LabServiceOrder; onSaved: () => Promise<void> }) {
  return <>{order.quotes.filter(quote => quote.purpose === 'Change').map(quote => <ChangeQuote key={quote.id} order={order} quote={quote} onSaved={onSaved} />)}</>
}

function ChangeQuote({ order, quote, onSaved }: { order: LabServiceOrder; quote: Quote; onSaved: () => Promise<void> }) {
  const __customerText = useCustomerText()

  const { session } = usePhaenoSession()
  const status = useQuoteStatus(quote)
  const [decision, setDecision] = useState<{ kind: 'accept' | 'decline'; version: number } | null>(null)
  const [po, setPo] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const openingDecision = useRef(false)
  const canDecide = session?.selectedOrganization?.organizationId === order.organizationId && session?.capabilities.canAcceptLabServiceQuotes === true && status === 'Issued' && ['PlacedAwaitingSamples', 'InProgress', 'ResultsAvailable'].includes(order.status)
  const requiresPo = session?.selectedDepartment?.purchaseOrderRequired === true
  const scope = readScope(quote)
  const save = useMutation({ mutationFn: async () => {
    if (!decision || !canDecide) throw new Error('The quote is no longer available for a decision.')
    return decision.kind === 'accept' ? acceptLabQuote(order.id, quote.id, decision.version, po) : declineLabChangeQuote(order.id, quote.id, decision.version)
  }, onSuccess: async () => { await onSaved(); setDecision(null); setPo(''); setConfirmed(false) } })
  const download = useMutation({ mutationFn: () => downloadLabQuotePdf(order.id, order.orderNumber, quote) })
  if (!scope) return <Alert><AlertTitle><CustomerText message="m_756b28e536f2" /></AlertTitle><AlertDescription><CustomerText message="m_6111ac0d187d" /></AlertDescription></Alert>
  return <Card className="mb-5"><CardHeader><CardTitle><CustomerText message="m_d020aa6a671f" />{quote.revision} · {status}</CardTitle></CardHeader><CardContent className="space-y-3">
    <ul className="list-inside list-disc">{scope.additionalSources.map(source => <li key={source.biologicalSource}>{source.specimenCount} <CustomerText message="m_98f7b97ec46e" />{source.biologicalSource}</li>)}</ul>
    <p><CustomerText message="m_3ad705e2d394" />{quote.taxDecisionSnapshotJson ? <CustomerSourceText source={"total"} /> : __customerText('m_3547ab7ff4b5')}: <strong>{money(quote.total)}</strong><CustomerText message="m_4a9ca80bb3b0" /></p>
    <p className="text-sm"><CustomerText message="m_d970e4fd1080" />{new Date(quote.expiresAt).toLocaleString()}.</p>
    <ActionMenu><DropdownMenuTrigger asChild><Button id={`change-quote-actions-${quote.id}`} ref={trigger} variant="outline" aria-label={__customerText('change_quote_actions', { p0: quote.revision })}><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={event => { if (openingDecision.current) { event.preventDefault(); openingDecision.current = false } }}>
        <DropdownMenuItem disabled={download.isPending} onSelect={() => download.mutate()}><CustomerText message="m_e38fc1f91494" /></DropdownMenuItem>
        {canDecide ? <><DropdownMenuItem onSelect={() => { openingDecision.current = true; save.reset(); setDecision({ kind: 'accept', version: order.version }) }}><CustomerText message="m_85d9ad205427" /></DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { openingDecision.current = true; save.reset(); setDecision({ kind: 'decline', version: order.version }) }}><CustomerText message="m_3b18fcd50b23" /></DropdownMenuItem></> : null}
      </DropdownMenuContent>
    </ActionMenu>
    {download.error ? <p role="alert">{<CustomerSourceText source={getOrderErrorMessage(download.error, 'Download failed. Try again.')} />}</p> : null}
    <GuardedFormDialog open={decision !== null} dirty={Boolean(po || confirmed)} pending={save.isPending} returnFocusId={`change-quote-actions-${quote.id}`} onOpenChange={value => { if (!value) { setDecision(null); setPo(''); setConfirmed(false); save.reset() } }}><ConfirmationFormContent showCloseButton={!save.isPending}>
      <DialogHeader><DialogTitle>{decision?.kind === 'accept' ? <CustomerSourceText source={"Accept additional scope"} /> : __customerText('m_13535c4c1073')}</DialogTitle></DialogHeader><div><DialogDescription><CustomerText message="m_e330d85ff901" />{quote.revision}: {scope.additionalSources.reduce((sum, source) => sum + source.specimenCount, 0)} <CustomerText message="m_6ae721f15343" />{money(quote.total)}{quote.taxDecisionSnapshotJson ? <CustomerSourceText source={" including tax"} /> : __customerText('m_655cea26fd58')}<CustomerText message="m_9371abde6552" /></DialogDescription></div>
      {decision?.kind === 'accept' ? <><Field><Label htmlFor={`change-po-${quote.id}`}>{requiresPo ? <RequiredFieldName><CustomerText message="m_65b4c1324e67" /></RequiredFieldName> : <CustomerText message="m_65b4c1324e67" />}</Label><Input id={`change-po-${quote.id}`} value={po} required={requiresPo} aria-required={requiresPo} maxLength={255} onChange={event => setPo(event.target.value)} disabled={save.isPending} /></Field>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={save.isPending} /><CustomerText message="m_13be0bc777b7" /></label></> : null}
      {save.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_02aa3710ee72" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(save.error, 'Refresh the Job and review the quote again.')} />}</AlertDescription></Alert> : null}
      <RequiredDialogFooter showLegend={decision?.kind === 'accept' && requiresPo}><DialogClose asChild><Button type="button" variant="outline" disabled={save.isPending}><CustomerText message="m_19766ed6ccb2" /></Button></DialogClose><Button type="button" disabled={save.isPending || !canDecide || status !== 'Issued' || decision?.kind === 'accept' && (!confirmed || requiresPo && !po.trim())} onClick={() => save.mutate()}>{save.isPending ? <CustomerSourceText source={"Saving…"} /> : decision?.kind === 'accept' ? "Accept addition" : __customerText('m_3b18fcd50b23')}</Button></RequiredDialogFooter>
    </ConfirmationFormContent></GuardedFormDialog>
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
