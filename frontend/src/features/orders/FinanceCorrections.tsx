import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useId, useRef, useState, type ReactNode } from 'react'
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
import { FinanceField, FinanceValidationSummary, financeTextareaClass, validFinanceDate } from './FinanceFormFields'
import { useOrderDraftGuard } from './use-order-draft-guard'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const date = (value: string) => new Date(value).toLocaleString()
const reason = z.string().trim().min(1, 'Reason is required.').max(2000, 'Use 2,000 characters or fewer.')
const sourceName = (value: string) => ({ PaymentReceipt: 'Receipt', PaymentAllocation: 'Allocation', PaymentAllocationReversal: 'Allocation reversal', InvoiceAdjustment: 'Invoice adjustment' })[value] ?? value

function useCorrectionReview<T>(initial: T, load: () => Promise<T>, onSaved: () => Promise<void>, onClose: () => void) {
  const [record, setRecord] = useState(initial)
  const [reviewNeeded, setReviewNeeded] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const reload = useMutation({ mutationFn: load })
  const save = useMutation({ mutationFn: (perform: (current: T) => Promise<unknown>) => perform(record),
    onSuccess: async () => { await onSaved(); onClose() },
    onError: error => { if (isOrderConcurrencyError(error)) { setReviewNeeded(true); setReviewed(false); reload.mutate() } },
  })
  const review = () => { if (reload.data) { setRecord(reload.data); setReviewNeeded(false); setReviewed(true); save.reset(); reload.reset() } }
  return { record, save, reload, reviewNeeded, reviewed, review, busy: save.isPending || reload.isPending }
}

function CorrectionFeedback<T>({ state, describe }: { state: ReturnType<typeof useCorrectionReview<T>>; describe: (record: T) => ReactNode }) {
  return state.reviewNeeded ? <Alert variant="destructive"><AlertTitle>The record changed before this action was saved</AlertTitle><AlertDescription><p>Your entries are retained. Review the current record before trying again.</p>{state.reload.isPending ? <p role="status">Loading current Finance record…</p> : state.reload.error ? <><p>{getOrderErrorMessage(state.reload.error, 'The current record could not be loaded.')}</p><Button type="button" variant="outline" onClick={() => state.reload.mutate()}>Retry current record</Button></> : state.reload.data ? <div className="space-y-2">{describe(state.reload.data)}<Button type="button" variant="outline" onClick={state.review}>Use reviewed record</Button></div> : null}</AlertDescription></Alert>
    : state.save.error ? <Alert variant="destructive"><AlertTitle>Action was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(state.save.error, 'Try again. Your entered values are retained.')}</AlertDescription></Alert>
      : state.reviewed ? <p role="status" className="text-sm">The current record is loaded. Check your retained entries before saving again.</p> : null
}

function CorrectionDialog({ title, description, busy, dirty, disabled, returnFocus, onClose, onSubmit, feedback, children }: {
  title: string; description: string; busy: boolean; dirty: boolean; disabled: boolean; returnFocus: HTMLElement | null
  onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; feedback: ReactNode; children: ReactNode
}) {
  const id = useId()
  useOrderDraftGuard(dirty, busy)
  function close() { if (!busy && (!dirty || window.confirm('Discard unsaved Finance changes?'))) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-2xl" onCloseAutoFocus={event => { event.preventDefault(); returnFocus?.focus() }}>
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    <DialogFeedback>{feedback}</DialogFeedback>
    <form id={id} noValidate onSubmit={onSubmit}><fieldset disabled={busy} className="space-y-4">{children}</fieldset></form>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button type="submit" form={id} disabled={busy || disabled}>{busy ? 'Saving…' : title}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

export function AllocationReversalDialog({ initial, returnFocus, onClose, onSaved }: { initial: finance.PaymentAllocationHistory; returnFocus: HTMLElement | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const state = useCorrectionReview(initial, async () => {
    const current = (await finance.listPaymentAllocations(initial.receipt.id)).find(item => item.allocation.id === initial.allocation.id)
    if (!current) throw new Error('This allocation is no longer available. Close the action and review receipt history.')
    return current
  }, onSaved, onClose)
  const form = useForm<{ reason: string }>({ resolver: zodResolver(z.object({ reason })), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { reason: '' } })
  const blocked = state.record.allocation.isReversed || state.record.receipt.status === 'Reversed'
  const summary = (record: finance.PaymentAllocationHistory) => <p>{record.receipt.receiptNumber} → {record.invoice.invoiceNumber} · {money(record.allocation.amount)} · {record.allocation.isReversed ? 'Already reversed' : 'Applied'} · receipt {money(record.receipt.unappliedAmount)} unapplied · invoice {money(record.invoice.balance)} outstanding.</p>
  return <CorrectionDialog title="Reverse allocation" description="Return this amount to unapplied cash and restore the invoice balance. The original allocation remains in history." busy={state.busy} dirty={form.formState.isDirty} disabled={state.reviewNeeded || blocked} returnFocus={returnFocus} onClose={onClose}
    feedback={<><CorrectionFeedback state={state} describe={summary} />{blocked ? <p role="alert">This allocation can no longer be reversed.</p> : null}</>}
    onSubmit={form.handleSubmit(values => { if (!state.busy && !state.reviewNeeded && !blocked) state.save.mutate(record => finance.reversePaymentAllocation(record.allocation.id, { reason: values.reason, allocationVersion: record.allocation.version, receiptVersion: record.receipt.version, invoiceVersion: record.invoice.version })) })}>
    {summary(state.record)}<FinanceField id="allocation-reversal-reason" label="Reason" required error={form.formState.errors.reason?.message}><textarea required className={financeTextareaClass} {...form.register('reason', { onChange: () => { if (form.formState.errors.reason) void form.trigger('reason') } })} /></FinanceField>
  </CorrectionDialog>
}

export function FinanceAllocationHistory({ receiptId, apiEnabled, onSaved }: { receiptId: string; apiEnabled: boolean; onSaved: () => Promise<void> }) {
  const history = useQuery({ queryKey: ['accounts-receivable', 'allocations', receiptId], queryFn: () => finance.listPaymentAllocations(receiptId), enabled: apiEnabled })
  const [selected, setSelected] = useState<finance.PaymentAllocationHistory | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  return <section className="space-y-3"><h2 className="font-semibold">Allocation history</h2>{history.isLoading ? <p role="status">Loading allocations…</p> : history.error ? <ReadFailure error={history.error} retry={() => { void history.refetch() }} /> : !history.data?.length ? <p className="text-sm text-muted-foreground">No allocations have been recorded for this receipt.</p> : <div className="divide-y">{history.data.map(item => <div key={item.allocation.id} className="space-y-2 py-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-medium">{item.invoice.invoiceNumber} · {money(item.allocation.amount)} · {item.allocation.isReversed ? 'Reversed' : 'Applied'}</p>{!item.allocation.isReversed && item.receipt.status !== 'Reversed' ? <Button variant="outline" disabled={!apiEnabled} onClick={event => { opener.current = event.currentTarget; setSelected(item) }}>Reverse allocation</Button> : null}</div><p>Allocated by {item.allocatedByName} · {date(item.allocation.allocatedAtUtc)}</p>{item.allocation.isReversed ? <p>Reversed by {item.reversedByName ?? 'Former operator'} · {item.allocation.reversedAtUtc ? date(item.allocation.reversedAtUtc) : ''} · {item.allocation.reversalReason}</p> : null}</div>)}</div>}{selected ? <AllocationReversalDialog initial={selected} returnFocus={opener.current} onClose={() => setSelected(null)} onSaved={onSaved} /> : null}</section>
}

type ReconciliationValues = { periodEnd: string; bankTotal: string; included: string[]; reason: string }
export function ReconciliationDraftDialog({ initial, receipts, cancel, returnFocus, onClose, onSaved }: { initial: finance.ReconciliationDetail; receipts: finance.PaymentReceipt[]; cancel: boolean; returnFocus: HTMLElement | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const state = useCorrectionReview(initial, () => finance.getReconciliation(initial.batch.id), onSaved, onClose)
  const choices = [...state.record.receipts, ...receipts.filter(item => !state.record.receipts.some(value => value.id === item.id))]
  const schema = z.object({ periodEnd: z.string(), bankTotal: z.string(), included: z.array(z.string()), reason }).superRefine((value, context) => {
    if (cancel) return
    if (!validFinanceDate(value.periodEnd)) context.addIssue({ code: 'custom', path: ['periodEnd'], message: 'Enter a valid period end date.' })
    if (!/^\d+(\.\d{1,2})?$/.test(value.bankTotal) || !Number.isFinite(Number(value.bankTotal))) context.addIssue({ code: 'custom', path: ['bankTotal'], message: 'Enter a bank total of zero or greater with up to two decimal places.' })
    if (!value.included.length) context.addIssue({ code: 'custom', path: ['included'], message: 'Select at least one receipt.' })
    if (value.included.some(id => !choices.some(item => item.id === id && item.status !== 'Reversed'))) context.addIssue({ code: 'custom', path: ['included'], message: 'Remove unavailable or reversed receipts before saving.' })
  })
  const form = useForm<ReconciliationValues>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { periodEnd: initial.batch.periodEnd, bankTotal: String(initial.batch.bankTotal), included: initial.items.filter(item => item.sourceType === 'PaymentReceipt').map(item => item.sourceId), reason: '' } })
  const errors = form.formState.errors
  const summary = (record: finance.ReconciliationDetail) => <p>{record.batch.batchNumber} · {record.batch.status} · period {record.batch.periodEnd} · ledger {money(record.batch.ledgerReceiptTotal)} · bank {money(record.batch.bankTotal)} · difference {money(record.batch.difference)} · {record.items.filter(item => item.sourceType === 'PaymentReceipt').length} receipts.</p>
  const blocked = state.record.batch.status !== 'Draft'
  const included = form.watch('included')
  const selectedTotal = choices.filter(item => included.includes(item.id)).reduce((total, item) => total + item.amount, 0)
  return <CorrectionDialog title={cancel ? 'Cancel reconciliation draft' : 'Save draft changes'} description={cancel ? 'Keep this draft and its history, and stop further reconciliation actions. Receipts, allocations and invoices are unchanged.' : 'Correct the draft before submission. A reason is retained with the before and after values. Previous draft editors cannot independently approve this batch.'} busy={state.busy} dirty={form.formState.isDirty} disabled={state.reviewNeeded || blocked || !form.formState.isDirty} returnFocus={returnFocus} onClose={onClose}
    feedback={<><CorrectionFeedback state={state} describe={summary} />{blocked ? <p role="alert">Only a draft reconciliation can be edited or cancelled.</p> : null}</>}
    onSubmit={form.handleSubmit(values => { if (state.busy || state.reviewNeeded || blocked) return; state.save.mutate(record => cancel ? finance.cancelReconciliationDraft(record.batch.id, record.batch.version, values.reason) : finance.editReconciliationDraft(record.batch.id, { version: record.batch.version, reason: values.reason, periodEnd: values.periodEnd, bankTotal: Number(values.bankTotal), paymentReceiptIds: values.included, paymentAllocationIds: record.items.filter(item => item.sourceType === 'PaymentAllocation').map(item => item.sourceId), invoiceAdjustmentIds: record.items.filter(item => item.sourceType === 'InvoiceAdjustment').map(item => item.sourceId) })) })}>
    {summary(state.record)}<FinanceValidationSummary errors={Object.entries(errors).flatMap(([name, error]) => error?.message ? [{ name, message: String(error.message) }] : [])} focus={name => form.setFocus(name as keyof ReconciliationValues)} />
    {!cancel ? <><FinanceField id="draft-period-end" label="Period end" required error={errors.periodEnd?.message}><Input required type="date" {...form.register('periodEnd')} /></FinanceField><FinanceField id="draft-bank-total" label="Bank total (USD)" required error={errors.bankTotal?.message}><Input required type="number" min="0" step="0.01" {...form.register('bankTotal')} /></FinanceField><fieldset className="space-y-2" aria-describedby={errors.included ? 'draft-included-error' : undefined}><legend className="mb-2"><RequiredFieldName>Included receipts</RequiredFieldName></legend>{choices.filter(item => item.status !== 'Reversed' || included.includes(item.id)).map(item => <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" value={item.id} {...form.register('included', { onChange: () => { if (errors.included) void form.trigger('included') } })} />{item.receiptNumber} · {item.payer} · {money(item.amount)}{item.status === 'Reversed' ? ' · Reversed; remove from this draft' : ''}</label>)}{errors.included ? <FieldError id="draft-included-error">{errors.included.message}</FieldError> : null}</fieldset><p className="text-sm">Selected receipts: {money(selectedTotal)}. Allocation and invoice-adjustment source links already included in this batch are retained.</p></> : null}
    <FinanceField id="draft-change-reason" label="Reason" required error={errors.reason?.message}><textarea required className={financeTextareaClass} {...form.register('reason', { onChange: () => { if (errors.reason) void form.trigger('reason') } })} /></FinanceField>
  </CorrectionDialog>
}

export function FinanceReconciliationDetails({ batchId, apiEnabled, canManageCash, onSaved }: { batchId: string; apiEnabled: boolean; canManageCash: boolean; onSaved: () => Promise<void> }) {
  const detail = useQuery({ queryKey: ['accounts-receivable', 'reconciliation-detail', batchId], queryFn: () => finance.getReconciliation(batchId), enabled: apiEnabled })
  const receipts = useQuery({ queryKey: ['accounts-receivable', 'reconciliation-choices'], queryFn: () => finance.listPaymentReceipts(), enabled: apiEnabled && canManageCash && detail.data?.batch.status === 'Draft' })
  const [edit, setEdit] = useState<{ record: finance.ReconciliationDetail; cancel: boolean } | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  return <section className="space-y-4">{detail.isLoading ? <p role="status">Loading reconciliation detail…</p> : detail.error ? <ReadFailure error={detail.error} retry={() => { void detail.refetch() }} /> : detail.data ? <><h2 className="font-semibold">Included sources</h2>{detail.data.items.length ? <ul className="space-y-2 text-sm">{detail.data.items.map(item => <li key={`${item.sourceType}-${item.sourceId}`}>{sourceName(item.sourceType)} · {item.reference} · {money(item.amount)}</li>)}</ul> : <p className="text-sm">No sources in this batch.</p>}{canManageCash && detail.data.batch.status === 'Draft' ? <><div className="flex flex-wrap gap-3"><Button variant="outline" disabled={!apiEnabled || receipts.isLoading || receipts.isError} onClick={event => { opener.current = event.currentTarget; setEdit({ record: detail.data, cancel: false }) }}>Edit draft</Button><Button variant="outline" disabled={!apiEnabled} onClick={event => { opener.current = event.currentTarget; setEdit({ record: detail.data, cancel: true }) }}>Cancel draft</Button></div>{receipts.error ? <ReadFailure error={receipts.error} retry={() => { void receipts.refetch() }} /> : null}</> : null}{detail.data.changes.length ? <><h2 className="font-semibold">Draft change history</h2><ol className="space-y-3 text-sm">{detail.data.changes.map((item, index) => <li key={`${item.change.atUtc}-${index}`}><p>{item.change.action} by {item.actorName} · {date(item.change.atUtc)}</p><p>{item.change.reason}</p>{item.change.action === 'Edited' ? <p>Period: {item.change.before.periodEnd} → {item.change.after.periodEnd}. Bank: {money(item.change.before.bankTotal)} → {money(item.change.after.bankTotal)}. Ledger: {money(item.change.before.ledgerReceiptTotal)} → {money(item.change.after.ledgerReceiptTotal)}.</p> : null}</li>)}</ol></> : null}</> : null}{edit ? <ReconciliationDraftDialog initial={edit.record} receipts={receipts.data ?? []} cancel={edit.cancel} returnFocus={opener.current} onClose={() => setEdit(null)} onSaved={onSaved} /> : null}</section>
}

function ReadFailure({ error, retry }: { error: unknown; retry: () => void }) {
  return <Alert variant="destructive"><AlertTitle>Finance detail is unavailable</AlertTitle><AlertDescription><p>{getOrderErrorMessage(error, 'Try again.')}</p><Button variant="outline" onClick={retry}>Retry detail</Button></AlertDescription></Alert>
}
