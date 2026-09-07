import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import * as finance from '#/api/pseq-order-to-cash'
import { getOrderErrorMessage, isOrderConcurrencyError } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { FieldError } from '#/components/ui/field'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { BillingConfigurationCard } from './BillingConfigurationCard'
import { FinanceField, FinanceValidationSummary, financeSelectClass, financeTextareaClass, validFinanceDate } from './FinanceFormFields'
import { useOrderDraftGuard } from './use-order-draft-guard'

export type FinanceAction = 'receipt' | 'allocation' | 'reversal' | 'adjustment' | 'billing' | 'reconciliation'
const today = () => new Date().toISOString().slice(0, 10)
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const labels = { receipt: 'Record receipt', allocation: 'Allocate payment', reversal: 'Reverse receipt', adjustment: 'Record adjustment', billing: 'Customer billing and tax', reconciliation: 'Create reconciliation' }
const receiptFields = [{ name: 'externalId', label: 'External reference' }, { name: 'payer', label: 'Payer' }, { name: 'amount', label: 'Amount (USD)', type: 'number' }, { name: 'receivedOn', label: 'Received date', type: 'date' }, { name: 'method', label: 'Payment method' }, { name: 'bankReference', label: 'Bank reference' }, { name: 'memo', label: 'Note (optional)' }] as const
const valuesSchema = z.object({ organizationId: z.string(), externalId: z.string(), payer: z.string(), amount: z.string(), receivedOn: z.string(), method: z.string(), bankReference: z.string(), memo: z.string(), evidence: z.custom<File | null>(), invoiceId: z.string(), reason: z.string(), adjustmentKind: z.enum(['Credit', 'Debit', 'WriteOff']), periodEnd: z.string(), bankTotal: z.string(), included: z.array(z.string()) })
type Values = z.infer<typeof valuesSchema>

export function FinanceActionDialog({ action, apiEnabled, customerId, customers, receipts, invoice: initialInvoice, payment: initialPayment, customer, returnFocus, onClose, onSaved }: {
  action: FinanceAction; apiEnabled: boolean; customerId: string; customers: finance.AccountsReceivableCustomer[]; receipts: finance.PaymentReceipt[]
  invoice?: finance.InvoiceReceivable; payment?: finance.PaymentReceipt; customer?: finance.AccountsReceivableCustomer
  returnFocus: HTMLElement | null; onClose: () => void; onSaved: () => Promise<void>
}) {
  const client = useQueryClient()
  const [billingDirty, setBillingDirty] = useState(false)
  const [billingBusy, setBillingBusy] = useState(false)
  const [{ invoice, payment }, setRecord] = useState(() => ({ invoice: initialInvoice, payment: initialPayment }))
  const [matchingInvoice, setMatchingInvoice] = useState<finance.InvoiceReceivable>()
  const [reviewNeeded, setReviewNeeded] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const suggestions = useQuery({ queryKey: ['accounts-receivable', 'matching', payment?.id], queryFn: () => finance.listMatchingInvoices(payment!.id), enabled: apiEnabled && action === 'allocation' && Boolean(payment) })
  const reload = useMutation({ mutationFn: async () => {
    if (action === 'adjustment' && invoice) {
      const current = (await finance.listInvoices(false, invoice.id)).find(item => item.id === invoice.id)
      if (!current) throw new Error('This invoice is no longer available. Your entered values are retained.')
      return { invoice: current, payment, matching: matchingInvoice, matches: undefined }
    }
    if ((action === 'allocation' || action === 'reversal') && payment) {
      const [currentReceipts, matches] = await Promise.all([finance.listPaymentReceipts(false, payment.id), action === 'allocation' ? finance.listMatchingInvoices(payment.id) : Promise.resolve([])])
      const current = currentReceipts.find(item => item.id === payment.id)
      if (!current) throw new Error('This receipt is no longer available. Your entered values are retained.')
      return { invoice, payment: current, matching: matches.find(item => item.id === matchingInvoice?.id), matches }
    }
    throw new Error('Close this action and reopen the current record. Your entered values are retained until you close it.')
  } })
  const schema = valuesSchema.superRefine((values, context) => {
    const issue = (name: keyof Values, message: string) => context.addIssue({ code: 'custom', path: [name], message })
    const required = (name: keyof Values, label: string) => { if (!String(values[name]).trim()) issue(name, `${label} is required.`) }
    if (action === 'receipt') {
      for (const [name, label] of [['organizationId', 'Customer'], ['externalId', 'External reference'], ['payer', 'Payer'], ['method', 'Payment method'], ['bankReference', 'Bank reference']] as const) required(name, label)
      if (values.organizationId && !customers.some(value => value.organizationId === values.organizationId)) issue('organizationId', 'Select an available Customer.')
      if (!validFinanceDate(values.receivedOn)) issue('receivedOn', 'Enter a valid received date.')
      const evidence = values.evidence
      if (!evidence) issue('evidence', 'Attach receipt evidence.')
      else if (evidence.size > 10 * 1024 * 1024) issue('evidence', 'Receipt evidence must be 10 MB or smaller.')
      else if (!/\.(pdf|png|jpe?g|txt)$/i.test(evidence.name)) issue('evidence', 'Attach a PDF, PNG, JPEG or text file.')
    }
    if (action === 'receipt' || action === 'allocation' || action === 'adjustment') {
      const amount = Number(values.amount)
      if (!values.amount.trim() || !Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(values.amount)) issue('amount', 'Enter an amount greater than zero with no more than two decimal places.')
      if (action === 'allocation') {
        const matching = matchingInvoice?.id === values.invoiceId ? matchingInvoice : undefined
        if (!matching) issue('invoiceId', 'Select an available invoice for this Customer.')
        else if (amount > Math.min(payment?.unappliedAmount ?? 0, matching.balance)) issue('amount', 'Amount exceeds the available receipt or invoice balance.')
      }
    }
    if (action === 'reversal' || action === 'adjustment') required('reason', 'Reason')
    if (action === 'reconciliation') {
      if (!validFinanceDate(values.periodEnd)) issue('periodEnd', 'Enter a valid period end date.')
      if (!values.bankTotal.trim() || !/^\d+(\.\d{1,2})?$/.test(values.bankTotal) || !Number.isFinite(Number(values.bankTotal))) issue('bankTotal', 'Enter a bank total of zero or greater with no more than two decimal places.')
      if (!values.included.length) issue('included', 'Select at least one receipt.')
      else if (values.included.some(id => !receipts.some(receipt => receipt.id === id && receipt.status !== 'Reversed'))) issue('included', 'A selected receipt is unavailable. Review the current receipts.')
    }
  })
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { organizationId: customerId, externalId: '', payer: '', amount: '', receivedOn: today(), method: '', bankReference: '', memo: '', evidence: null, invoiceId: '', reason: '', adjustmentKind: 'Credit', periodEnd: today(), bankTotal: '', included: [] } })
  const receiptAttempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const save = useMutation({ mutationFn: async (values: Values) => {
    if (action === 'receipt') {
      const evidence = values.evidence!
      const input = { organizationId: values.organizationId, externalId: values.externalId.trim(), payer: values.payer.trim(), amount: Number(values.amount), currency: 'USD' as const, receivedOn: values.receivedOn, method: values.method.trim(), bankReference: values.bankReference.trim(), memo: values.memo.trim() }
      const fingerprint = JSON.stringify([input, evidence.name, evidence.size, evidence.lastModified])
      if (receiptAttempt.current?.fingerprint !== fingerprint) receiptAttempt.current = { fingerprint, key: crypto.randomUUID() }
      return finance.recordPaymentReceiptWithEvidence(input, evidence, receiptAttempt.current.key)
    }
    if (action === 'allocation' && payment) {
      const matching = matchingInvoice?.id === values.invoiceId ? matchingInvoice : undefined
      if (!matching) throw new Error('Refresh matching invoices before allocating.')
      return finance.allocatePayment(payment.id, { invoiceId: values.invoiceId, amount: Number(values.amount), receiptVersion: payment.version, invoiceVersion: matching.version })
    }
    if (action === 'reversal' && payment) return finance.reversePaymentReceipt(payment.id, payment.version, values.reason.trim())
    if (action === 'adjustment' && invoice) return finance.adjustInvoice(invoice.id, { kind: values.adjustmentKind, amount: Number(values.amount), reason: values.reason.trim(), invoiceVersion: invoice.version })
    if (action === 'reconciliation') return finance.createReconciliation({ periodEnd: values.periodEnd, bankTotal: Number(values.bankTotal), paymentReceiptIds: values.included, paymentAllocationIds: [], invoiceAdjustmentIds: [] })
    throw new Error('Select a current record before saving.')
  }, onSuccess: async () => { form.reset(); await onSaved(); onClose() }, onError: error => {
    if (isOrderConcurrencyError(error)) { setReviewNeeded(true); setReviewed(false); reload.mutate() }
  } })
  const busy = save.isPending || billingBusy || reload.isPending
  const dirty = form.formState.isDirty || billingDirty
  useOrderDraftGuard(dirty, busy)
  function requestClose() { if (!busy && (!dirty || window.confirm('Discard unsaved Finance changes?'))) onClose() }
  const errors = form.formState.errors
  const summary = Object.entries(errors).flatMap(([name, error]) => error?.message ? [{ name, message: String(error.message) }] : [])
  const eligibleReceipts = receipts.filter(item => item.status !== 'Reversed')
  const evidence = form.watch('evidence')
  const invoiceChoices = matchingInvoice ? [matchingInvoice, ...(suggestions.data ?? []).filter(item => item.id !== matchingInvoice.id)] : suggestions.data ?? []
  const recordBlocked = action === 'adjustment' && invoice && ['Voided', 'WrittenOff'].includes(invoice.status) ? 'This invoice can no longer be adjusted.'
    : action === 'reversal' && payment && (payment.status === 'Reversed' || payment.appliedAmount > 0) ? 'Only an unapplied receipt can be reversed.'
      : action === 'allocation' && payment && (payment.status === 'Reversed' || payment.unappliedAmount <= 0) ? 'This receipt has no available amount to allocate.' : null
  function reviewCurrentRecord() {
    if (!reload.data) return
    setRecord({ invoice: reload.data.invoice, payment: reload.data.payment }); setMatchingInvoice(reload.data.matching)
    if (action === 'allocation') {
      client.setQueryData(['accounts-receivable', 'matching', payment?.id], reload.data.matches)
      if (!reload.data.matching) form.setValue('invoiceId', '')
    }
    setReviewNeeded(false); setReviewed(true); save.reset(); reload.reset(); form.clearErrors()
  }
  const props = (name: keyof Values) => ({ ...form.register(name), onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { void form.register(name).onChange(event); if (form.getFieldState(name).error) void form.trigger(name) } })
  function chooseInvoice(value: string) {
    const selected = suggestions.data?.find(item => item.id === value)
    setMatchingInvoice(selected); form.setValue('invoiceId', value, { shouldDirty: true })
    if (form.getFieldState('invoiceId').error) {
      if (selected) form.clearErrors('invoiceId')
      else form.setError('invoiceId', { message: 'Select an available invoice for this Customer.' })
    }
  }
  return <Dialog open onOpenChange={open => { if (!open) requestClose() }}><DialogContent className="max-w-2xl" onCloseAutoFocus={event => { event.preventDefault(); returnFocus?.focus() }}>
    <DialogHeader><DialogTitle>{labels[action]}</DialogTitle><DialogDescription>{action === 'billing' ? 'Changes require a new Finance approval.' : 'Review the details before saving. Failed actions preserve your entered values.'}</DialogDescription></DialogHeader>
    <DialogFeedback>{reviewNeeded ? <Alert variant="destructive"><AlertTitle>The record changed before this action was saved</AlertTitle><AlertDescription><p>Your entered values are retained. Review the current record before saving again.</p>{reload.isPending ? <p role="status">Loading current Finance record…</p> : reload.error ? <><p>{getOrderErrorMessage(reload.error, 'The current record could not be loaded.')}</p><Button type="button" variant="outline" onClick={() => reload.mutate()}>Retry current record</Button></> : reload.data ? <div className="space-y-2">{reload.data.invoice ? <p>Current invoice: {reload.data.invoice.status} · {money(reload.data.invoice.balance)} outstanding.</p> : null}{reload.data.payment ? <p>Current receipt: {reload.data.payment.status} · {money(reload.data.payment.unappliedAmount)} unapplied.</p> : null}{action === 'allocation' ? <p>{reload.data.matching ? `Selected invoice: ${money(reload.data.matching.balance)} outstanding.` : 'The selected invoice is no longer available. Choose another invoice after reviewing.'}</p> : null}<Button type="button" variant="outline" onClick={reviewCurrentRecord}>Use reviewed record</Button></div> : null}</AlertDescription></Alert> : save.error ? <Alert variant="destructive"><AlertTitle>Action was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(save.error, 'Try again. Your entered values are retained.')}</AlertDescription></Alert> : reviewed ? <p role="status" className="text-sm">The current record is loaded. Check your retained entries, then save again.</p> : null}{recordBlocked ? <p role="alert" className="text-sm text-destructive">{recordBlocked}</p> : null}</DialogFeedback>
    {action === 'billing' && customer ? <BillingConfigurationCard apiEnabled={apiEnabled} customers={[customer]} customersLoading={false} initialOrganizationId={customer.organizationId} modal onDirtyChange={setBillingDirty} onBusyChange={setBillingBusy} /> : <form id="finance-action" noValidate onSubmit={form.handleSubmit(values => { if (apiEnabled && !busy && !reviewNeeded && !recordBlocked) save.mutate(values) })} className="space-y-4">
      <FinanceValidationSummary errors={summary} focus={name => form.setFocus(name as keyof Values)} />
      <fieldset disabled={busy} className="space-y-4">
        {action === 'adjustment' && invoice ? <p className="text-sm">{invoice.invoiceNumber} · {invoice.status} · {money(invoice.balance)} outstanding when reviewed.</p> : null}
        {action === 'reversal' && payment ? <p className="text-sm">{payment.receiptNumber} · {payment.payer} · {money(payment.unappliedAmount)} unapplied when reviewed.</p> : null}
        {action === 'receipt' ? <><FinanceField id="receipt-organization" label="Customer" required error={errors.organizationId?.message}><select required className={financeSelectClass} {...props('organizationId')}><option value="">Select Customer</option>{customers.map(item => <option key={item.organizationId} value={item.organizationId}>{item.organizationName}</option>)}</select></FinanceField><div className="grid gap-4 sm:grid-cols-2">{receiptFields.map(field => <FinanceField key={field.name} id={`receipt-${field.name}`} label={field.label} required={field.name !== 'memo'} error={errors[field.name]?.message}><Input required={field.name !== 'memo'} type={'type' in field ? field.type : 'text'} step={field.name === 'amount' ? '0.01' : undefined} {...props(field.name)} /></FinanceField>)}</div><FinanceField id="receipt-evidence" label="Receipt evidence" required error={errors.evidence?.message}><Input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" required ref={form.register('evidence').ref} name="evidence" onBlur={() => { void form.trigger('evidence') }} onChange={event => form.setValue('evidence', event.target.files?.[0] ?? null, { shouldDirty: true, shouldValidate: Boolean(errors.evidence) })} /></FinanceField>{evidence ? <p className="text-sm">Attached: {evidence.name}</p> : null}<p className="text-xs text-muted-foreground">PDF, PNG, JPEG or text, up to 10 MB. Evidence must pass file scanning before the receipt is recorded.</p></> : null}
        {action === 'allocation' ? <><p>{payment?.payer} · {money(payment?.unappliedAmount ?? 0)} available when reviewed</p>{suggestions.error ? <Alert variant="destructive"><AlertTitle>Matching invoices unavailable</AlertTitle><AlertDescription><Button type="button" variant="outline" onClick={() => { void suggestions.refetch() }}>Retry matching invoices</Button></AlertDescription></Alert> : null}<FinanceField id="allocation-invoice" label="Invoice" required error={errors.invoiceId?.message}><select required className={financeSelectClass} disabled={suggestions.isLoading || suggestions.isError || reviewNeeded} {...props('invoiceId')} onChange={event => chooseInvoice(event.target.value)}><option value="">Select a same-Customer invoice</option>{invoiceChoices.map(item => <option key={item.id} value={item.id}>{item.invoiceNumber} · {money(item.balance)}</option>)}</select></FinanceField>{!suggestions.isLoading && !suggestions.isError && !invoiceChoices.length ? <p>No open invoices for this Customer.</p> : null}</> : null}
        {action === 'adjustment' ? <FinanceField id="adjustment-kind" label="Adjustment" required error={errors.adjustmentKind?.message}><select required className={financeSelectClass} {...props('adjustmentKind')}><option value="Credit">Credit</option><option value="Debit">Debit</option><option value="WriteOff">Write-off</option></select></FinanceField> : null}
        {action === 'allocation' || action === 'adjustment' ? <FinanceField id="finance-amount" label="Amount (USD)" required error={errors.amount?.message}><Input required type="number" min="0.01" step="0.01" max={action === 'allocation' ? Math.min(payment?.unappliedAmount ?? 0, matchingInvoice?.balance ?? 0) : undefined} {...props('amount')} /></FinanceField> : null}
        {action === 'reversal' || action === 'adjustment' ? <FinanceField id="finance-reason" label="Reason" required error={errors.reason?.message}><textarea required className={financeTextareaClass} {...props('reason')} /></FinanceField> : null}
        {action === 'reconciliation' ? <><FinanceField id="reconciliation-period" label="Period end" required error={errors.periodEnd?.message}><Input required type="date" {...props('periodEnd')} /></FinanceField><FinanceField id="reconciliation-total" label="Bank total (USD)" required error={errors.bankTotal?.message}><Input required type="number" min="0" step="0.01" {...props('bankTotal')} /></FinanceField><fieldset className="space-y-2" aria-describedby={errors.included ? 'reconciliation-included-error' : undefined}><legend className="mb-2 font-medium"><RequiredFieldName>Included receipts</RequiredFieldName></legend>{eligibleReceipts.map(item => <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" value={item.id} aria-invalid={Boolean(errors.included)} {...form.register('included', { onChange: () => { if (errors.included) void form.trigger('included') } })} />{item.receiptNumber} · {customers.find(value => value.organizationId === item.organizationId)?.organizationName ?? 'Customer unavailable'} · {money(item.amount)}</label>)}{!eligibleReceipts.length ? <p className="text-sm text-muted-foreground">No eligible receipts are available. Record a receipt before creating a reconciliation.</p> : null}{errors.included ? <FieldError id="reconciliation-included-error">{errors.included.message}</FieldError> : null}</fieldset></> : null}
      </fieldset>
    </form>}
    <RequiredDialogFooter><Button variant="outline" disabled={busy} onClick={requestClose}>{action === 'billing' ? 'Close' : 'Cancel'}</Button>{action !== 'billing' ? <Button type="submit" form="finance-action" disabled={!apiEnabled || busy || reviewNeeded || Boolean(recordBlocked) || (action === 'reconciliation' && !eligibleReceipts.length)}>{save.isPending ? 'Saving…' : labels[action]}</Button> : null}</RequiredDialogFooter>
  </DialogContent></Dialog>
}
