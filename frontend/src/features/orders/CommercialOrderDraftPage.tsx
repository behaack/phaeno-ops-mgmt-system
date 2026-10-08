import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form'
import { getOrderErrorMessage, type LabServiceOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Field, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { SearchableSelect } from '#/components/ui/searchable-select'
import { usePhaenoSession } from '#/features/auth/session-context'
import { commercialDraftSchema, draftTotals, newDraftPhase, submissionIssues, type CommercialDraftForm } from './commercial-draft'
import { CommercialDraftPhaseFields } from './CommercialDraftPhaseFields'
import { CommercialDraftHandlingFields } from './CommercialDraftHandlingFields'
import { CustomerOrderReadiness } from './CustomerOrderReadiness'
import { useCommercialDraftData, useCommercialDraftWrite } from './use-commercial-draft'
import { useOrderDraftGuard } from './use-order-draft-guard'

type PhaseConfirmation = {
  title: string
  description: string
  confirmLabel: string
  apply: () => void
  returnFocusSelector: string
  confirmedFocusSelector?: string
}

export function CommercialOrderDraftPage({ orderId, organizationId = '', sourceRequestId }: { orderId?: string; organizationId?: string; sourceRequestId?: string }) {
  const { session, authProvider } = usePhaenoSession()
  const enabled = authProvider !== 'mock' && Boolean(session?.capabilities.canQuoteLabServiceWork)
  const data = useCommercialDraftData(orderId, '', '', enabled)
  if (!enabled) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle>Draft entry unavailable</AlertTitle><AlertDescription>A real Phaeno session with Commercial Operator access is required.</AlertDescription></Alert></main>
  if (orderId && data.order.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading Draft…</p></main>
  if (orderId && (data.order.error || !data.order.data)) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Draft unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(data.order.error, 'Reload the order and try again.')} <Button variant="outline" onClick={() => void data.order.refetch()}>Retry</Button></AlertDescription></Alert></main>
  const order = data.order.data && 'samples' in data.order.data ? data.order.data as LabServiceOrder : undefined
  if (orderId && !order?.commercialDraft) return <main className="page-wrap px-4 py-8"><p>This order has already been submitted for pricing.</p><Button asChild variant="outline"><Link to="/order-operations/lab-services/orders/$orderId" params={{ orderId }}>Open order</Link></Button></main>
  return <DraftEditor key={orderId ?? 'new'} order={order} initialOrganizationId={organizationId} sourceRequestId={sourceRequestId} />
}

function DraftEditor({ order, initialOrganizationId, sourceRequestId }: { order?: LabServiceOrder; initialOrganizationId: string; sourceRequestId?: string }) {
  const navigate = useNavigate()
  const [organizationId, setOrganizationId] = useState(order?.organizationId ?? initialOrganizationId)
  const [departmentId, setDepartmentId] = useState(order?.departmentId ?? '')
  const [phaseCountInput, setPhaseCountInput] = useState<string | null>(null)
  const [phaseCountError, setPhaseCountError] = useState('')
  const [phaseConfirmation, setPhaseConfirmation] = useState<PhaseConfirmation | null>(null)
  const phaseConfirmationFocusSelector = useRef('')
  const cancelPhaseConfirmation = useRef<HTMLButtonElement>(null)
  const [ownerDirty, setOwnerDirty] = useState(false)
  const [ownerError, setOwnerError] = useState('')
  const [submissionError, setSubmissionError] = useState<unknown>(null)
  const [savedOrder, setSavedOrder] = useState(order)
  const data = useCommercialDraftData(undefined, organizationId, departmentId, true)
  const mutation = useCommercialDraftWrite()
  const form = useForm<CommercialDraftForm>({ resolver: zodResolver(commercialDraftSchema), mode: 'onBlur', defaultValues: order?.commercialDraft ?? {
    jobName: '', sampleTypeDefinitionId: null, catalogItemId: null, storageRequirements: null, safetyDeclaration: '', notes: '', usesPhases: false, phases: [newDraftPhase(1)],
  } })
  const phases = useFieldArray({ control: form.control, name: 'phases' })
  const values = form.watch()
  const totals = draftTotals(values)
  const services = (data.pricingCatalog.data?.catalogItems ?? []).filter(item => item.isActive && item.isPSeqLabService && item.salesUnit.toLowerCase() === 'specimen')
  const approveNavigation = useOrderDraftGuard(form.formState.isDirty || ownerDirty, mutation.isPending)
  const [issueSummary, setIssueSummary] = useState<Array<{ path: string; message: string }>>([])
  function requestPhaseConfirmation(confirmation: PhaseConfirmation) {
    phaseConfirmationFocusSelector.current = confirmation.returnFocusSelector
    setPhaseConfirmation(confirmation)
  }
  function setUsesPhases(checked: boolean) {
    setPhaseCountInput(null); setPhaseCountError('')
    form.setValue('usesPhases', checked, { shouldDirty: true })
    phases.replace(checked ? [values.phases[0], newDraftPhase(2)] : [values.phases[0]])
  }
  function togglePhases(checked: boolean) {
    if (!checked && phases.fields.length > 1) {
      requestPhaseConfirmation({ title: 'Use a single scope?', description: `Keep ${values.phases[0].name.trim() || 'Phase 1'}’s scope and proposed pricing. Remove the other ${phases.fields.length - 1} phase${phases.fields.length > 2 ? 's' : ''}, including biological sources, sample counts, sequencing runs and proposed prices.`, confirmLabel: 'Remove additional phases', apply: () => setUsesPhases(false), returnFocusSelector: '#draft-use-phases' })
      return
    }
    setUsesPhases(checked)
  }
  function resizePhases(count: number) {
    if (!Number.isInteger(count) || count < 2 || count > 100) { setPhaseCountError('Enter a whole number from 2 to 100.'); return }
    setPhaseCountError(''); setPhaseCountInput(null)
    if (count === phases.fields.length) return
    if (count < phases.fields.length) {
      const removedScope = count + 1 === phases.fields.length ? `phase ${phases.fields.length}` : `phases ${count + 1} through ${phases.fields.length}`
      requestPhaseConfirmation({ title: `Reduce to ${count} phases?`, description: `Remove ${removedScope}, including biological sources, sample counts, sequencing runs and proposed prices. Keep the first ${count} phases unchanged.`, confirmLabel: 'Remove extra phases', apply: () => phases.replace(values.phases.slice(0, count)), returnFocusSelector: '#draft-phase-count' })
      return
    }
    phases.replace(Array.from({ length: count }, (_, index) => values.phases[index] ?? newDraftPhase(index + 1)))
  }
  function removePhase(index: number) {
    const name = values.phases[index].name.trim() || `Phase ${index + 1}`
    const nextPhase = phases.fields[index + 1] ?? phases.fields[index - 1]
    requestPhaseConfirmation({ title: `Remove ${name}?`, description: 'Remove this phase, including its biological sources, sample counts, sequencing runs and proposed pricing. Keep the other phases unchanged.', confirmLabel: 'Remove phase', apply: () => phases.remove(index), returnFocusSelector: `[data-phase-actions-id="${phases.fields[index].id}"]`, confirmedFocusSelector: `[data-phase-actions-id="${nextPhase.id}"]` })
  }
  async function save(submit: boolean) {
    if (phaseCountError) { document.getElementById('draft-phase-count')?.focus(); return }
    setOwnerError(''); setSubmissionError(null); setIssueSummary([]); form.clearErrors()
    if (!organizationId || !data.selectedDepartmentId) { setOwnerError('Select a Customer and Department before saving.'); document.getElementById('draft-customer')?.focus(); return }
    await form.handleSubmit(async draft => {
      if (submit) {
        const issues = submissionIssues(draft)
        if (draft.catalogItemId && !services.some(service => service.id === draft.catalogItemId)) issues.unshift({ path: 'catalogItemId', message: 'Select an available catalog service before submitting for pricing.' })
        if (issues.length) { setIssueSummary(issues); issues.forEach(issue => form.setError(issue.path as FieldPath<CommercialDraftForm>, { message: issue.message })); form.setFocus(issues[0].path as FieldPath<CommercialDraftForm>); return }
      }
      try {
        const result = await mutation.mutateAsync({ orderId: savedOrder?.id, submit, input: { organizationId, departmentId: data.selectedDepartmentId, draft,
          sourceRequestId: savedOrder?.commercialSource?.requestId ?? sourceRequestId, version: savedOrder?.version } })
        setSavedOrder(result.order); setOwnerDirty(false); form.reset(draft)
        if (result.submissionError) { setSubmissionError(result.submissionError); return }
        approveNavigation()
        await navigate({ to: '/order-operations/lab-services/orders/$orderId', params: { orderId: result.order.id }, search: previous => ({ ...previous }) })
      } catch { /* Retain entries and the original concurrency version. */ }
    }, errors => {
      const issues: Array<{ path: string; message: string }> = []
      function collect(value: unknown, path = '') { if (value && typeof value === 'object') { if ('message' in value && typeof value.message === 'string') issues.push({ path, message: value.message }); else Object.entries(value).forEach(([key, child]) => collect(child, path ? `${path}.${key}` : key)) } }
      collect(errors); setIssueSummary(issues)
    })()
  }
  const busy = mutation.isPending
  return <main className="page-wrap px-4 py-8">
    <header className="mb-6"><Link to="/order-operations/lab-services" search={previous => ({ ...previous })} className="text-sm text-primary hover:underline">Order intake</Link><h1 className="mt-2 text-3xl font-semibold">{savedOrder ? `Edit Draft · ${savedOrder.orderNumber}` : 'New Customer order'}</h1><p className="mt-2 text-sm text-muted-foreground">Record the Customer’s scope and optional proposed prices. Save a Draft, then submit the completed order for pricing.</p></header>
    {ownerError || mutation.error || submissionError || issueSummary.length ? <Alert variant="destructive" className="mb-5" role="alert"><AlertTitle>{submissionError ? 'Draft saved; pricing submission needs attention' : 'Review the order entries'}</AlertTitle><AlertDescription>{ownerError || getOrderErrorMessage(submissionError ?? mutation.error, '')}{issueSummary.length ? <ul className="list-disc space-y-1 pl-5">{issueSummary.map((issue, index) => <li key={`${issue.path}-${index}`}><button type="button" className="cursor-pointer text-left underline" onClick={() => form.setFocus(issue.path as FieldPath<CommercialDraftForm>)}>{issue.message}</button></li>)}</ul> : null}<p>Your entries are retained. If another user changed the Draft, reopen its saved details before reconciling your changes.</p></AlertDescription></Alert> : null}
    <form noValidate onSubmit={event => { event.preventDefault(); void save(false) }} className="space-y-5">
      <fieldset disabled={busy} className="space-y-5">
        <Card><CardHeader><CardTitle>Customer and Job</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <Field>
            <Label htmlFor="draft-customer"><RequiredFieldName>Customer</RequiredFieldName></Label>
            <SearchableSelect id="draft-customer" options={(data.customers.data ?? []).map(c => ({ value: c.id, label: c.name }))} value={organizationId} onValueChange={value => { setOrganizationId(value); setDepartmentId(''); setOwnerDirty(true) }} disabled={Boolean(savedOrder || sourceRequestId)} placeholder="Search Customers" emptyMessage="No active Customers are available." />
          </Field>
          <Field>
            <Label htmlFor="draft-department"><RequiredFieldName>Department</RequiredFieldName></Label>
            <NativeSelect id="draft-department" value={data.selectedDepartmentId} onChange={event => { setDepartmentId(event.target.value); setOwnerDirty(true) }} disabled={Boolean(savedOrder)}><option value="">Select Department</option>{data.departments.data?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</NativeSelect>
          </Field>
          <Field className="md:col-span-2">
            <Label htmlFor="draft-name"><RequiredFieldName>Job name</RequiredFieldName></Label>
            <Input id="draft-name" {...form.register('jobName')} aria-invalid={Boolean(form.formState.errors.jobName)} aria-describedby="draft-name-error" />
            <FieldError id="draft-name-error">{form.formState.errors.jobName?.message}</FieldError>
          </Field>
          <Field>
            <Label htmlFor="draft-service"><RequiredFieldName>Catalog service</RequiredFieldName> · required for pricing</Label>
            <NativeSelect id="draft-service" value={values.catalogItemId ?? ''} onChange={event => form.setValue('catalogItemId', event.target.value || null, { shouldDirty: true, shouldValidate: true })} aria-invalid={Boolean(form.formState.errors.catalogItemId)} aria-describedby="draft-service-help draft-service-error" disabled={data.pricingCatalog.isLoading}>
              <option value="">{data.pricingCatalog.isLoading ? 'Loading services…' : 'Select catalog service'}</option>
              {values.catalogItemId && !services.some(service => service.id === values.catalogItemId) ? <option value={values.catalogItemId} disabled>Unavailable service — select another</option> : null}
              {services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
            </NativeSelect>
            <p id="draft-service-help" className="text-xs text-muted-foreground">This service applies to the whole order. Its final prices are reviewed before the quote is issued.</p>
            <FieldError id="draft-service-error">{form.formState.errors.catalogItemId?.message}</FieldError>
            {data.pricingCatalog.error ? <p className="text-sm text-destructive">Services could not be loaded. <Button type="button" variant="link" onClick={() => void data.pricingCatalog.refetch()}>Retry</Button></p> : !data.pricingCatalog.isLoading && services.length === 0 ? <p className="text-sm text-muted-foreground">No active PSeq laboratory catalog services are available. Save a Draft and configure the service before submission.</p> : null}
          </Field>
          <Field>
            <Label htmlFor="draft-sample-type"><RequiredFieldName>Sample type</RequiredFieldName> · required for pricing</Label>
            <NativeSelect id="draft-sample-type" aria-invalid={Boolean(form.formState.errors.sampleTypeDefinitionId)} aria-describedby="draft-sample-type-error" value={values.sampleTypeDefinitionId ?? ''} onChange={event => form.setValue('sampleTypeDefinitionId', event.target.value || null, { shouldDirty: true })}><option value="">Select Sample type</option>{data.sampleTypes.data?.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</NativeSelect>
            <FieldError id="draft-sample-type-error">{form.formState.errors.sampleTypeDefinitionId?.message}</FieldError>
          </Field>
          {data.customers.error || data.departments.error || data.sampleTypes.error ? <Alert variant="destructive" className="md:col-span-2"><AlertDescription>{getOrderErrorMessage(data.customers.error ?? data.departments.error ?? data.sampleTypes.error, 'Some choices could not be loaded. Reload and try again.')}</AlertDescription></Alert> : null}
          <div className="md:col-span-2">{data.readiness.data ? <CustomerOrderReadiness readiness={data.readiness.data} refreshing={data.readiness.isFetching} onRefresh={() => void data.readiness.refetch()} /> : null}{data.readiness.error ? <Alert variant="destructive"><AlertDescription>Customer readiness could not be loaded. Save a Draft and retry before submission.<Button type="button" variant="outline" onClick={() => void data.readiness.refetch()}>Retry</Button></AlertDescription></Alert> : null}<p className="mt-2 text-xs text-muted-foreground">Customer readiness applies when submitting for pricing. It does not block saving a Draft.</p></div>
        </CardContent></Card>
        <Card size="sm">
          <CardHeader><CardTitle>Order scope</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
              <label htmlFor="draft-use-phases" className="flex min-h-8 cursor-pointer items-center gap-2"><Checkbox id="draft-use-phases" checked={values.usesPhases} onCheckedChange={value => togglePhases(value === true)} /><span>Use phases</span></label>
              {values.usesPhases ? <Field className="min-w-0">
                <div className="flex min-h-8 items-center gap-2">
                  <Label htmlFor="draft-phase-count" className="shrink-0">Phase count</Label>
                  <Input id="draft-phase-count" className="w-24 shrink-0" type="number" min={2} max={100} value={phaseCountInput ?? phases.fields.length} onChange={event => setPhaseCountInput(event.target.value)} onBlur={event => resizePhases(Number(event.target.value))} aria-invalid={Boolean(phaseCountError)} aria-describedby="draft-phase-count-error" />
                </div>
                <FieldError id="draft-phase-count-error">{phaseCountError}</FieldError>
              </Field> : null}
            </div>
            <p className="text-xs text-muted-foreground">{values.usesPhases ? 'Each phase delivers its results before the next begins.' : 'Use phases for sequential delivery cohorts.'} Samples and sequencing runs are counted separately.</p>
          </CardContent>
        </Card>
        {phases.fields.map((phase, index) => <CommercialDraftPhaseFields key={`${phase.id}-${index}`} index={index} form={form} phased={values.usesPhases} actions={values.usesPhases ? <ActionMenu><DropdownMenuTrigger asChild><Button data-phase-actions-id={phase.id} type="button" variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem disabled={index === 0} onSelect={() => phases.move(index, index - 1)}>Move earlier</DropdownMenuItem><DropdownMenuItem disabled={index === phases.fields.length - 1} onSelect={() => phases.move(index, index + 1)}>Move later</DropdownMenuItem><DropdownMenuItem variant="destructive" disabled={phases.fields.length <= 2} onSelect={() => removePhase(index)}>Remove phase</DropdownMenuItem></DropdownMenuContent></ActionMenu> : null} />)}
        <CommercialDraftHandlingFields form={form} sampleType={data.sampleTypes.data?.find(type => type.id === values.sampleTypeDefinitionId)} />
      </fieldset>
      <Card><CardHeader><CardTitle>Order summary</CardTitle></CardHeader><CardContent><p>{totals.samples} samples · {totals.runs} sequencing runs{values.usesPhases ? ` · ${phases.fields.length} phases` : ''}</p><p className="mt-2 font-medium">Proposed subtotal: {totals.pricedPhases ? money(totals.proposed) : 'No price proposed'}{totals.pricedPhases > 0 && totals.pricedPhases < phases.fields.length ? ' · Some phases have no proposed price' : ''}</p><p className="mt-1 text-xs text-muted-foreground">Formal quote prices are reviewed by phase. Saving a Draft does not submit it for pricing or authorize laboratory work.</p></CardContent></Card>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div><RequiredLegend /><p className="mt-1 text-xs text-muted-foreground">Customer, Department and Job name are required to save. Complete the remaining required fields before submitting for pricing.</p></div><div className="flex flex-wrap gap-2"><Button asChild type="button" variant="outline"><Link to="/order-operations/lab-services" search={previous => ({ ...previous })}>Cancel</Link></Button><Button type="submit" variant="outline" disabled={busy}>{busy ? 'Saving…' : 'Save draft'}</Button><Button type="button" disabled={busy} onClick={() => void save(true)}>Submit for pricing</Button></div></footer>
    </form>
    <Dialog open={Boolean(phaseConfirmation)} onOpenChange={open => { if (!open) setPhaseConfirmation(null) }}>
      <DialogContent onOpenAutoFocus={event => { event.preventDefault(); cancelPhaseConfirmation.current?.focus() }} onCloseAutoFocus={event => { event.preventDefault(); document.querySelector<HTMLElement>(phaseConfirmationFocusSelector.current)?.focus() }}>
        <DialogHeader><DialogTitle>{phaseConfirmation?.title}</DialogTitle></DialogHeader>
        <div><DialogDescription className="pr-0 text-foreground">{phaseConfirmation?.description}</DialogDescription></div>
        <DialogFooter>
          <Button ref={cancelPhaseConfirmation} type="button" variant="outline" onClick={() => setPhaseConfirmation(null)}>Cancel</Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={() => {
            if (!phaseConfirmation || busy) return
            phaseConfirmationFocusSelector.current = phaseConfirmation.confirmedFocusSelector ?? phaseConfirmation.returnFocusSelector
            phaseConfirmation.apply()
            setPhaseConfirmation(null)
          }}>{phaseConfirmation?.confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </main>
}
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
