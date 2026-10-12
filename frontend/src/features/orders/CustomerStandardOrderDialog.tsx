import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { createCustomerStandardDraft, saveCustomerStandardDraft, reviewCustomerStandardDraft } from '#/api/customer-standard-orders'
import { listLabServiceOfferings, placeStandardLabOrder, type StandardLabOrderPreview } from '#/api/order-bundles'
import { getLabOrder, getOrderErrorMessage, isOrderConcurrencyError, listLabOrderSampleTypes, type LabServiceOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { usePhaenoSession } from '#/features/auth/session-context'
import { customerDraftPayload, customerDraftSchema, customerDraftValues, mergeCustomerDraft, type CustomerDraftForm, type CustomerDraftValues } from './customer-standard-order-form'

const money = (n: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
type Review = { order: LabServiceOrder; preview: StandardLabOrderPreview; key: string }
type Placement = { id: string; key: string; input: Parameters<typeof placeStandardLabOrder>[1] }

export function CustomerStandardOrderDialog({ open, order, onOpenChange, onSaved }: {
  open: boolean; order?: LabServiceOrder | null; onOpenChange: (open: boolean) => void; onSaved: (order: LabServiceOrder) => void | Promise<void>
}) {
  const __customerText = useCustomerText()

  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const client = useQueryClient()
  const enabled = open && authProvider !== 'mock' && Boolean(session?.capabilities.canCreateLabServiceRequests)
  const scopeKey = [selectedOrganizationId, selectedDepartmentId]
  const offerings = useQuery({ queryKey: ['lab-service-offerings', ...scopeKey], queryFn: () => listLabServiceOfferings(), enabled })
  const types = useQuery({ queryKey: ['lab-order-sample-types', ...scopeKey], queryFn: () => listLabOrderSampleTypes(false), enabled })
  const form = useForm<CustomerDraftForm, unknown, CustomerDraftValues>({ resolver: zodResolver(customerDraftSchema), defaultValues: customerDraftValues(order?.customerDraft), mode: 'onBlur' })
  const { isDirty: __formDraftDirty } = form.formState

  const sources = useFieldArray({ control: form.control, name: 'sources' })
  const [saved, setSaved] = useState<LabServiceOrder | null>(order ?? null)
  const [review, setReview] = useState<Review | null>(null)
  const [discard, setDiscard] = useState(false)
  const [po, setPo] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [typeConfirmed, setTypeConfirmed] = useState(false)
  const [reviewNeeded, setReviewNeeded] = useState(false)
  const [conflict, setConflict] = useState<{ order: LabServiceOrder; changes: Array<{ label: string; value: string }> } | null>(null)
  const [placementUncertain, setPlacementUncertain] = useState(false)
  const allowNavigation = useRef(false)
  const createAttempt = useRef<{ payload: string; key: string } | null>(null)
  const placementAttempt = useRef<Placement | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const heading = useRef<HTMLHeadingElement | null>(null)
  const initialKey = useRef<string | null>(null)
  const values = form.watch()
  const offering = offerings.data?.find(o => o.id === values.offeringId)
  const sampleType = types.data?.find(t => t.id === values.sampleTypeDefinitionId)
  const sampleCount = values.sources.reduce((sum, s) => sum + (Number(s.specimenCount) || 0), 0)
  const limit = offering?.maximumCustomerSamples
  const overLimit = limit != null && sampleCount > limit
  const requiresPo = session?.selectedDepartment?.purchaseOrderRequired === true
  const membership = session?.memberships.find(m => m.organizationId === selectedOrganizationId)
  const department = membership?.departments?.find(d => d.departmentId === selectedDepartmentId)

  async function retain(updated: LabServiceOrder) {
    setSaved(updated)
    client.setQueryData(['lab-service-order', updated.id], updated)
    await client.invalidateQueries({ queryKey: ['lab-service-orders'] })
  }
  const save = useMutation({
    mutationFn: async ({ values: input, action }: { values: CustomerDraftValues; action: 'save' | 'review' }) => {
      const payload = customerDraftPayload(input)
      let updated: LabServiceOrder
      if (saved) updated = await saveCustomerStandardDraft(saved.id, payload, saved.version)
      else {
        const fingerprint = JSON.stringify(payload)
        if (createAttempt.current?.payload !== fingerprint) createAttempt.current = { payload: fingerprint, key: crypto.randomUUID() }
        updated = await createCustomerStandardDraft(payload, createAttempt.current.key)
      }
      await retain(updated)
      form.reset(customerDraftValues(updated.customerDraft))
      if (action === 'review') {
        const result = await reviewCustomerStandardDraft(updated.id, updated.version)
        await retain(result.order)
        return { action, ...result }
      }
      return { action, order: updated, preview: null }
    },
    onSuccess: async result => {
      setReviewNeeded(false)
      if (result.preview) {
        setReview({ order: result.order, preview: result.preview, key: crypto.randomUUID() })
        setConfirmed(false); setTypeConfirmed(false); placementAttempt.current = null
        requestAnimationFrame(() => heading.current?.focus())
      } else { allowNavigation.current = true; await onSaved(result.order) }
    },
    onError: async error => {
      if (saved && isOrderConcurrencyError(error)) {
        try {
          const latest = await getLabOrder(saved.id)
          const baseline = customerDraftValues(saved.customerDraft)
          const incoming = customerDraftValues(latest.customerDraft)
          const merged = mergeCustomerDraft(baseline, form.getValues(), incoming)
          const fields: Array<{ key: keyof CustomerDraftForm; label: string; value: string }> = [
            { key: 'jobName', label: __customerText('m_be8102601363'), value: incoming.jobName },
            { key: 'offeringId', label: __customerText('m_d677190e0a99'), value: offerings.data?.find(o => o.id === incoming.offeringId)?.name ?? 'Changed service' },
            { key: 'sampleTypeDefinitionId', label: __customerText('m_1e3f2e3f87c9'), value: types.data?.find(t => t.id === incoming.sampleTypeDefinitionId)?.name ?? 'Changed Sample type' },
            { key: 'sources', label: __customerText('m_dd27813f7192'), value: incoming.sources.map(s => `${s.biologicalSource}: ${s.specimenCount} samples`).join('; ') },
            { key: 'differentStorage', label: __customerText('m_f14970c48bb7'), value: incoming.differentStorage ? 'Different requirements' : 'Sample type default' },
            { key: 'storageRequirements', label: __customerText('m_de7d3ccc26da'), value: incoming.storageRequirements || 'Sample type default' },
            { key: 'safetyDeclaration', label: __customerText('m_760ef4312b91'), value: incoming.safetyDeclaration || 'Empty' },
            { key: 'notes', label: __customerText('m_316085f93ffb'), value: incoming.notes || 'Empty' },
          ]
          form.reset(incoming)
          form.reset(merged, { keepDefaultValues: true })
          client.setQueryData(['lab-service-order', latest.id], latest)
          setConflict({ order: latest, changes: fields.filter(f => JSON.stringify(baseline[f.key]) !== JSON.stringify(incoming[f.key])) })
          setReviewNeeded(true)
        } catch { /* Keep entries and original version; a retry still cannot overwrite newer edits. */ }
      }
    },
  })
  const place = useMutation({
    mutationFn: async () => {
      if (!review || !review.preview.canPlaceStandardOrder || !review.preview.commercialProfileVersion) throw new Error('Refresh the order review before placement.')
      if (!placementAttempt.current) {
        if (!confirmed || !typeConfirmed || requiresPo && !po.trim()) throw new Error('Confirm the scope and Sample type, and enter any required purchase order number.')
        const p = review.preview
        placementAttempt.current = { id: review.order.id, key: review.key, input: {
          version: p.orderVersion, offeringId: p.offering.id, offeringVersion: p.offering.offeringVersion,
          offeringRecordVersion: p.offering.version, catalogItemVersion: p.offering.catalogItemVersion,
          commercialProfileVersion: p.commercialProfileVersion!, departmentVersion: p.departmentVersion,
          organizationVersion: p.organizationVersion, reviewToken: p.reviewToken, prohibitedDataConfirmed: true,
          purchaseOrderNumber: po.trim() || undefined, confirmedSampleTypeId: review.order.sampleTypeDefinitionId!,
        } }
      }
      const attempt = placementAttempt.current
      return placeStandardLabOrder(attempt.id, attempt.input, attempt.key)
    },
    onSuccess: async updated => { await retain(updated); allowNavigation.current = true; await onSaved(updated) },
    onError: error => {
      const uncertain = !axios.isAxiosError(error) || !error.response || error.response.status >= 500
      setPlacementUncertain(uncertain && placementAttempt.current != null)
      if (!uncertain) { placementAttempt.current = null; setReviewNeeded(true) }
    },
  })
  const busy = save.isPending || place.isPending
  const blocker = useBlocker({ shouldBlockFn: () => !allowNavigation.current && (__formDraftDirty || busy || placementUncertain), enableBeforeUnload: !allowNavigation.current && (__formDraftDirty || busy || placementUncertain), withResolver: true })
  const confirmingDiscard = discard || blocker.status === 'blocked'
  useEffect(() => {
    if (confirmingDiscard) document.getElementById('customer-order-keep-editing')?.focus()
  }, [confirmingDiscard])
  useEffect(() => {
    if (!open) { initialKey.current = null; return }
    const key = order?.id ?? 'new'
    if (initialKey.current === key) return
    initialKey.current = key; allowNavigation.current = false; setSaved(order ?? null)
    setReview(null); setConflict(null); form.reset(customerDraftValues(order?.customerDraft))
  }, [form, open, order])
  function close() {
    if (busy || placementUncertain) return
    if (confirmingDiscard) { setDiscard(false); if (blocker.status === 'blocked') blocker.reset(); return }
    if (__formDraftDirty) setDiscard(true)
    else { allowNavigation.current = true; onOpenChange(false) }
  }
  function back() {
    if (busy || placementUncertain) return
    setReview(null); place.reset(); setReviewNeeded(false)
    requestAnimationFrame(() => document.getElementById('customer-order-service')?.focus())
  }
  function submit(action: 'save' | 'review') {
    if (conflict) return
    void form.handleSubmit(input => {
      if (action === 'review') {
        let invalid = false
        const require = (field: 'offeringId' | 'sampleTypeDefinitionId' | 'safetyDeclaration' | 'storageRequirements', message: string) => { form.setError(field, { message }, { shouldFocus: !invalid }); invalid = true }
        if (!input.offeringId) require('offeringId', 'Select a service.')
        if (!input.sampleTypeDefinitionId) require('sampleTypeDefinitionId', 'Select a Sample type.')
        if (!input.safetyDeclaration) require('safetyDeclaration', 'Enter handling risks or “No known hazards”.')
        if (input.differentStorage && !input.storageRequirements) require('storageRequirements', 'Enter the different requirements, or use the Sample type default.')
        const seen = new Set<string>()
        input.sources.forEach((s, i) => {
          const key = s.biologicalSource.trim().replace(/\s+/g, ' ').toLowerCase()
          if (!key || seen.has(key)) { form.setError(`sources.${i}.biologicalSource`, { message: key ? 'Use a distinct biological source.' : 'Enter a biological source.' }, { shouldFocus: !invalid }); invalid = true }
          seen.add(key)
          if (s.specimenCount < 1) { form.setError(`sources.${i}.specimenCount`, { message: 'Enter at least one sample.' }, { shouldFocus: !invalid }); invalid = true }
        })
        if (invalid) return
      }
      save.mutate({ values: input, action })
    })()
  }
  const error = save.error ?? place.error
  return <Dialog open={open} onOpenChange={next => { if (!next) close() }}>
    <DialogContent className="sm:max-w-2xl" showCloseButton={!busy && !placementUncertain} onOpenAutoFocus={() => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }} onCloseAutoFocus={event => { if (opener.current?.isConnected) { event.preventDefault(); opener.current.focus() } }}>
      <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>{confirmingDiscard ? <CustomerSourceText source={"Discard unsaved order entries?"} /> : review ? "Review order" : saved ? "Edit order Draft" : __customerText('m_5b5c0ed8f6e6')}</DialogTitle><DialogDescription>{confirmingDiscard ? <CustomerSourceText source={"Your saved Draft remains available."} /> : __customerText('m_911709cc8725', { p0: String(department?.departmentName ?? 'Selected Department') })}</DialogDescription></DialogHeader>
      {conflict ? <DialogFeedback><Alert><AlertTitle><CustomerText message="m_06d588319607" /></AlertTitle><AlertDescription>
        <p><CustomerText message="m_2fb1f7bf0f40" /></p>
        <Button type="button" variant="outline" className="mt-2" onClick={() => { setSaved(conflict.order); setConflict(null); setReviewNeeded(false); save.reset(); requestAnimationFrame(() => document.getElementById('customer-order-job')?.focus()) }}><CustomerText message="m_b481cd15e8dc" /></Button>
      </AlertDescription></Alert></DialogFeedback> : null}
      {!conflict && (error || offerings.error || types.error || !enabled) ? <DialogFeedback><Alert variant="destructive"><AlertTitle>{placementUncertain ? <CustomerSourceText source={"Placement outcome is uncertain"} /> : __customerText('m_b5b254c35095')}</AlertTitle><AlertDescription>{placementUncertain ? <CustomerSourceText source={"Retry placement to recover the same order. Keep this review open; retrying will not create another commitment."} /> : getOrderErrorMessage(error ?? offerings.error ?? types.error, 'An active Customer administrator session and available services are required.')}{reviewNeeded ? <CustomerSourceText source={" The latest saved order is retained. Review the scope and refresh pricing before placement."} /> : ''}</AlertDescription></Alert></DialogFeedback> : null}
      {confirmingDiscard ? <>
        <div><DialogDescription><CustomerText message="m_4afcb8aab180" /></DialogDescription></div>
        <DialogFooter><Button id="customer-order-keep-editing" variant="outline" onClick={() => { setDiscard(false); if (blocker.status === 'blocked') blocker.reset() }}><CustomerText message="m_e76fd2add010" /></Button><Button variant="destructive" disabled={busy || placementUncertain} onClick={() => { allowNavigation.current = true; if (blocker.status === 'blocked') blocker.proceed(); else onOpenChange(false) }}><CustomerText message="m_f9bfa3dc7c8f" /></Button></DialogFooter>
      </> : review ? <>
        <div className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground"><CustomerText message="m_ad617a0fdd57" /></dt><dd>{review.order.customerReference}</dd></div><div><dt className="text-muted-foreground"><CustomerText message="m_d677190e0a99" /></dt><dd>{review.preview.offering.name}</dd></div><div><dt className="text-muted-foreground"><CustomerText message="m_1e3f2e3f87c9" /></dt><dd>{review.order.sampleTypeName}</dd></div><div><dt className="text-muted-foreground"><CustomerText message="m_50f9f19288fe" /></dt><dd>{money(review.preview.offering.unitPrice, review.preview.currency)} · {review.preview.priceProvenance?.source === 'Standard' ? <CustomerSourceText source={"Standard price"} /> : __customerText('m_650c47c5c9b5')}</dd></div></dl>
          <ul className="space-y-1 text-sm">{review.order.customerDraft?.sources.map((s, i) => <li key={i}>{s.biologicalSource}: {s.specimenCount} <CustomerText message="m_686dd98cc6fc" /></li>)}</ul>
          <p className="text-sm">{review.preview.specimenCount} <CustomerText message="m_64073cc097e0" />{money(review.preview.offering.unitPrice, review.preview.currency)} = {money(review.preview.subtotal, review.preview.currency)}</p>
          <dl className="grid gap-2 text-sm"><div className="flex justify-between"><dt><CustomerText message="m_47e2886ee5d3" /></dt><dd>{review.preview.tax == null ? <CustomerSourceText source={"Pending Finance setup"} /> : money(review.preview.tax, review.preview.currency)}</dd></div><div className="flex justify-between font-semibold"><dt><CustomerText message="m_c9b3c38247f7" /></dt><dd>{review.preview.total == null ? <CustomerSourceText source={"Not available"} /> : money(review.preview.total, review.preview.currency)}</dd></div></dl>
          <p className="text-xs text-muted-foreground"><CustomerText message="m_d5b76e17a87c" />{review.preview.offering.maximumTurnaroundDays} <CustomerText message="m_b0a7c8642140" /></p>
          {review.preview.blockers.length ? <Alert><AlertTitle><CustomerText message="m_cb546c50ca43" /></AlertTitle><AlertDescription><ul className="list-disc pl-4">{review.preview.blockers.map(b => <li key={b}>{b}</li>)}</ul></AlertDescription></Alert> : null}
          <p className="text-sm text-muted-foreground"><CustomerText message="m_d1aa3ddc5c81" /></p>
          <fieldset disabled={busy || placementUncertain} className="space-y-4">
            <Field><Label htmlFor="customer-order-po">{requiresPo ? <RequiredFieldName><CustomerText message="m_65b4c1324e67" /></RequiredFieldName> : __customerText('m_f04d695faf06')}</Label><Input id="customer-order-po" maxLength={255} value={po} onChange={e => setPo(e.target.value)} /></Field>
            <label htmlFor="customer-order-confirm-type" className="flex cursor-pointer items-start gap-2"><Checkbox id="customer-order-confirm-type" checked={typeConfirmed} onCheckedChange={v => setTypeConfirmed(v === true)} /><span className="text-sm"><RequiredFieldName><CustomerText message="m_be2789b24a43" /></RequiredFieldName></span></label>
            <label htmlFor="customer-order-confirm-scope" className="flex cursor-pointer items-start gap-2"><Checkbox id="customer-order-confirm-scope" checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} /><span className="text-sm"><RequiredFieldName><CustomerText message="m_ba3492dc56be" /></RequiredFieldName></span></label>
          </fieldset>
        </div>
        <RequiredDialogFooter><Button variant="outline" disabled={busy || placementUncertain} onClick={back}>{reviewNeeded ? <CustomerSourceText source={"Refresh review"} /> : __customerText('m_edcd18a75f92')}</Button><Button disabled={!enabled || busy || reviewNeeded || !review.preview.canPlaceStandardOrder || !confirmed || !typeConfirmed || requiresPo && !po.trim()} onClick={() => place.mutate()}>{place.isPending ? <CustomerSourceText source={"Placing…"} /> : placementUncertain ? "Retry placement" : __customerText('m_17eb518d8561')}</Button></RequiredDialogFooter>
      </> : <>
        <form id="customer-order-scope" noValidate onSubmit={e => { e.preventDefault(); submit('review') }}>
          {conflict?.changes.length ? <section aria-label={__customerText('m_0ae07b1f302d')} className="mb-4 rounded-lg border p-3 text-sm">
            <h3 className="mb-2 font-medium"><CustomerText message="m_5e738362aef4" /></h3>
            <dl className="space-y-2">{conflict.changes.map(change => <div key={change.label} className="break-words"><dt className="font-medium">{change.label}</dt><dd>{change.value}</dd></div>)}</dl>
          </section> : null}
          <fieldset disabled={busy} className="space-y-4">
            <Field><Label htmlFor="customer-order-service"><RequiredFieldName><CustomerText message="m_d677190e0a99" /></RequiredFieldName></Label><NativeSelect id="customer-order-service" {...form.register('offeringId')} aria-invalid={Boolean(form.formState.errors.offeringId)} aria-describedby="customer-order-service-error"><option value=""><CustomerText message="m_75c533071d94" /></option>{offerings.data?.map(o => <option key={o.id} value={o.id}>{o.name} · {money(o.unitPrice, o.currency)} <CustomerText message="m_99f779ccfb3f" /></option>)}</NativeSelect><FieldError id="customer-order-service-error">{form.formState.errors.offeringId?.message}</FieldError><FieldDescription><CustomerText message="m_8c747669a123" /></FieldDescription>{offering ? <p className="text-sm">{money(offering.unitPrice, offering.currency)} <CustomerText message="m_9e8e42a74c9a" />{offering.priceProvenance?.source === 'Standard' ? <CustomerSourceText source={"Standard price"} /> : __customerText('m_650c47c5c9b5')}</p> : null}</Field>
            <Field><Label htmlFor="customer-order-job"><RequiredFieldName><CustomerText message="m_be8102601363" /></RequiredFieldName></Label><Input id="customer-order-job" {...form.register('jobName')} aria-invalid={Boolean(form.formState.errors.jobName)} aria-describedby="customer-order-job-error" /><FieldError id="customer-order-job-error">{form.formState.errors.jobName?.message}</FieldError></Field>
            <Field><Label htmlFor="customer-order-type"><RequiredFieldName><CustomerText message="m_1e3f2e3f87c9" /></RequiredFieldName></Label><NativeSelect id="customer-order-type" {...form.register('sampleTypeDefinitionId')} aria-invalid={Boolean(form.formState.errors.sampleTypeDefinitionId)} aria-describedby="customer-order-type-error"><option value=""><CustomerText message="m_14e39b4fecf3" /></option>{types.data?.filter(t => !offering || offering.supportedSampleTypes?.some(s => s.id === t.id && s.isAvailable)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</NativeSelect><FieldError id="customer-order-type-error">{form.formState.errors.sampleTypeDefinitionId?.message}</FieldError></Field>
            <fieldset className="space-y-3"><legend className="flex w-full items-center justify-between gap-3 text-sm"><span><CustomerText message="m_f83705d0366c" /></span><Button type="button" variant="outline" onClick={() => sources.append({ biologicalSource: '', specimenCount: 1 })}><CustomerText message="m_6ea6c9ec2a76" /></Button></legend>
              {sources.fields.map((s, i) => <div key={s.id} className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_auto]"><Field><Label htmlFor={`customer-source-${i}`}><RequiredFieldName><CustomerText message="m_62cda8311410" /></RequiredFieldName></Label><Input id={`customer-source-${i}`} placeholder={__customerText('m_997968dba4b2')} {...form.register(`sources.${i}.biologicalSource`)} aria-invalid={Boolean(form.formState.errors.sources?.[i]?.biologicalSource)} aria-describedby={`customer-source-${i}-error`} /><FieldError id={`customer-source-${i}-error`}>{form.formState.errors.sources?.[i]?.biologicalSource?.message}</FieldError></Field><Field><Label htmlFor={`customer-count-${i}`}><RequiredFieldName><CustomerText message="m_bc228b269ce0" /></RequiredFieldName></Label><Input id={`customer-count-${i}`} type="number" min={0} max={10000} {...form.register(`sources.${i}.specimenCount`)} aria-invalid={Boolean(form.formState.errors.sources?.[i]?.specimenCount)} aria-describedby={`customer-count-${i}-error`} /><FieldError id={`customer-count-${i}-error`}>{form.formState.errors.sources?.[i]?.specimenCount?.message}</FieldError></Field><Button className="sm:mt-7" type="button" variant="outline" disabled={sources.fields.length === 1} aria-label={__customerText('m_db296ea0f74f', { p0: String(i + 1) })} onClick={() => sources.remove(i)}><CustomerText message="m_c3812fc4acb8" /></Button></div>)}
              <FieldError>{form.formState.errors.sources?.root?.message ?? form.formState.errors.sources?.message}</FieldError>
              <p className="text-sm" aria-live="polite"><CustomerText message="m_40f61e50877a" />{sampleCount}{limit != null ? __customerText('m_f45a386a1b9b', { p0: String(limit) }) : ''}</p>
              {offering ? <p className={overLimit || limit == null ? "text-sm text-destructive" : "text-xs text-muted-foreground"} role={overLimit || limit == null ? "alert" : undefined}>{limit == null ? <CustomerSourceText source={"Customer ordering is unavailable until Phaeno configures this service’s sample limit. Contact your sales representative."} /> : __customerText('m_bd739b7832cb', { p0: String(limit) })}</p> : null}
              <p className="text-xs text-muted-foreground"><CustomerText message="m_277740708e1a" /></p>
            </fieldset>
            <Field><Label htmlFor="customer-order-safety"><RequiredFieldName><CustomerText message="m_760ef4312b91" /></RequiredFieldName></Label><FieldDescription><CustomerText message="m_d3a5b1d222f0" /></FieldDescription><Textarea id="customer-order-safety" {...form.register('safetyDeclaration')} aria-invalid={Boolean(form.formState.errors.safetyDeclaration)} aria-describedby="customer-order-safety-error" /><FieldError id="customer-order-safety-error">{form.formState.errors.safetyDeclaration?.message}</FieldError></Field>
            <Field><Label htmlFor="customer-order-notes"><CustomerText message="m_04bf673731f7" /></Label><FieldDescription><CustomerText message="m_499f755edc6c" /></FieldDescription><Textarea id="customer-order-notes" {...form.register('notes')} aria-invalid={Boolean(form.formState.errors.notes)} aria-describedby="customer-order-notes-error" /><FieldError id="customer-order-notes-error">{form.formState.errors.notes?.message}</FieldError></Field>
            <Field><Label><CustomerText message="m_de7d3ccc26da" /></Label><p className="text-xs text-muted-foreground">{sampleType?.storageRequirements || 'Select a Sample type to see its configured storage requirements.'}</p><label htmlFor="customer-order-different-storage" className="flex cursor-pointer items-center gap-2"><Checkbox id="customer-order-different-storage" checked={values.differentStorage} onCheckedChange={v => form.setValue('differentStorage', v === true, { shouldDirty: true })} /><span className="text-sm"><CustomerText message="m_65259cd887c1" /></span></label>{values.differentStorage ? <><Label htmlFor="customer-order-storage"><RequiredFieldName><CustomerText message="m_e1bc22545270" /></RequiredFieldName></Label><Textarea id="customer-order-storage" {...form.register('storageRequirements')} aria-invalid={Boolean(form.formState.errors.storageRequirements)} aria-describedby="customer-order-storage-error" /><FieldError id="customer-order-storage-error">{form.formState.errors.storageRequirements?.message}</FieldError></> : null}</Field>
          </fieldset>
        </form>
        <RequiredDialogFooter><Button variant="outline" disabled={busy} onClick={close}><CustomerText message="m_19766ed6ccb2" /></Button><Button variant="outline" disabled={!enabled || busy || Boolean(conflict)} onClick={() => submit('save')}>{save.isPending ? <CustomerSourceText source={"Saving…"} /> : __customerText('m_3de100106dd4')}</Button><Button type="submit" form="customer-order-scope" disabled={!enabled || busy || Boolean(conflict) || offerings.isPending || types.isPending || !offering || limit == null || overLimit}><CustomerText message="m_f5ca54883e17" /></Button></RequiredDialogFooter>
      </>}
    </DialogContent>
  </Dialog>
}
