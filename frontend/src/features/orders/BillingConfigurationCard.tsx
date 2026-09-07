import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { approveTaxDecision, updateBillingProfile, type AccountsReceivableCustomer } from '#/api/pseq-order-to-cash'
import { getOrderErrorMessage } from '#/api/order-management'
import { RequiredLegend } from '#/components/ui/required-field'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { FinanceField, FinanceValidationSummary, financeSelectClass } from './FinanceFormFields'

const required = (label: string) => z.string().trim().min(1, `${label} is required.`)
const schema = z.object({
  contactName: required('Billing contact name'), contactEmail: required('Billing contact email').email('Enter a valid billing email.'),
  line1: required('Address line 1'), line2: z.string(), city: required('City'), region: required('State or region'), postalCode: required('Postal code'),
  countryCode: z.string().trim().regex(/^[a-zA-Z]{2}$/, 'Enter the two-letter country code.'),
  paymentTermsDays: z.string().refine(value => /^\d+$/.test(value) && Number(value) <= 365, 'Payment terms must be a whole number from 0 to 365 days.'),
  taxDecision: z.enum(['Taxable', 'Exempt', 'NonTaxable']), taxRatePercent: z.string(), exemptionEvidence: z.string(),
}).superRefine((values, context) => {
  if (values.taxDecision === 'Taxable' && (!values.taxRatePercent.trim() || !Number.isFinite(Number(values.taxRatePercent)) || Number(values.taxRatePercent) < 0 || Number(values.taxRatePercent) > 100)) context.addIssue({ code: 'custom', path: ['taxRatePercent'], message: 'Enter a tax rate from 0 to 100 percent.' })
  if (values.taxDecision === 'Exempt' && !values.exemptionEvidence.trim()) context.addIssue({ code: 'custom', path: ['exemptionEvidence'], message: 'Exemption evidence is required.' })
})
type Values = z.infer<typeof schema>
const approvalSchema = z.object({ notes: required('Finance approval notes') })
const fields = [{ name: 'contactName', label: 'Billing contact name' }, { name: 'contactEmail', label: 'Billing contact email', type: 'email' }, { name: 'line1', label: 'Address line 1' }, { name: 'line2', label: 'Address line 2 (optional)' }, { name: 'city', label: 'City' }, { name: 'region', label: 'State or region' }, { name: 'postalCode', label: 'Postal code' }, { name: 'countryCode', label: 'Country code' }, { name: 'paymentTermsDays', label: 'Payment terms (days)', type: 'number' }] as const

export function BillingConfigurationCard({ apiEnabled, customers, customersLoading, initialOrganizationId = '', modal = false, onDirtyChange, onBusyChange }: {
  apiEnabled: boolean; customers: AccountsReceivableCustomer[]; customersLoading: boolean; initialOrganizationId?: string; modal?: boolean
  onDirtyChange?: (dirty: boolean) => void; onBusyChange?: (busy: boolean) => void
}) {
  const client = useQueryClient()
  const [organizationId, setOrganizationId] = useState(initialOrganizationId)
  const selected = customers.find(customer => customer.organizationId === organizationId)
  const version = useRef(selected?.profileVersion ?? 0)
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: toValues(selected) })
  const approval = useForm<z.infer<typeof approvalSchema>>({ resolver: zodResolver(approvalSchema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { notes: '' } })
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['accounts-receivable', 'customers'] }),
    client.invalidateQueries({ queryKey: ['organization-operational-readiness'] }),
    client.invalidateQueries({ queryKey: ['pseq-staging-customers'] }),
  ])
  const save = useMutation({ mutationFn: (values: Values) => updateBillingProfile(organizationId, {
    version: version.current, billingContactName: values.contactName, billingContactEmail: values.contactEmail,
    billingAddressJson: JSON.stringify({ line1: values.line1, line2: values.line2.trim() || null, city: values.city, region: values.region, postalCode: values.postalCode, countryCode: values.countryCode.toUpperCase() }),
    paymentTermsDays: Number(values.paymentTermsDays), taxDecision: values.taxDecision,
    approvedTaxRate: values.taxDecision === 'Taxable' ? Number(values.taxRatePercent) / 100 : null,
    taxExemptionEvidence: values.taxDecision === 'Exempt' ? values.exemptionEvidence.trim() : null,
  }), onSuccess: async (_result, values) => { await refresh(); form.reset(values) } })
  const approve = useMutation({ mutationFn: (values: z.infer<typeof approvalSchema>) => approveTaxDecision(organizationId, selected!.profileVersion!, values.notes), onSuccess: async () => { approval.reset(); await refresh() } })
  const busy = save.isPending || approve.isPending
  const dirty = form.formState.isDirty || approval.formState.isDirty
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  useEffect(() => { onBusyChange?.(busy) }, [busy, onBusyChange])
  useEffect(() => {
    if (!form.formState.isDirty && !busy && version.current !== (selected?.profileVersion ?? 0)) { version.current = selected?.profileVersion ?? 0; form.reset(toValues(selected)) }
  }, [selected, form, form.formState.isDirty, busy])
  const taxDecision = form.watch('taxDecision')
  const error = save.error ?? approve.error
  const register = (name: keyof Values) => {
    const field = form.register(name)
    return { ...field, onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { void field.onChange(event); if (form.getFieldState(name).error) void form.trigger(name); if (name === 'taxDecision') { form.clearErrors(['taxRatePercent', 'exemptionEvidence']) } } }
  }
  const errors = Object.entries(form.formState.errors).flatMap(([name, value]) => value.message ? [{ name, message: value.message }] : [])
  function selectCustomer(id: string) {
    if (busy || (dirty && !window.confirm('Discard unsaved billing changes?'))) return
    const next = customers.find(customer => customer.organizationId === id)
    version.current = next?.profileVersion ?? 0
    setOrganizationId(id); form.reset(toValues(next)); approval.reset(); save.reset(); approve.reset()
  }
  return <Card><CardHeader><CardTitle>Customer billing and tax configuration</CardTitle><CardDescription>Finance owns the billing contact, address, payment terms, and effective tax decision. Saving resets Finance approval. Approval is required to include tax in a quote and must be complete before invoice issuance.</CardDescription></CardHeader><CardContent className="space-y-5">
    {error ? <Alert variant="destructive"><AlertTitle>Billing configuration was not updated</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Review the current Customer profile and try again. Your entered values are retained.')}</AlertDescription></Alert> : null}
    {customersLoading ? <p role="status" className="text-sm text-muted-foreground">Loading Customer billing profiles…</p> : null}
    {!initialOrganizationId ? <FinanceField id="billing-customer" label="Customer" required><select required className={financeSelectClass} value={organizationId} disabled={busy} onChange={event => selectCustomer(event.target.value)}><option value="">Select a Customer</option>{customers.map(customer => <option key={customer.organizationId} value={customer.organizationId}>{customer.organizationName}</option>)}</select></FinanceField> : <p className="font-medium">{selected?.organizationName}</p>}
    {selected ? <><div className="flex flex-wrap items-center gap-2"><Badge variant={selected.financeApprovedAtUtc ? 'secondary' : 'outline'}>{selected.financeApprovedAtUtc ? 'Finance approved' : 'Finance approval required'}</Badge><span className="text-xs text-muted-foreground">Configuration version {selected.configurationVersion || 'not configured'}</span></div>
      <form noValidate className="space-y-4" onSubmit={form.handleSubmit(values => save.mutate(values))}>
        <FinanceValidationSummary errors={errors} focus={name => form.setFocus(name as keyof Values)} />
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">{fields.map(field => <FinanceField key={field.name} id={`billing-${field.name}`} label={field.label} required={field.name !== 'line2'} error={form.formState.errors[field.name]?.message}><Input required={field.name !== 'line2'} type={'type' in field ? field.type : 'text'} maxLength={field.name === 'countryCode' ? 2 : undefined} {...register(field.name)} /></FinanceField>)}
          <FinanceField id="billing-tax-decision" label="Tax decision" required error={form.formState.errors.taxDecision?.message}><select required className={financeSelectClass} {...register('taxDecision')}><option value="Taxable">Taxable</option><option value="Exempt">Exempt</option><option value="NonTaxable">Non-taxable</option></select></FinanceField>
          {taxDecision === 'Taxable' ? <FinanceField id="billing-tax-rate" label="Approved tax rate (%)" required error={form.formState.errors.taxRatePercent?.message}><Input required type="number" min="0" max="100" step="0.0001" {...register('taxRatePercent')} /></FinanceField> : null}
          {taxDecision === 'Exempt' ? <FinanceField id="billing-exemption" label="Exemption evidence" required error={form.formState.errors.exemptionEvidence?.message}><Input required {...register('exemptionEvidence')} /></FinanceField> : null}
        </fieldset>
        {!modal ? <RequiredLegend /> : null}<Button type="submit" disabled={!apiEnabled || !form.formState.isDirty || busy}>{save.isPending ? 'Saving changes…' : 'Save changes'}</Button>
        {save.isSuccess && !form.formState.isDirty ? <p role="status" className="text-sm">Billing changes saved. Review and approve the current tax decision.</p> : null}
      </form>
      <form noValidate className="space-y-3 border-t pt-4" onSubmit={approval.handleSubmit(values => { if (!form.formState.isDirty) approve.mutate(values) })}>
        <FinanceField id="billing-approval-notes" label="Finance approval notes" required error={approval.formState.errors.notes?.message}><Input required disabled={busy} {...approval.register('notes', { onChange: () => { if (approval.formState.errors.notes) void approval.trigger('notes') } })} /></FinanceField>
        {!modal ? <RequiredLegend /> : null}<Button type="submit" variant="outline" disabled={!apiEnabled || !selected.profileVersion || !selected.taxDecision || form.formState.isDirty || busy}>{approve.isPending ? 'Approving…' : 'Approve current tax decision'}</Button>
        {form.formState.isDirty ? <p className="text-sm text-muted-foreground">Save billing changes before approving the current tax decision.</p> : null}
        {selected.financeApprovedAtUtc ? <p className="text-xs text-muted-foreground">Approved {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selected.financeApprovedAtUtc))}. Any billing or tax change requires a new approval.</p> : null}
      </form>
    </> : !customersLoading ? <p className="text-sm text-muted-foreground">Select a Customer to configure PSeq billing.</p> : null}
  </CardContent></Card>
}

function toValues(customer?: AccountsReceivableCustomer): Values {
  let address: Partial<Values> = {}
  try { const parsed: unknown = JSON.parse(customer?.billingAddressJson ?? '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) address = parsed as Partial<Values> } catch { /* Missing or older address data can be completed in the form. */ }
  return { contactName: customer?.billingContactName ?? '', contactEmail: customer?.billingContactEmail ?? '', line1: address.line1 ?? '', line2: address.line2 ?? '', city: address.city ?? '', region: address.region ?? '', postalCode: address.postalCode ?? '', countryCode: address.countryCode ?? 'US', paymentTermsDays: String(customer?.paymentTermsDays ?? 30), taxDecision: customer?.taxDecision ?? 'NonTaxable', taxRatePercent: customer?.approvedTaxRate == null ? '' : String(customer.approvedTaxRate * 100), exemptionEvidence: customer?.taxExemptionEvidence ?? '' }
}
