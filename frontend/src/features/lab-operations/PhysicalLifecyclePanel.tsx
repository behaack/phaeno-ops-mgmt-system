import { LoadingState } from '#/components/ui/content-state'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useBlocker } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getPhysicalState, recordPhysicalEvent, type PhysicalState } from '#/api/lab-physical'
import type { LabContainer } from '#/api/lab-operations'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { Button } from '#/components/ui/button'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { DisplayTimestamp } from '#/components/ui/display-value'
import { confirmPortal } from '#/components/PortalConfirmation'
import { EvidenceDetails, EvidenceError } from './InvestigationEvidence'
import { StorageBoxDialog, boxLocation } from './StorageBoxDialog'

function returnToTubeActions(event: Event) {
  const target = document.getElementById('lab-tube-actions')
  if (target) { event.preventDefault(); target.focus() }
}

export function PhysicalLifecyclePanel({ tube, action, supervise, onClose, onSaved }: { tube: LabContainer; action: 'physical' | 'box' | null; supervise: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const state = useQuery({ queryKey: ['lab-physical', tube.id], queryFn: () => getPhysicalState(tube.id) })
  const [barcode, setBarcode] = useState('')
  const [boxBarcode, setBoxBarcode] = useState<string | null>(null)
  return <Card><CardHeader><CardTitle>Physical lifecycle and registered storage</CardTitle></CardHeader><CardContent className="space-y-3">
    {state.isPending ? <LoadingState label="Loading physical history…" /> : state.isError ? <><EvidenceError error={state.error} /><Button variant="outline" onClick={() => void state.refetch()}>Retry</Button></> : state.data ? <>
      <p className="break-words">{state.data.box ? `${state.data.box.barcode}: ${boxLocation(state.data.box)}${state.data.storagePosition ? ` · Tube position ${state.data.storagePosition}` : ''}` : tube.location ? `${tube.location} · Box hierarchy not yet registered for this tube` : 'No current laboratory storage'}</p>
      <p>Retain until: {state.data.retainUntilUtc ? <DisplayTimestamp value={state.data.retainUntilUtc} /> : state.data.trialTerms ? 'Begins at Trial closure under frozen terms' : 'Not set — use the Job’s agreed terms'}</p>
      {state.data.physicalHoldReason || state.data.trialHold ? <p role="status">Preservation hold: {state.data.physicalHoldReason ?? 'Trial hold'}</p> : null}
      {state.data.trialTerms ? <p className="text-sm">Trial frozen disposition: {state.data.trialTerms.materialDisposition}{state.data.trialTerms.returnDestination ? ` · ${state.data.trialTerms.returnDestination}` : ''}{state.data.trialTerms.returnHandling ? ` · Handling: ${state.data.trialTerms.returnHandling}` : ''}{state.data.trialTerms.returnShippingPayer ? ` · Shipping payer: ${state.data.trialTerms.returnShippingPayer}` : ''}</p> : null}
      <p className="text-sm text-muted-foreground">A due date never records automatic disposition. Physical material and scientific-file retention are separate.</p>
      {state.data.history.limited ? <p role="alert">This history exceeds the display limit and is incomplete.</p> : null}
      <details><summary className="cursor-pointer">Physical and box movement history ({state.data.history.events.length + state.data.history.boxMoves.length})</summary><ol className="mt-3 space-y-3">
        {state.data.history.events.map(event => <li key={event.id} className="rounded border p-3 text-sm"><p className="font-medium">{event.kind}</p><p>Actual <DisplayTimestamp value={event.occurredAtUtc} seconds /> · Recorded <DisplayTimestamp value={event.recordedAtUtc} seconds /></p><p>Operator: {event.actorUserId}</p><p>{event.reason}</p><details><summary className="cursor-pointer">Recorded facts</summary><EvidenceDetails value={event.detailsJson} /></details></li>)}
        {state.data.history.boxMoves.map(move => <li key={move.id} className="rounded border p-3 text-sm"><p className="font-medium">Box moved during recorded occupancy</p><p><DisplayTimestamp value={move.recordedAtUtc} seconds /> · Operator {move.actorUserId}</p><p>{move.reason}</p><EvidenceDetails value={move.detailsJson} /></li>)}
        {state.data.history.locations.map(location => <li key={`location-${location.physicalEventId}`} className="rounded border p-3 text-sm"><p className="font-medium">Registered location when placed</p><p><DisplayTimestamp value={location.occurredAtUtc} seconds /></p>{location.location ? <p className="break-words">{location.location.room} / {location.location.freezer} / {location.location.rack} / {location.location.shelf}</p> : null}<p>{location.availability}</p></li>)}
      </ol></details>
    </> : null}
    {action === 'physical' && state.data ? <PhysicalDialog tube={tube} state={state.data} supervise={supervise} onClose={onClose} onSaved={onSaved} /> : null}
    {action === 'box' ? <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent onCloseAutoFocus={returnToTubeActions} onOpenAutoFocus={event => { event.preventDefault(); (event.target as HTMLElement).querySelector<HTMLButtonElement>('[data-slot="dialog-footer"] button')?.focus() }}><DialogHeader><DialogTitle>Find freezer box</DialogTitle><DialogDescription>Scan the box to register its location or record a collective move.</DialogDescription></DialogHeader><form id="find-freezer-box" onSubmit={event => { event.preventDefault(); if (barcode.trim()) setBoxBarcode(barcode.trim()) }}><Field><Label htmlFor="find-box"><RequiredFieldName>Box barcode</RequiredFieldName></Label><Input id="find-box" required maxLength={255} value={barcode} onChange={event => setBarcode(event.target.value)} /></Field></form><RequiredDialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="find-freezer-box">Look up box</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
    {boxBarcode ? <StorageBoxDialog barcode={boxBarcode} mode="move" onClose={() => setBoxBarcode(null)} onConfirmed={async () => { setBoxBarcode(null); onClose(); await onSaved() }} /> : null}
  </CardContent></Card>
}

const schema = z.object({ kind: z.string(), scannedBarcode: z.string().trim().min(1), reason: z.string().trim().min(1).max(1000), occurredAt: z.string(), method: z.string().trim().max(500), destination: z.string().trim().max(1000), trackingReference: z.string().trim().max(500), retainUntilUtc: z.string(), position: z.string().trim().max(30), measuredQuantityText: z.string().trim(), measuredQuantityUnit: z.string().trim().max(50) }).superRefine((v, ctx) => {
  if (['Exhausted', 'Destroyed', 'Returned', 'Transferred'].includes(v.kind) && (!v.method || !v.occurredAt)) ctx.addIssue({ code: 'custom', path: ['method'], message: 'Record the actual date/time and method.' })
  if (['Placed', 'Returned', 'Transferred'].includes(v.kind) && !v.destination) ctx.addIssue({ code: 'custom', path: ['destination'], message: 'Enter the destination.' })
  if (['Returned', 'Transferred'].includes(v.kind) && !v.trackingReference) ctx.addIssue({ code: 'custom', path: ['trackingReference'], message: 'Record the shipment or handover tracking reference.' })
  if (v.occurredAt && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?[+-]\d{2}:\d{2}$/.test(v.occurredAt)) ctx.addIssue({ code: 'custom', path: ['occurredAt'], message: 'Include the actual UTC offset. Seconds and up to six fractional digits can distinguish handling within one minute.' })
})
function PhysicalDialog({ tube, state, supervise, onClose, onSaved }: { tube: LabContainer; state: PhysicalState; supervise: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { kind: 'Placed', scannedBarcode: '', reason: '', occurredAt: '', method: '', destination: '', trackingReference: '', retainUntilUtc: '', position: '', measuredQuantityText: '', measuredQuantityUnit: tube.quantityUnit ?? '' } })
  const request = useRef<{ hash: string; id: string } | null>(null)
  const [box, setBox] = useState<string | null>(null)
  const save = useMutation({ mutationFn: (v: z.infer<typeof schema>) => {
    const hash = JSON.stringify(v)
    if (request.current?.hash !== hash) request.current = { hash, id: crypto.randomUUID() }
    return recordPhysicalEvent(tube.id, { ...v, requestId: request.current.id, version: tube.version, occurredAt: v.occurredAt || undefined, measuredQuantityText: v.measuredQuantityText || undefined, measuredQuantityUnit: v.measuredQuantityText ? v.measuredQuantityUnit : undefined, retainUntilUtc: v.retainUntilUtc ? `${v.retainUntilUtc}T00:00:00Z` : null })
  }, onSuccess: async () => { await onSaved(); onClose() } })
  const kind = form.watch('kind')
  const terminal = ['Exhausted', 'Returned', 'Transferred', 'Destroyed'].includes(kind)
  const dirty = form.formState.isDirty
  const close = async () => { if (!save.isPending && (!dirty || await confirmPortal('Discard the unsaved physical record?'))) onClose() }
  useBlocker({ shouldBlockFn: async () => save.isPending || dirty && !await confirmPortal('Discard the unsaved physical record?'), enableBeforeUnload: () => save.isPending || dirty })
  const fields: Array<{ key: Exclude<keyof z.infer<typeof schema>, 'kind'>; label: string; required?: boolean; type?: string }> = [
    { key: 'scannedBarcode', label: 'Scan this tube', required: true },
    ...(terminal || kind === 'Placed' ? [{ key: 'occurredAt' as const, label: terminal ? 'Actual date/time with UTC offset' : 'Actual date/time with UTC offset (optional; blank uses recording time)', required: terminal }] : []),
    ...(terminal ? [{ key: 'method' as const, label: 'Actual method', required: true }] : []),
    ...(['Placed', 'Returned', 'Transferred'].includes(kind) ? [{ key: 'destination' as const, label: kind === 'Placed' ? 'Destination box barcode' : 'Destination', required: true }] : []),
    ...(terminal ? [{ key: 'measuredQuantityText' as const, label: 'Measured disposition quantity (optional; blank is unknown)' }, { key: 'measuredQuantityUnit' as const, label: 'Measured quantity unit' }] : []),
    ...(kind === 'Placed' ? [{ key: 'position' as const, label: 'Tube position (optional)' }] : []),
    ...(['Returned', 'Transferred'].includes(kind) ? [{ key: 'trackingReference' as const, label: 'Shipment / handover tracking', required: true }] : []),
    ...(kind === 'RetentionSet' ? [{ key: 'retainUntilUtc' as const, label: 'Retain until (UTC date; blank clears)', type: 'date' }] : []),
    { key: 'reason', label: kind === 'RetentionSet' ? 'Agreed terms reference and reason' : 'Reason and supporting evidence', required: true },
  ]
  return <><Dialog open onOpenChange={open => { if (!open && !box) void close() }}><DialogContent onCloseAutoFocus={returnToTubeActions} onOpenAutoFocus={event => { event.preventDefault(); (event.target as HTMLElement).querySelector<HTMLButtonElement>('[data-slot="dialog-footer"] button')?.focus() }}><DialogHeader><DialogTitle>Record physical lifecycle</DialogTitle><DialogDescription>{tube.barcode}. Confirm actual handling before recording it. A final disposition removes material from laboratory availability.</DialogDescription></DialogHeader>
    <form id="physical-tube" className="space-y-3" noValidate onSubmit={form.handleSubmit(value => save.mutate(value))}>
      <Field><Label htmlFor="physical-kind"><RequiredFieldName>Action</RequiredFieldName></Label><NativeSelect id="physical-kind" {...form.register('kind')}><option value="Placed">Place in registered box</option><option value="Exhausted">Material exhausted</option><option value="Returned">Return material</option><option value="Transferred">Transfer custody</option><option value="Destroyed">Destroy material</option>{supervise ? <><option value="RetentionSet">Set retention from agreed terms</option><option value="HoldPlaced">Place preservation hold</option><option value="HoldReleased">Release preservation hold</option></> : null}</NativeSelect></Field>
      {state.physicalHoldReason || state.trialHold ? <p role="status">An active hold prevents disposition.</p> : null}
      {fields.map(field => <Field key={field.key}><Label htmlFor={`physical-${field.key}`}>{field.required ? <RequiredFieldName>{field.label}</RequiredFieldName> : field.label}</Label><Input id={`physical-${field.key}`} type={field.type ?? 'text'} {...form.register(field.key)} aria-invalid={Boolean(form.formState.errors[field.key])} aria-describedby={`physical-${field.key}-error`} placeholder={field.key === 'occurredAt' ? '2026-10-24T09:15-07:00' : undefined} /><FieldError id={`physical-${field.key}-error`}>{form.formState.errors[field.key]?.message}</FieldError></Field>)}
      {kind === 'Placed' ? <Button variant="outline" type="button" disabled={!form.watch('destination').trim()} onClick={() => setBox(form.getValues('destination').trim())}>Confirm or register destination box</Button> : null}
      {save.isError ? <EvidenceError error={save.error} /> : null}
    </form><RequiredDialogFooter><Button variant="outline" disabled={save.isPending} onClick={() => void close()}>Cancel</Button><Button variant={terminal ? 'destructive' : 'default'} form="physical-tube" type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Record confirmed action'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>{box ? <StorageBoxDialog barcode={box} onClose={() => setBox(null)} onConfirmed={() => setBox(null)} /> : null}</>
}
