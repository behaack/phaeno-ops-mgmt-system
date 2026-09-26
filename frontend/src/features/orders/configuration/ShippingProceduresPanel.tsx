import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createSampleShippingProcedure, setSampleShippingProcedureStatus, type SampleShippingConfiguration, type SampleShippingProcedure } from '#/api/sample-shipping'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { recordLinkClassName } from '#/components/ui/record-link'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '../use-order-draft-guard'
import { affectedSampleTypesAfterProcedureDeactivation } from './shipping-dependency-health'
import { sampleTypeChoices } from './sample-type-options'

export const procedureFields = [
  ['packingInstructions', 'Common preparation and packing'],
  ['temperatureInstructions', 'Transit handling'],
  ['carrierInstructions', 'Carrier guidance'],
  ['dispatchInstructions', 'Dispatch timing'],
  ['requiredDocuments', 'Documents to include'],
  ['exceptionInstructions', 'Delays, damage and other exceptions'],
] as const
const procedureHints: Record<typeof procedureFields[number][0], string> = {
  packingInstructions: 'Steps shared by every sample using this procedure. Keep container-specific steps and coolant amounts with Kit specifications.',
  temperatureInstructions: 'Common handling during transit. Sample preservation limits belong to the Sample type; cooling method and amount belong to each Transportation kit.',
  carrierInstructions: 'Approved carrier services and tracking requirements. Receiving-site restrictions belong to the destination.',
  dispatchInstructions: 'When to dispatch and how to arrange arrival. Maintain receiving hours once on the destination.',
  requiredDocuments: 'List documents to include, or explicitly state that none are required.',
  exceptionInstructions: 'What to do about delays, damage or handling problems, including whom to contact.',
}
const requiredText = z.string().trim().min(1, 'Enter the approved instructions.').max(4000)
const schema = z.object({
  name: z.string().trim().min(1, 'Enter a procedure name.').max(255),
  description: z.string().trim().max(4000),
  packingInstructions: requiredText, temperatureInstructions: requiredText, carrierInstructions: requiredText,
  dispatchInstructions: requiredText, requiredDocuments: requiredText, exceptionInstructions: requiredText,
  internationalCustomsInstructions: z.string().trim().max(4000), isActive: z.boolean(),
})
type Values = z.infer<typeof schema>

export function ShippingProceduresPanel({ procedures, procedureId, configuration }: { procedures: SampleShippingProcedure[]; procedureId?: string; configuration: SampleShippingConfiguration }) {
  const [editor, setEditor] = useState<SampleShippingProcedure | null | undefined>()
  const [statusChange, setStatusChange] = useState<{ item: SampleShippingProcedure; isActive: boolean } | null>(null)
  const client = useQueryClient()
  const actionsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const returnFocusId = useRef<string | null>(null)
  const changeStatus = useMutation({
    mutationFn: ({ item, isActive }: { item: SampleShippingProcedure; isActive: boolean }) => setSampleShippingProcedureStatus(item.id, { isActive, version: item.version }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setStatusChange(null) },
  })
  const navigate = useNavigate()
  const selected = procedures.find(item => item.id === procedureId)
  const latest = procedures.filter(item => !procedures.some(other => other.definitionKey === item.definitionKey && other.revision > item.revision))
  const selectedFamily = selected ? procedures.filter(item => item.definitionKey === selected.definitionKey).sort((a, b) => b.revision - a.revision) : []
  const sampleTypesUsingSelected = selectedFamily.length ? sampleTypeChoices(configuration.sampleTypes, Date.now()).flatMap(choice => {
    const current = choice.current
    return current?.shippingProcedureId && selectedFamily.some(revision => revision.id === current.shippingProcedureId) ? [current] : []
  }) : []
  const priorRevisions = procedures.filter(item => !latest.some(current => current.id === item.id))
  const affected = statusChange && !statusChange.isActive ? affectedSampleTypesAfterProcedureDeactivation(statusChange.item.id, configuration) : []
  function openStatusChange(item: SampleShippingProcedure, isActive: boolean, sourceId: string) { returnFocusId.current = sourceId; changeStatus.reset(); setStatusChange({ item, isActive }) }
  return <div className="space-y-4">
    {procedureId ? <>
      <Link className="text-sm underline" to="/sample-shipping-settings" search={{ shippingSection: 'procedures' }}>Back to shipping procedures</Link>
      {selected ? <><Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle id={`shipping-procedure-${selected.id}`} role="heading" aria-level={2} tabIndex={-1}>{selected.name}</CardTitle><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="outline">Revision {selected.revision}</Badge><ProcedureStatusBadge item={selected} revisions={selectedFamily} /></div></div>
          <ProcedureActions item={selected} revisions={selectedFamily} onRevise={setEditor} onStatusChange={(target, isActive) => openStatusChange(target, isActive, selected.id)} triggerRef={actionsTriggerRef} />
        </div></CardHeader>
        <CardContent className="p-4"><dl className="space-y-5">
          {selected.description ? <div><dt className="text-sm font-medium">Description</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{selected.description}</dd></div> : null}
          {procedureFields.map(([key, label]) => <div key={key}><dt className="text-sm font-medium">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{selected[key]}</dd></div>)}
          {selected.internationalCustomsInstructions ? <div><dt className="text-sm font-medium">International customs</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{selected.internationalCustomsInstructions}</dd></div> : null}
        </dl>{selectedFamily[0]?.id === selected.id ? <ProcedureActiveRevisionNote item={selected} revisions={selectedFamily} /> : <p className="mt-5 text-sm text-muted-foreground">You are viewing a historical revision.</p>}</CardContent>
      </Card>
      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4"><CardTitle role="heading" aria-level={3}>Sample types using this procedure</CardTitle><CardDescription>Current Active Sample types configured to use this procedure. New shipping work requires an Active procedure revision.</CardDescription></CardHeader>
        <CardContent className="p-4">{sampleTypesUsingSelected.length ? <ul className="divide-y">{sampleTypesUsingSelected.map(sampleType => <li key={sampleType.id} className="py-3"><Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: 'sample-types', sampleTypeId: sampleType.id }}>{sampleType.name}</Link><Badge variant="outline" className="ml-2">Rev {sampleType.revision}</Badge></li>)}</ul> : <p className="text-sm text-muted-foreground">No Active Sample types currently use this procedure.</p>}</CardContent>
      </Card>
      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4"><CardTitle role="heading" aria-level={3}>Revision history</CardTitle><CardDescription>Each link opens that exact revision. Linked Sample types use the current Active procedure for new work; issued packets keep their saved instructions.</CardDescription></CardHeader>
        <CardContent className="p-4"><ul className="divide-y">{selectedFamily.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: 'procedures', procedureId: item.id }}>Revision {item.revision} · {item.name}</Link>{item.id === selected.id ? <span className="ml-2 text-xs text-muted-foreground">Viewing</span> : null}</div><ProcedureStatusBadge item={item} revisions={selectedFamily} /></li>)}</ul></CardContent>
      </Card></> : <Alert><AlertTitle>Procedure not found</AlertTitle><AlertDescription>Choose an available procedure from the list.</AlertDescription></Alert>}
    </> : <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><CardTitle>Shipping procedures</CardTitle><Button onClick={() => setEditor(null)}>Add procedure</Button></div><CardDescription>Reusable common steps. Each Transportation kit holds its own temperature control, dry ice, and packing details.</CardDescription></CardHeader>
      <CardContent className="space-y-4 p-4"><div className="divide-y">{latest.map(item => {
        const family = procedures.filter(value => value.definitionKey === item.definitionKey)
        return <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link id={`shipping-procedure-${item.id}`} className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: 'procedures', procedureId: item.id }}>{item.name}</Link><Badge variant="outline">Rev {item.revision}</Badge><ProcedureStatusBadge item={item} /></div>{item.description ? <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.description}</p> : null}<ProcedureActiveRevisionNote item={item} revisions={family} /></div><ProcedureActions item={item} revisions={family} onRevise={setEditor} onStatusChange={(target, isActive) => openStatusChange(target, isActive, item.id)} triggerRef={actionsTriggerRef} /></div>
      })}</div>{!latest.length ? <p className="py-4 text-sm text-muted-foreground">No shared shipping procedures have been configured.</p> : null}
        {priorRevisions.length ? <details className="mt-4 border-t pt-4"><summary className="cursor-pointer text-sm font-medium">Show {priorRevisions.length} prior {priorRevisions.length === 1 ? 'revision' : 'revisions'}</summary><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{priorRevisions.map(item => <li key={item.id}>{item.name} · revision {item.revision} · {procedureStatusLabel(item, procedures.filter(value => value.definitionKey === item.definitionKey)).toLowerCase()}</li>)}</ul></details> : null}
      </CardContent>
    </Card>}
    {editor !== undefined ? <ProcedureEditor source={editor} onClose={() => setEditor(undefined)} onSaved={item => { setEditor(undefined); void navigate({ to: '/sample-shipping-settings', search: { shippingSection: 'procedures', procedureId: item.id } }) }} /> : null}
    {statusChange ? <Dialog open onOpenChange={open => { if (!open && !changeStatus.isPending) setStatusChange(null) }}><DialogContent showCloseButton={!changeStatus.isPending} onCloseAutoFocus={event => { event.preventDefault(); (actionsTriggerRef.current?.isConnected ? actionsTriggerRef.current : document.getElementById(`shipping-procedure-${returnFocusId.current}`))?.focus() }}>
      <DialogHeader><DialogTitle>{statusChange.isActive ? 'Activate shipping procedure?' : 'Deactivate shipping procedure?'}</DialogTitle><DialogDescription>{statusChange.item.name} · revision {statusChange.item.revision}. {statusChange.isActive ? 'Makes this revision current for new previews and packets on linked Sample types, and deactivates any earlier active revision.' : 'Withdraws this revision from new work. If the procedure has no other Active revision, linked Sample types cannot be ordered until one is activated.'} Already issued packets keep their saved instructions.</DialogDescription></DialogHeader>
      {affected.length ? <Alert variant="destructive"><AlertTitle>{affected.length} Active Sample {affected.length === 1 ? 'type uses' : 'types use'} this procedure</AlertTitle><AlertDescription>These Sample types will have no Active procedure for new Orders: {affected.slice(0, 3).map(item => item.name).join('; ')}{affected.length > 3 ? `; and ${affected.length - 3} more` : ''}.</AlertDescription></Alert> : null}
      {changeStatus.error ? <Alert variant="destructive"><AlertTitle>Procedure status was not changed</AlertTitle><AlertDescription>{getOrderErrorMessage(changeStatus.error, 'Refresh Shipping procedures and try again.')}</AlertDescription></Alert> : null}
      <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={changeStatus.isPending} onClick={() => setStatusChange(null)}>Cancel</Button><Button type="button" variant={statusChange.isActive ? 'default' : 'destructive'} disabled={changeStatus.isPending} onClick={() => changeStatus.mutate(statusChange)}>{changeStatus.isPending ? 'Saving…' : statusChange.isActive ? 'Activate' : 'Deactivate'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog> : null}
  </div>
}

function ProcedureActions({ item, revisions, onRevise, onStatusChange, triggerRef }: {
  item: SampleShippingProcedure
  revisions: SampleShippingProcedure[]
  onRevise: (item: SampleShippingProcedure) => void
  onStatusChange: (item: SampleShippingProcedure, isActive: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}) {
  const latest = !revisions.some(value => value.revision > item.revision)
  if (!latest) return null
  return <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={`Actions for ${item.name}`} onPointerDown={event => { triggerRef.current = event.currentTarget }} onFocus={event => { triggerRef.current = event.currentTarget }}>Actions<ChevronDown aria-hidden="true" className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">
    <DropdownMenuItem onSelect={() => onRevise(item)}>Create revision</DropdownMenuItem>
    <DropdownMenuItem variant={item.isActive ? 'destructive' : 'default'} onSelect={() => onStatusChange(item, !item.isActive)}>{item.isActive ? 'Deactivate' : 'Activate'}</DropdownMenuItem>
  </DropdownMenuContent></ActionMenu>
}

function procedureStatusLabel(item: SampleShippingProcedure, revisions?: SampleShippingProcedure[]) {
  return revisions?.some(value => value.isActive && value.revision > item.revision) ? 'Superseded' : item.isActive ? 'Active' : 'Inactive'
}

function ProcedureStatusBadge({ item, revisions }: { item: SampleShippingProcedure; revisions?: SampleShippingProcedure[] }) {
  const label = procedureStatusLabel(item, revisions)
  return <Badge variant={label === 'Active' ? 'secondary' : 'outline'}>{label}</Badge>
}

function ProcedureActiveRevisionNote({ item, revisions }: { item: SampleShippingProcedure; revisions: SampleShippingProcedure[] }) {
  if (item.isActive) return null
  const earlierActive = revisions.filter(value => value.id !== item.id && value.isActive).sort((a, b) => b.revision - a.revision)
  if (!earlierActive.length) return null
  const label = earlierActive.map(value => value.revision).join(', ')
  return <p className="mt-2 text-sm text-muted-foreground">{earlierActive.length === 1 ? 'Revision' : 'Revisions'} {label} {earlierActive.length === 1 ? 'is' : 'are'} still Active for new work. Activate this revision to replace the earlier active revision.</p>
}

function ProcedureEditor({ source, onClose, onSaved }: { source: SampleShippingProcedure | null; onClose: () => void; onSaved: (item: SampleShippingProcedure) => void }) {
  const client = useQueryClient()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    name: source?.name ?? '', description: source?.description ?? '', packingInstructions: source?.packingInstructions ?? '', temperatureInstructions: source?.temperatureInstructions ?? '',
    carrierInstructions: source?.carrierInstructions ?? '', dispatchInstructions: source?.dispatchInstructions ?? '', requiredDocuments: source?.requiredDocuments ?? '',
    exceptionInstructions: source?.exceptionInstructions ?? '', internationalCustomsInstructions: source?.internationalCustomsInstructions ?? '', isActive: true,
  } })
  const mutation = useMutation({
    mutationFn: (values: Values) => createSampleShippingProcedure({ ...values, internationalCustomsInstructions: values.internationalCustomsInstructions || null, supersedesProcedureId: source?.id ?? null, supersededVersion: source?.version ?? null }),
    onSuccess: async item => { form.reset(form.getValues()); allowSavedNavigation(); await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onSaved(item) },
  })
  const allowSavedNavigation = useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  function close() { if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard the unsaved procedure changes?'))) onClose() }
  const errors = form.formState.errors
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>{source ? `Create ${source.name} revision ${source.revision + 1}` : 'Add shipping procedure'}</DialogTitle><DialogDescription>Save common steps once and select the procedure on each Sample type that uses it. An Active revision becomes current for new previews and packets; issued packets retain their saved instructions.</DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Procedure was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the instructions and try again.')}</AlertDescription></Alert> : null}
    <form id="shipping-procedure-form" noValidate onSubmit={form.handleSubmit(values => mutation.mutate(values))}><fieldset disabled={mutation.isPending} className="space-y-4">
      <div><Label htmlFor="procedure-name"><RequiredFieldName>Name</RequiredFieldName></Label><Input id="procedure-name" className="mt-2" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'procedure-name-error' : undefined} {...form.register('name')} />{errors.name ? <p id="procedure-name-error" role="alert" className="text-sm text-destructive">{errors.name.message}</p> : null}</div>
      <div><Label htmlFor="procedure-description">Description</Label><Textarea id="procedure-description" className="mt-2" rows={3} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'procedure-description-error' : undefined} {...form.register('description')} />{errors.description ? <p id="procedure-description-error" role="alert" className="text-sm text-destructive">{errors.description.message}</p> : null}</div>
      {procedureFields.map(([key, label]) => <div key={key}><Label htmlFor={`procedure-${key}`}><RequiredFieldName>{label}</RequiredFieldName></Label><p id={`procedure-${key}-help`} className="mt-1 text-xs text-muted-foreground">{procedureHints[key]}</p><Textarea id={`procedure-${key}`} className="mt-2" rows={3} aria-invalid={Boolean(errors[key])} aria-describedby={`procedure-${key}-help${errors[key] ? ` procedure-${key}-error` : ''}`} {...form.register(key)} />{errors[key] ? <p id={`procedure-${key}-error`} role="alert" className="text-sm text-destructive">{errors[key].message}</p> : null}</div>)}
      <div><Label htmlFor="procedure-customs">International customs</Label><Textarea id="procedure-customs" className="mt-2" rows={3} aria-invalid={Boolean(errors.internationalCustomsInstructions)} aria-describedby={errors.internationalCustomsInstructions ? 'procedure-customs-error' : undefined} {...form.register('internationalCustomsInstructions')} />{errors.internationalCustomsInstructions ? <p id="procedure-customs-error" role="alert" className="text-sm text-destructive">{errors.internationalCustomsInstructions.message}</p> : null}</div>
      <div><Label htmlFor="procedure-status"><RequiredFieldName>Status</RequiredFieldName></Label><select id="procedure-status" className="mt-2 h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" value={form.watch('isActive') ? 'active' : 'inactive'} onChange={event => form.setValue('isActive', event.target.value === 'active', { shouldDirty: true })}><option value="active">Active</option><option value="inactive">Inactive</option></select><p className="mt-2 text-sm text-muted-foreground">Active is the default. {source ? 'Saving Active replaces an earlier Active revision now. Saving Inactive leaves the earlier Active revision available until this revision is activated.' : 'Choose Inactive to save this procedure for later review.'}</p></div>
    </fieldset></form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button form="shipping-procedure-form" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : source ? 'Create revision' : 'Add procedure'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
