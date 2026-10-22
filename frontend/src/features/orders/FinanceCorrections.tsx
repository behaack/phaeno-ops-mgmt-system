import { formatDisplayTimestamp } from '#/lib/display-format'
import { NativeCheckbox } from '#/components/ui/native-checkbox'
import { CustomerSourceText, useCustomerSourceText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import * as finance from '#/api/pseq-order-to-cash'
import { getOrderErrorMessage, isOrderConcurrencyError } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { RecordPagination } from '#/components/RecordPagination'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { FieldError } from '#/components/ui/field'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { FinanceField, FinanceValidationSummary, financeTextareaClass, validFinanceDate } from './FinanceFormFields'
import { useOrderDraftGuard } from './use-order-draft-guard'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const date = (value: string) => formatDisplayTimestamp(value, { seconds: true })
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
  return state.reviewNeeded ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"The record changed before this action was saved"} /></AlertTitle><AlertDescription><p><CustomerSourceText source={"Your entries are retained. Review the current record before trying again."} /></p>{state.reload.isPending ? <p role="status"><CustomerSourceText source={"Loading current Finance record…"} /></p> : state.reload.error ? <><p>{<CustomerSourceText source={getOrderErrorMessage(state.reload.error, 'The current record could not be loaded.')} />}</p><Button type="button" variant="outline" onClick={() => state.reload.mutate()}><CustomerSourceText source={"Retry current record"} /></Button></> : state.reload.data ? <div className="space-y-2">{describe(state.reload.data)}<Button type="button" variant="outline" onClick={state.review}><CustomerSourceText source={"Use reviewed record"} /></Button></div> : null}</AlertDescription></Alert>
    : state.save.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Action was not saved"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(state.save.error, 'Try again. Your entered values are retained.')} />}</AlertDescription></Alert>
      : state.reviewed ? <p role="status" className="text-sm"><CustomerSourceText source={"The current record is loaded. Check your retained entries before saving again."} /></p> : null
}

function CorrectionDialog({ title, description, busy, dirty, disabled, returnFocus, onClose, onSubmit, feedback, children }: {
  title: string; description: string; busy: boolean; dirty: boolean; disabled: boolean; returnFocus: HTMLElement | null
  onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; feedback: ReactNode; children: ReactNode
}) {
  const id = useId()
  useOrderDraftGuard(dirty, busy)
  async function close() { if (!busy && (!dirty || (await confirmPortal('Discard unsaved Finance changes?')))) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-2xl" onCloseAutoFocus={event => { event.preventDefault(); returnFocus?.focus() }}>
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    <DialogFeedback>{feedback}</DialogFeedback>
    <form id={id} noValidate onSubmit={onSubmit}><fieldset disabled={busy} className="space-y-4">{children}</fieldset></form>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}><CustomerSourceText source={"Cancel"} /></Button><Button type="submit" form={id} disabled={busy || disabled}>{busy ? <CustomerSourceText source={"Saving…"} /> : title}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

export function AllocationReversalDialog({ initial, returnFocus, onClose, onSaved }: { initial: finance.PaymentAllocationHistory; returnFocus: HTMLElement | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const __customerSource = useCustomerSourceText()

  const state = useCorrectionReview(initial, async () => {
    const current = (await finance.listPaymentAllocations(initial.receipt.id)).find(item => item.allocation.id === initial.allocation.id)
    if (!current) throw new Error('This allocation is no longer available. Close the action and review receipt history.')
    return current
  }, onSaved, onClose)
  const form = useForm<{ reason: string }>({ resolver: zodResolver(z.object({ reason })), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { reason: '' } })
  const { isDirty: __formDraftDirty } = form.formState

  const blocked = state.record.allocation.isReversed || state.record.receipt.status === 'Reversed'
  const summary = (record: finance.PaymentAllocationHistory) => <p>{record.receipt.receiptNumber} → {record.invoice.invoiceNumber} · {money(record.allocation.amount)} · {record.allocation.isReversed ? <CustomerSourceText source={"Already reversed"} /> : <CustomerSourceText source={"Applied"} />} <CustomerSourceText source={"· receipt"} /> {money(record.receipt.unappliedAmount)} <CustomerSourceText source={"unapplied · invoice"} /> {money(record.invoice.balance)} <CustomerSourceText source={"outstanding."} /></p>
  return <CorrectionDialog title={__customerSource("Reverse allocation")} description="Return this amount to unapplied cash and restore the invoice balance. The original allocation remains in history." busy={state.busy} dirty={__formDraftDirty} disabled={state.reviewNeeded || blocked} returnFocus={returnFocus} onClose={onClose}
    feedback={<><CorrectionFeedback state={state} describe={summary} />{blocked ? <p role="alert"><CustomerSourceText source={"This allocation can no longer be reversed."} /></p> : null}</>}
    onSubmit={form.handleSubmit(values => { if (!state.busy && !state.reviewNeeded && !blocked) state.save.mutate(record => finance.reversePaymentAllocation(record.allocation.id, { reason: values.reason, allocationVersion: record.allocation.version, receiptVersion: record.receipt.version, invoiceVersion: record.invoice.version })) })}>
    {summary(state.record)}<FinanceField id="allocation-reversal-reason" label="Reason" required error={form.formState.errors.reason?.message}><textarea required className={financeTextareaClass} {...form.register('reason', { onChange: () => { if (form.formState.errors.reason) void form.trigger('reason') } })} /></FinanceField>
  </CorrectionDialog>
}

export function FinanceAllocationHistory({ receiptId, apiEnabled, onSaved }: { receiptId: string; apiEnabled: boolean; onSaved: () => Promise<void> }) {
  const history = useQuery({ queryKey: ['accounts-receivable', 'allocations', receiptId], queryFn: () => finance.listPaymentAllocations(receiptId), enabled: apiEnabled })
  const [selected, setSelected] = useState<finance.PaymentAllocationHistory | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  return <section className="space-y-3"><h2 className="font-semibold"><CustomerSourceText source={"Allocation history"} /></h2>{history.isLoading ? <p role="status"><CustomerSourceText source={"Loading allocations…"} /></p> : history.error ? <ReadFailure error={history.error} retry={() => { void history.refetch() }} /> : !history.data?.length ? <p className="text-sm text-muted-foreground"><CustomerSourceText source={"No allocations have been recorded for this receipt."} /></p> : <div className="divide-y">{history.data.map(item => <div key={item.allocation.id} className="space-y-2 py-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-medium">{item.invoice.invoiceNumber} · {money(item.allocation.amount)} · {item.allocation.isReversed ? <CustomerSourceText source={"Reversed"} /> : <CustomerSourceText source={"Applied"} />}</p>{!item.allocation.isReversed && item.receipt.status !== 'Reversed' ? <Button variant="outline" disabled={!apiEnabled} onClick={event => { opener.current = event.currentTarget; setSelected(item) }}><CustomerSourceText source={"Reverse allocation"} /></Button> : null}</div><p><CustomerSourceText source={"Allocated by"} /> {item.allocatedByName} · {date(item.allocation.allocatedAtUtc)}</p>{item.allocation.isReversed ? <p><CustomerSourceText source={"Reversed by"} /> {item.reversedByName ?? 'Former operator'} · {item.allocation.reversedAtUtc ? date(item.allocation.reversedAtUtc) : ''} · {item.allocation.reversalReason}</p> : null}</div>)}</div>}{selected ? <AllocationReversalDialog initial={selected} returnFocus={opener.current} onClose={() => setSelected(null)} onSaved={onSaved} /> : null}</section>
}

type ReconciliationValues = { periodEnd: string; bankTotal: string; included: string[]; reason: string }
export function ReconciliationDraftDialog({ initial, receipts, cancel, returnFocus, onClose, onSaved }: { initial: finance.ReconciliationDetail; receipts: finance.PaymentReceipt[]; cancel: boolean; returnFocus: HTMLElement | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const __customerSource = useCustomerSourceText()

  const [receiptSearch, setReceiptSearch] = useState('')
  const [receiptPage, setReceiptPage] = useState(1)
  const [selectedReceipts, setSelectedReceipts] = useState<finance.PaymentReceipt[]>([])
  const candidates = useQuery({ queryKey: ['accounts-receivable', 'draft-reconciliation-candidates', receiptSearch, receiptPage],
    queryFn: () => finance.listReceiptPage(false, undefined, undefined, receiptPage, receiptSearch, true), enabled: !cancel })
  const state = useCorrectionReview(initial, () => finance.getReconciliation(initial.batch.id), onSaved, onClose)
  const choices = [...new Map([...receipts, ...selectedReceipts, ...state.record.receipts, ...(candidates.data?.items ?? [])].map(receipt => [receipt.id, receipt])).values()]
  const schema = z.object({ periodEnd: z.string(), bankTotal: z.string(), included: z.array(z.string()), reason }).superRefine((value, context) => {
    if (cancel) return
    if (!validFinanceDate(value.periodEnd)) context.addIssue({ code: 'custom', path: ['periodEnd'], message: 'Enter a valid period end date.' })
    if (!/^\d+(\.\d{1,2})?$/.test(value.bankTotal) || !Number.isFinite(Number(value.bankTotal))) context.addIssue({ code: 'custom', path: ['bankTotal'], message: 'Enter a bank total of zero or greater with up to two decimal places.' })
    if (!value.included.length) context.addIssue({ code: 'custom', path: ['included'], message: 'Select at least one receipt.' })
    if (value.included.some(id => choices.some(item => item.id === id && item.status === 'Reversed'))) context.addIssue({ code: 'custom', path: ['included'], message: 'Remove reversed receipts before saving.' })
  })
  const form = useForm<ReconciliationValues>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { periodEnd: initial.batch.periodEnd, bankTotal: String(initial.batch.bankTotal), included: initial.items.filter(item => item.sourceType === 'PaymentReceipt').map(item => item.sourceId), reason: '' } })
  const { isDirty: __formDraftDirty } = form.formState

  const errors = form.formState.errors
  const summary = (record: finance.ReconciliationDetail) => <p>{record.batch.batchNumber} · {record.batch.status} <CustomerSourceText source={"· period"} /> {record.batch.periodEnd} <CustomerSourceText source={"· ledger"} /> {money(record.batch.ledgerReceiptTotal)} <CustomerSourceText source={"· bank"} /> {money(record.batch.bankTotal)} <CustomerSourceText source={"· difference"} /> {money(record.batch.difference)} · {record.items.filter(item => item.sourceType === 'PaymentReceipt').length} <CustomerSourceText source={"receipts."} /></p>
  const blocked = state.record.batch.status !== 'Draft'
  const included = form.watch('included')
  const selectedTotal = choices.filter(item => included.includes(item.id)).reduce((total, item) => total + item.amount, 0)
  return <CorrectionDialog title={cancel ? 'Cancel reconciliation draft' : 'Save draft changes'} description={cancel ? 'Keep this draft and its history, and stop further reconciliation actions. Receipts, allocations and invoices are unchanged.' : 'Correct the draft before submission. A reason is retained with the before and after values. Previous draft editors cannot independently approve this batch.'} busy={state.busy} dirty={__formDraftDirty} disabled={state.reviewNeeded || blocked || !__formDraftDirty} returnFocus={returnFocus} onClose={onClose}
    feedback={<><CorrectionFeedback state={state} describe={summary} />{blocked ? <p role="alert"><CustomerSourceText source={"Only a draft reconciliation can be edited or cancelled."} /></p> : null}</>}
    onSubmit={form.handleSubmit(values => { if (state.busy || state.reviewNeeded || blocked) return; state.save.mutate(record => cancel ? finance.cancelReconciliationDraft(record.batch.id, record.batch.version, values.reason) : finance.editReconciliationDraft(record.batch.id, { version: record.batch.version, reason: values.reason, periodEnd: values.periodEnd, bankTotal: Number(values.bankTotal), paymentReceiptIds: values.included, paymentAllocationIds: record.items.filter(item => item.sourceType === 'PaymentAllocation').map(item => item.sourceId), invoiceAdjustmentIds: record.items.filter(item => item.sourceType === 'InvoiceAdjustment').map(item => item.sourceId) })) })}>
    {summary(state.record)}<FinanceValidationSummary errors={Object.entries(errors).flatMap(([name, error]) => error?.message ? [{ name, message: String(error.message) }] : [])} focus={name => form.setFocus(name as keyof ReconciliationValues)} />
    {!cancel ? <><FinanceField id="draft-period-end" label="Period end" required error={errors.periodEnd?.message}><Input required type="date" {...form.register('periodEnd')} /></FinanceField><FinanceField id="draft-bank-total" label="Bank total (USD)" required error={errors.bankTotal?.message}><Input required type="number" min="0" step="0.01" {...form.register('bankTotal')} /></FinanceField><fieldset className="space-y-2" aria-describedby={errors.included ? 'draft-included-error' : undefined}><legend className="mb-2"><RequiredFieldName><CustomerSourceText source={"Included receipts"} /></RequiredFieldName></legend><Input aria-label={__customerSource("Search receipts")} value={receiptSearch} placeholder={__customerSource("Receipt number or Customer")} onChange={event => { setReceiptSearch(event.target.value); setReceiptPage(1) }} />{candidates.isError ? <ReadFailure error={candidates.error} retry={() => { void candidates.refetch() }} /> : null}{[...new Map([...choices.filter(item => included.includes(item.id)), ...(candidates.data?.items ?? [])].map(item => [item.id, item])).values()].map(item => <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm"><NativeCheckbox  value={item.id} checked={included.includes(item.id)} onChange={event => { if (event.target.checked) setSelectedReceipts(previous => [...previous.filter(receipt => receipt.id !== item.id), item]); form.setValue('included', event.target.checked ? [...included, item.id] : included.filter(id => id !== item.id), { shouldDirty: true, shouldValidate: true }) }} />{item.receiptNumber} · {item.payer} · {money(item.amount)}{item.status === 'Reversed' ? <CustomerSourceText source={" · Reversed; remove from this draft"} /> : ''}</label>)}<RecordPagination data={candidates.data} busy={candidates.isFetching} onPage={setReceiptPage} />{errors.included ? <FieldError id="draft-included-error">{errors.included.message}</FieldError> : null}</fieldset><p className="text-sm"><CustomerSourceText source={"Selected receipts:"} /> {money(selectedTotal)}<CustomerSourceText source={". Allocation and invoice-adjustment source links already included in this batch are retained."} /></p></> : null}
    <FinanceField id="draft-change-reason" label="Reason" required error={errors.reason?.message}><textarea required className={financeTextareaClass} {...form.register('reason', { onChange: () => { if (errors.reason) void form.trigger('reason') } })} /></FinanceField>
  </CorrectionDialog>
}

export function FinanceReconciliationDetails({ batchId, apiEnabled, canManageCash, onSaved, pending = false, onSubmit, onApprove }: {
  batchId: string; apiEnabled: boolean; canManageCash: boolean; onSaved: () => Promise<void>
  pending?: boolean; onSubmit?: () => void; onApprove?: () => void
}) {
  const detail = useQuery({ queryKey: ['accounts-receivable', 'reconciliation-detail', batchId], queryFn: () => finance.getReconciliation(batchId), enabled: apiEnabled })
  const receipts = useQuery({ queryKey: ['accounts-receivable', 'reconciliation-choices'], queryFn: () => finance.listPaymentReceipts(), enabled: apiEnabled && canManageCash && detail.data?.batch.status === 'Draft' })
  const [edit, setEdit] = useState<{ record: finance.ReconciliationDetail; cancel: boolean } | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  return <section className="space-y-4">{detail.isLoading ? <p role="status"><CustomerSourceText source={"Loading reconciliation detail…"} /></p> : detail.error ? <ReadFailure error={detail.error} retry={() => { void detail.refetch() }} /> : detail.data ? <><h2 className="font-semibold"><CustomerSourceText source={"Included sources"} /></h2>{detail.data.items.length ? <ul className="space-y-2 text-sm">{detail.data.items.map(item => <li key={`${item.sourceType}-${item.sourceId}`}>{sourceName(item.sourceType)} · {item.reference} · {money(item.amount)}</li>)}</ul> : <p className="text-sm"><CustomerSourceText source={"No sources in this batch."} /></p>}{canManageCash && detail.data.batch.status === 'Draft' || detail.data.batch.status === 'Submitted' && onApprove ? <><ActionMenu><DropdownMenuTrigger asChild><Button ref={node => { if (node) opener.current = node }} variant="outline" disabled={!apiEnabled || pending}><CustomerSourceText source={"Actions"} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        {detail.data.batch.status === 'Draft' && onSubmit ? <DropdownMenuItem disabled={detail.data.batch.difference !== 0 || pending} onSelect={onSubmit}><CustomerSourceText source={"Submit balanced batch"} /></DropdownMenuItem> : null}
        {detail.data.batch.status === 'Submitted' && onApprove ? <DropdownMenuItem disabled={pending} onSelect={onApprove}><CustomerSourceText source={"Approve independently"} /></DropdownMenuItem> : null}
        {canManageCash && detail.data.batch.status === 'Draft' ? <><DropdownMenuItem disabled={pending || receipts.isLoading || receipts.isError} onSelect={() => setEdit({ record: detail.data, cancel: false })}><CustomerSourceText source={"Edit draft"} /></DropdownMenuItem><DropdownMenuItem variant="destructive" disabled={pending} onSelect={() => setEdit({ record: detail.data, cancel: true })}><CustomerSourceText source={"Cancel draft"} /></DropdownMenuItem></> : null}</DropdownMenuContent></ActionMenu>{receipts.error ? <ReadFailure error={receipts.error} retry={() => { void receipts.refetch() }} /> : null}</> : null}{detail.data.changes.length ? <><h2 className="font-semibold"><CustomerSourceText source={"Draft change history"} /></h2><ol className="space-y-3 text-sm">{detail.data.changes.map((item, index) => <li key={`${item.change.atUtc}-${index}`}><p>{item.change.action} by {item.actorName} · {date(item.change.atUtc)}</p><p>{item.change.reason}</p>{item.change.action === 'Edited' ? <p><CustomerSourceText source={"Period:"} /> {item.change.before.periodEnd} → {item.change.after.periodEnd}<CustomerSourceText source={". Bank:"} /> {money(item.change.before.bankTotal)} → {money(item.change.after.bankTotal)}<CustomerSourceText source={". Ledger:"} /> {money(item.change.before.ledgerReceiptTotal)} → {money(item.change.after.ledgerReceiptTotal)}.</p> : null}</li>)}</ol></> : null}</> : null}{edit ? <ReconciliationDraftDialog initial={edit.record} receipts={receipts.data ?? []} cancel={edit.cancel} returnFocus={opener.current} onClose={() => setEdit(null)} onSaved={onSaved} /> : null}</section>
}

function ReadFailure({ error, retry }: { error: unknown; retry: () => void }) {
  return <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Finance detail is unavailable"} /></AlertTitle><AlertDescription><p>{<CustomerSourceText source={getOrderErrorMessage(error, 'Try again.')} />}</p><Button variant="outline" onClick={retry}><CustomerSourceText source={"Retry detail"} /></Button></AlertDescription></Alert>
}
