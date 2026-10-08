import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import * as finance from '#/api/pseq-order-to-cash'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { RequiredLegend } from '#/components/ui/required-field'
import { FinanceField, FinanceValidationSummary, financeSelectClass, financeTextareaClass } from './FinanceFormFields'
import { useOrderDraftGuard } from './use-order-draft-guard'

const importSchema = z.object({ organizationId: z.string().min(1, 'Select a Customer.'), source: z.string().trim().min(1, 'Source is required.'), csvText: z.string().trim().min(1, 'Provide CSV content or choose a CSV file.') })
type InputValues = z.infer<typeof importSchema>
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export function FinanceReceiptImport({ apiEnabled, customerId, customers, onSaved }: { apiEnabled: boolean; customerId: string; customers: finance.AccountsReceivableCustomer[]; onSaved: () => Promise<void> }) {
  const form = useForm<InputValues>({ resolver: zodResolver(importSchema.refine(values => customers.some(customer => customer.organizationId === values.organizationId), { path: ['organizationId'], message: 'Select an available Customer.' })), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { organizationId: customerId, source: '', csvText: '' } })
  const revision = useRef(0)
  const fileRead = useRef(0)
  const [readingFile, setReadingFile] = useState(false)
  const [review, setReview] = useState<{ batch: finance.PaymentImportBatch; input: InputValues; revision: number } | null>(null)
  const [completed, setCompleted] = useState(false)
  const preview = useMutation({ mutationFn: (snapshot: { input: InputValues; revision: number }) => finance.previewPaymentImport(snapshot.input), onSuccess: (result, snapshot) => { if (snapshot.revision === revision.current) setReview({ batch: result, ...snapshot }) } })
  const confirm = useMutation({ mutationFn: () => {
    if (!review || review.revision !== revision.current) throw new Error('Preview the current input before confirming.')
    return finance.confirmPaymentImport(review.batch.id, review.batch.version)
  }, onSuccess: async () => { const organizationId = form.getValues('organizationId'); setReview(null); revision.current += 1; form.reset({ organizationId, source: '', csvText: '' }); setCompleted(true); await onSaved() } })
  useOrderDraftGuard(form.formState.isDirty || Boolean(review), confirm.isPending)
  function invalidateReview() { revision.current += 1; setReview(null); setCompleted(false); preview.reset(); confirm.reset() }
  const register = (name: keyof InputValues) => {
    const field = form.register(name)
    return { ...field, onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { invalidateReview(); void field.onChange(event); if (form.getFieldState(name).error) void form.trigger(name) } }
  }
  const errors = Object.entries(form.formState.errors).flatMap(([name, error]) => error.message ? [{ name, message: error.message }] : [])
  const failure = preview.error ?? confirm.error
  return <Card><CardHeader><CardTitle>{review ? 'Review receipt import' : 'Import receipts'}</CardTitle><CardDescription>Preview the complete file, then confirm unapplied receipts for the selected Customer.</CardDescription></CardHeader><CardContent className="space-y-4">
    {failure ? <Alert variant="destructive"><AlertTitle>Import was not completed</AlertTitle><AlertDescription>{getOrderErrorMessage(failure, 'Try again. Your entered values are retained.')}</AlertDescription></Alert> : null}
    {completed ? <p role="status">Receipts imported. Open Receipts to allocate cash.</p> : null}
    {review ? <><dl className="grid gap-4 sm:grid-cols-2">{[['Customer', customers.find(value => value.organizationId === review.input.organizationId)?.organizationName ?? 'Customer unavailable'], ['Source', review.input.source], ['Rows', String(review.batch.rowCount)], ['Total', money(review.batch.totalAmount)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl><ImportPreview json={review.batch.previewJson} /><p className="text-sm text-muted-foreground">Confirming creates unapplied receipts. It does not allocate cash.</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={confirm.isPending} onClick={invalidateReview}>Change input</Button><Button disabled={confirm.isPending} onClick={() => confirm.mutate()}>{confirm.isPending ? 'Importing…' : `Confirm ${review.batch.rowCount} receipts`}</Button></div></> : <form noValidate className="space-y-4" onSubmit={form.handleSubmit(input => preview.mutate({ input, revision: revision.current }))}>
      <FinanceValidationSummary errors={errors} focus={name => form.setFocus(name as keyof InputValues)} />
      <div className="grid gap-4 sm:grid-cols-2"><FinanceField id="import-organization" label="Customer" required error={form.formState.errors.organizationId?.message}><select required className={financeSelectClass} {...register('organizationId')}><option value="">Select Customer</option>{customers.map(item => <option key={item.organizationId} value={item.organizationId}>{item.organizationName}</option>)}</select></FinanceField><FinanceField id="import-source" label="Source" required error={form.formState.errors.source?.message}><Input required {...register('source')} /></FinanceField></div>
      <FinanceField id="import-file" label="CSV file"><Input type="file" accept=".csv,text/csv" onChange={async event => {
        const file = event.target.files?.[0]
        if (!file) return
        invalidateReview()
        const selectedRevision = revision.current
        const reading = ++fileRead.current
        setReadingFile(true)
        try { const text = await file.text(); if (selectedRevision === revision.current) form.setValue('csvText', text, { shouldDirty: true, shouldValidate: Boolean(form.formState.errors.csvText) }) }
        catch { if (selectedRevision === revision.current) form.setError('csvText', { message: 'The CSV file could not be read. Choose it again or paste its content.' }) }
        finally { if (reading === fileRead.current) setReadingFile(false) }
      }} /></FinanceField>
      <FinanceField id="import-csv" label="CSV content" required error={form.formState.errors.csvText?.message}><textarea required className={financeTextareaClass} {...register('csvText')} /></FinanceField>
      <p className="text-sm text-muted-foreground">Required headers: source, external_id, date, amount, currency, payer, reference, memo.</p><RequiredLegend /><Button disabled={!apiEnabled || preview.isPending || readingFile}>{preview.isPending ? 'Checking…' : readingFile ? 'Reading file…' : 'Preview import'}</Button>
    </form>}
  </CardContent></Card>
}

function ImportPreview({ json }: { json: string }) {
  let rows: Array<Record<string, unknown>> = []
  try { const value: unknown = JSON.parse(json); rows = Array.isArray(value) ? value : [] } catch { /* Older previews may contain summary-only information. */ }
  return rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-2 text-left font-medium">Receipts to import</caption><thead><tr>{['External reference', 'Payer', 'Date', 'Amount', 'Reference'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t">{['externalId', 'payer', 'receivedOn', 'amount', 'reference'].map(key => <td key={key} className="p-2">{String(row[key] ?? row[key[0].toUpperCase() + key.slice(1)] ?? '')}</td>)}</tr>)}</tbody></table></div> : <p className="text-sm">The batch passed duplicate, currency and required-field validation.</p>
}
