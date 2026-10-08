import { ActionMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { useState } from 'react'
import { z } from 'zod'
import type { LabPhasePlan, PhaseBillingPlan } from '#/api/lab-phases'
import { getOrderErrorMessage } from '#/api/order-management'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useLabPhaseWrite } from './use-lab-phases'
import { useOrderDraftGuard } from './use-order-draft-guard'

const reasonSchema = z.object({ reason: z.string().trim().min(1, 'Enter a reason.').max(2000) })
const phaseSchema = z.object({
  reason: z.string().trim().min(1, 'Enter the reason for this plan.').max(2000),
  phases: z.array(z.object({ id: z.string().nullable(), name: z.string().trim().min(1, 'Enter a phase name.').max(150),
    sampleCount: z.number().int().min(1), turnaroundBusinessDays: z.number().int().min(1).max(365),
    acceptedSubtotal: z.number().min(0).multipleOf(0.01), carriedInvoicedSubtotal: z.number().min(0).multipleOf(0.01),
    sampleIds: z.array(z.string()), })).min(1).max(100),
})
type PhaseForm = z.infer<typeof phaseSchema>
export function PhasePlanDialog({ orderId, plan, amendment, onSaved, onClose }: { orderId: string; plan: LabPhasePlan; amendment: boolean; onSaved: () => Promise<unknown>; onClose: () => void }) {
  const form = useForm<PhaseForm>({ resolver: zodResolver(phaseSchema), defaultValues: { reason: '', phases: plan.phases.map(p => ({ id: p.id, name: p.name, sampleCount: p.sampleCount,
    turnaroundBusinessDays: p.turnaroundBusinessDays ?? 10, acceptedSubtotal: p.acceptedSubtotal, carriedInvoicedSubtotal: p.carriedInvoicedSubtotal, sampleIds: p.sampleIds })) } })
  const fields = useFieldArray({ control: form.control, name: 'phases', keyName: 'fieldKey' })
  const values = form.watch('phases')
  const [sampleSearch, setSampleSearch] = useState('')
  const [samplePage, setSamplePage] = useState(0)
  const matchingSamples = plan.samples.filter(s => s.name.toLocaleLowerCase().includes(sampleSearch.trim().toLocaleLowerCase()))
  const mutation = useLabPhaseWrite(orderId, true, onSaved)
  useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  const fixed = (id: string | null) => amendment && plan.phases.some(p => p.id === id && ['InProgress', 'ResultsDelivered', 'Cancelled'].includes(p.lifecycle))
  function close() { if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard unsaved phase changes?'))) onClose() }
  const submit = form.handleSubmit(async input => {
    if (input.phases.reduce((sum, p) => sum + p.sampleCount, 0) !== plan.sampleCount) { form.setError('root', { message: `Phase counts must total ${plan.sampleCount} samples.` }); return }
    if (amendment && input.phases.reduce((sum, p) => sum + Math.round(p.acceptedSubtotal * 100), 0) !== Math.round(plan.acceptedSubtotal * 100)) { form.setError('root', { message: 'Phase amounts must preserve the accepted Job subtotal.' }); return }
    try { await mutation.mutateAsync({ path: amendment ? 'proposals' : 'configure', input: { revision: plan.revision, ...input } }); onClose() } catch { /* Retain values and the same retry identity. */ }
  })
  function remove(index: number) {
    if (values[index].sampleIds.length) { form.setError('root', { message: 'Move the eligible samples to another phase before removing this phase.' }); return }
    fields.remove(index)
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="sm:max-w-4xl">
    <DialogHeader><DialogTitle>{amendment ? 'Propose rephasing' : 'Configure phases'}</DialogTitle><DialogDescription>{amendment ? 'Only unsent future samples can move. Customer acceptance applies this exact proposal after current shipping and work facts are rechecked.' : 'Set the sequential cohorts, business-day expectations and explicit priced portions before issuing the quote. A single default phase uses the full quoted subtotal.'}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4" id="phase-plan-form">
      <p className="text-sm">{values.reduce((sum, p) => sum + (p.sampleCount || 0), 0)} / {plan.sampleCount} samples · Subtotal {values.reduce((sum, p) => sum + (p.acceptedSubtotal || 0), 0).toFixed(2)} {plan.currency}{amendment ? ` / ${plan.acceptedSubtotal.toFixed(2)} accepted` : ''}</p>
      {fields.fields.map((field, index) => <fieldset key={field.fieldKey} disabled={mutation.isPending || fixed(field.id)} className="space-y-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-semibold">Phase {index + 1}{fixed(field.id) ? ' · Scope fixed' : ''}</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label htmlFor={`phase-name-${index}`}><RequiredFieldName>Name</RequiredFieldName></Label><Input id={`phase-name-${index}`} aria-invalid={Boolean(form.formState.errors.phases?.[index]?.name)} aria-describedby={`phase-errors-${index}`} {...form.register(`phases.${index}.name`)} /></div>
          <div><Label htmlFor={`phase-count-${index}`}><RequiredFieldName>Samples</RequiredFieldName></Label><Input id={`phase-count-${index}`} type="number" min={1} max={10000} aria-describedby={`phase-errors-${index}`} {...form.register(`phases.${index}.sampleCount`, { valueAsNumber: true })} /></div>
          <div><Label htmlFor={`phase-tat-${index}`}><RequiredFieldName>TAT (business days)</RequiredFieldName></Label><Input id={`phase-tat-${index}`} type="number" min={1} max={365} aria-describedby={`phase-errors-${index}`} {...form.register(`phases.${index}.turnaroundBusinessDays`, { valueAsNumber: true })} /></div>
          <div><Label htmlFor={`phase-price-${index}`}><RequiredFieldName>Accepted subtotal ({plan.currency})</RequiredFieldName></Label><Input id={`phase-price-${index}`} type="number" min={0} step="0.01" aria-describedby={`phase-errors-${index}`} {...form.register(`phases.${index}.acceptedSubtotal`, { valueAsNumber: true })} /></div>
        </div>
        {amendment && !field.id && plan.phases.some(p => p.invoicedSubtotal > 0) ? <div><Label htmlFor={`phase-carry-${index}`}>Previously invoiced subtotal carried to this phase</Label><Input id={`phase-carry-${index}`} type="number" min={0} step="0.01" {...form.register(`phases.${index}.carriedInvoicedSubtotal`, { valueAsNumber: true })} /><p className="text-xs text-muted-foreground">Attribute billing from replaced phases. Issued invoices retain their original phase snapshots.</p></div> : null}
        <div id={`phase-errors-${index}`}><FieldError>{Object.values(form.formState.errors.phases?.[index] ?? {}).map(e => typeof e === 'object' && 'message' in e ? e.message : '').filter(Boolean).join(' ')}</FieldError></div>
        <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent>
          <DropdownMenuItem disabled={index === 0 || fixed(values[index - 1]?.id ?? null)} onSelect={() => fields.move(index, index - 1)}>Move earlier</DropdownMenuItem>
          <DropdownMenuItem disabled={index === fields.fields.length - 1 || fixed(values[index + 1]?.id ?? null)} onSelect={() => fields.move(index, index + 1)}>Move later</DropdownMenuItem>
          <DropdownMenuItem disabled={fields.fields.length === 1 || plan.samples.some(s => s.phaseId === field.id && !s.canRephase)} onSelect={() => remove(index)}>Remove phase</DropdownMenuItem>
        </DropdownMenuContent></ActionMenu>
      </fieldset>)}
      <Button type="button" variant="outline" disabled={mutation.isPending || fields.fields.length >= 100} onClick={() => fields.append({ id: null, name: `Phase ${fields.fields.length + 1}`, sampleCount: 1, turnaroundBusinessDays: 10, acceptedSubtotal: 0, carriedInvoicedSubtotal: 0, sampleIds: [] })}>Add phase</Button>
      {plan.samples.length ? <details className="rounded-md border p-3" open><summary className="cursor-pointer font-medium">Sample assignments</summary><p className="my-2 text-sm text-muted-foreground">Sending any required tube fixes the whole sample's assignment. Received and started samples also remain fixed.</p><Label htmlFor="phase-sample-search">Find sample</Label><Input id="phase-sample-search" value={sampleSearch} onChange={e => { setSampleSearch(e.target.value); setSamplePage(0) }} /><div className="max-h-72 space-y-2 overflow-auto">{matchingSamples.slice(samplePage * 25, samplePage * 25 + 25).map(sample => {
        const selected = values.findIndex(p => p.sampleIds.includes(sample.id))
        return <div key={sample.id} className="grid items-center gap-2 sm:grid-cols-2"><Label htmlFor={`sample-phase-${sample.id}`}>{sample.name}{!sample.canRephase || fixed(sample.phaseId) ? ' · Fixed' : ''}</Label><select id={`sample-phase-${sample.id}`} className="h-9 w-full rounded-md border bg-background px-3 text-sm" disabled={mutation.isPending || amendment && (!sample.canRephase || fixed(sample.phaseId))} value={selected} onChange={event => {
          const next = Number(event.target.value)
          form.setValue('phases', values.map((p, i) => ({ ...p, sampleIds: [...p.sampleIds.filter(id => id !== sample.id), ...(i === next ? [sample.id] : [])] })), { shouldDirty: true })
        }}>{values.map((p, i) => <option key={p.id ?? i} value={i} disabled={fixed(p.id)}>{i + 1}. {p.name}</option>)}</select></div>
      })}</div><div className="mt-3 flex items-center gap-2"><Button type="button" variant="outline" disabled={samplePage === 0} onClick={() => setSamplePage(p => p - 1)}>Previous samples</Button><span className="text-sm" role="status">{matchingSamples.length} samples · Page {samplePage + 1}</span><Button type="button" variant="outline" disabled={(samplePage + 1) * 25 >= matchingSamples.length} onClick={() => setSamplePage(p => p + 1)}>Next samples</Button></div></details> : null}
      <div><Label htmlFor="phase-plan-reason"><RequiredFieldName>Reason</RequiredFieldName></Label><Textarea id="phase-plan-reason" aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby="phase-plan-reason-error" disabled={mutation.isPending} {...form.register('reason')} /><FieldError id="phase-plan-reason-error">{form.formState.errors.reason?.message}</FieldError></div>
    </form>
    {form.formState.errors.root || mutation.error ? <DialogFeedback><p role="alert">{form.formState.errors.root?.message ?? getOrderErrorMessage(mutation.error, 'The phase plan could not be saved. Review your entries or retry.')} Current entries are retained. Close and refresh the Job if the plan or shipping facts changed.</p></DialogFeedback> : null}
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="phase-plan-form" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : amendment ? 'Submit for Customer acceptance' : 'Save phase plan'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

export type PhaseReasonAction = { title: string; description: string; path: string; input: Record<string, unknown>; internal: boolean; review?: string; variant?: 'default' | 'destructive' }
export function PhaseReasonDialog({ orderId, action, onSaved, onClose }: { orderId: string; action: PhaseReasonAction; onSaved: () => Promise<unknown>; onClose: () => void }) {
  const form = useForm({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } })
  const mutation = useLabPhaseWrite(orderId, action.internal, onSaved)
  useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  function close() { if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard the unsaved reason?'))) onClose() }
  return <Dialog open onOpenChange={value => { if (!value) close() }}><DialogContent><DialogHeader><DialogTitle>{action.title}</DialogTitle><DialogDescription>{action.description}</DialogDescription></DialogHeader>
    <form id="phase-reason-form" onSubmit={form.handleSubmit(async value => { try { await mutation.mutateAsync({ path: action.path, input: { ...action.input, ...value } }); onClose() } catch { /* Retain review. */ } })} className="space-y-3">
      {action.review ? <p className="whitespace-pre-wrap text-sm">{action.review}</p> : null}
      <Label htmlFor="phase-reason"><RequiredFieldName>Reason</RequiredFieldName></Label><Textarea id="phase-reason" disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby="phase-reason-error" {...form.register('reason')} /><FieldError id="phase-reason-error">{form.formState.errors.reason?.message}</FieldError>
    </form>
    {mutation.error ? <DialogFeedback><p role="alert">{getOrderErrorMessage(mutation.error, 'The decision could not be saved. Refresh to review changed facts or retry this operation.')}</p></DialogFeedback> : null}
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="phase-reason-form" variant={action.variant} disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : action.title}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

const invoiceSchema = z.object({ parts: z.array(z.object({ phaseId: z.string(), subtotal: z.number().min(0).multipleOf(0.01) })) })
export function PhaseInvoiceDialog({ orderId, plan, onSaved, onClose }: { orderId: string; plan: PhaseBillingPlan; onSaved: () => Promise<unknown>; onClose: () => void }) {
  const eligible = plan.phases.filter(p => p.lifecycle !== 'Cancelled' && p.acceptedSubtotal > p.invoicedSubtotal)
  const form = useForm({ resolver: zodResolver(invoiceSchema), defaultValues: { parts: eligible.map(p => ({ phaseId: p.id, subtotal: 0 })) } })
  const mutation = useLabPhaseWrite(orderId, true, onSaved)
  useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  function close() { if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard unsaved invoice portions?'))) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><DialogHeader><DialogTitle>Issue phase invoice</DialogTitle><DialogDescription>Choose agreed billing portions for one or several phases, upfront or after delivery. Zero omits a phase. This issues an immutable invoice PDF using accepted billing and tax snapshots.</DialogDescription></DialogHeader>
    <form id="phase-invoice-form" className="space-y-3" onSubmit={form.handleSubmit(async value => {
      const parts = value.parts.filter(p => p.subtotal > 0)
      if (!parts.length) { form.setError('root', { message: 'Enter at least one positive billing portion.' }); return }
      try { await mutation.mutateAsync({ path: 'invoices', input: { revision: plan.revision, parts } }); onClose() } catch { /* Retain amounts. */ }
    })}>
      {eligible.map((phase, i) => <div key={phase.id}><Label htmlFor={`phase-invoice-${i}`}><RequiredFieldName>{phase.name} subtotal ({plan.currency})</RequiredFieldName></Label><p className="mb-1 text-sm text-muted-foreground">{(phase.acceptedSubtotal - phase.invoicedSubtotal).toFixed(2)} remaining accepted subtotal · {phase.lifecycle}</p><Input id={`phase-invoice-${i}`} type="number" min={0} max={phase.acceptedSubtotal - phase.invoicedSubtotal} step="0.01" disabled={mutation.isPending} aria-describedby={`invoice-error-${i}`} {...form.register(`parts.${i}.subtotal`, { valueAsNumber: true })} /><FieldError id={`invoice-error-${i}`}>{form.formState.errors.parts?.[i]?.subtotal?.message}</FieldError></div>)}
      <p className="text-sm">Subtotal to invoice: {form.watch('parts').reduce((sum, p) => sum + (p.subtotal || 0), 0).toFixed(2)} {plan.currency}. Tax is calculated from accepted quote decisions. Payment does not gate result delivery.</p>
    </form>
    {form.formState.errors.root || mutation.error ? <DialogFeedback><p role="alert">{form.formState.errors.root?.message ?? getOrderErrorMessage(mutation.error, 'Invoice issuance could not be confirmed. Retry to recover the same operation.')}</p></DialogFeedback> : null}
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="phase-invoice-form" disabled={mutation.isPending}>{mutation.isPending ? 'Issuing…' : 'Issue invoice'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
