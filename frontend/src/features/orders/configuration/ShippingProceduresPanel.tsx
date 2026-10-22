import { BackLink } from '#/components/ui/back-link'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createSampleShippingProcedure, discardSampleShippingProcedureDraft, setSampleShippingProcedureStatus, updateSampleShippingProcedureDraft, type SampleShippingConfiguration, type SampleShippingProcedure } from '#/api/sample-shipping'
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
const draftInstructionText = z.string().trim().max(4000)
const schema = z.object({
  name: z.string().trim().min(1, 'Enter a procedure name.').max(255),
  description: z.string().trim().max(4000),
  packingInstructions: draftInstructionText, temperatureInstructions: draftInstructionText, carrierInstructions: draftInstructionText,
  dispatchInstructions: draftInstructionText, requiredDocuments: draftInstructionText, exceptionInstructions: draftInstructionText,
  internationalCustomsInstructions: z.string().trim().max(4000),
})
type Values = z.infer<typeof schema>

function missingProcedureActivationFields(item: SampleShippingProcedure) {
  const fields = [['name', 'Name'], ...procedureFields] as const
  return fields.filter(([key]) => !item[key].trim()).map(([, label]) => label)
}

export function ShippingProceduresPanel({ procedures, procedureId, configuration }: { procedures: SampleShippingProcedure[]; procedureId?: string; configuration: SampleShippingConfiguration }) {
  const __customerText = useCustomerText()

  const [editor, setEditor] = useState<SampleShippingProcedure | null | undefined>()
  const [statusChange, setStatusChange] = useState<{ item: SampleShippingProcedure; isActive: boolean } | null>(null)
  const [discardDraft, setDiscardDraft] = useState<SampleShippingProcedure | null>(null)
  const client = useQueryClient()
  const actionsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const returnFocusId = useRef<string | null>(null)
  const changeStatus = useMutation({
    mutationFn: ({ item, isActive }: { item: SampleShippingProcedure; isActive: boolean }) => setSampleShippingProcedureStatus(item.id, { isActive, version: item.version }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setStatusChange(null) },
  })
  const discard = useMutation({
    mutationFn: (item: SampleShippingProcedure) => discardSampleShippingProcedureDraft(item.id, item.version),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setDiscardDraft(null) },
  })
  const navigate = useNavigate()
  const selected = procedures.find(item => item.id === procedureId)
  const families = new Map<string, SampleShippingProcedure[]>()
  for (const item of procedures) families.set(item.definitionKey, [...(families.get(item.definitionKey) ?? []), item])
  const latest = [...families.values()].flatMap(family => {
    const sorted = [...family].sort((a, b) => b.revision - a.revision)
    const current = sorted.find(item => item.isActive) ?? sorted.find(item => item.lifecycle === 'Draft') ?? sorted.find(item => item.lifecycle === 'Released' || item.lifecycle === 'Superseded' || item.lifecycle === 'Deactivated') ?? sorted[0]
    return current ? [current] : []
  })
  const selectedFamily = selected ? procedures.filter(item => item.definitionKey === selected.definitionKey).sort((a, b) => b.revision - a.revision) : []
  const sampleTypesUsingSelected = selectedFamily.length ? sampleTypeChoices(configuration.sampleTypes, Date.now()).flatMap(choice => {
    const current = choice.current
    return current?.shippingProcedureId && selectedFamily.some(revision => revision.id === current.shippingProcedureId) ? [current] : []
  }) : []
  const priorRevisions = procedures.filter(item => !latest.some(current => current.id === item.id))
  const affected = statusChange && !statusChange.isActive ? affectedSampleTypesAfterProcedureDeactivation(statusChange.item.id, configuration) : []
  const missingActivationFields = statusChange?.isActive ? missingProcedureActivationFields(statusChange.item) : []
  function openStatusChange(item: SampleShippingProcedure, isActive: boolean, sourceId: string) { returnFocusId.current = sourceId; changeStatus.reset(); setStatusChange({ item, isActive }) }
  return <div className="space-y-5">
    {procedureId ? <>
      <BackLink asChild><Link to="/sample-shipping-settings" search={{ shippingSection: "procedures" }}><CustomerText message="m_591c91511daa" /></Link></BackLink>
      {selected ? <><Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle id={`shipping-procedure-${selected.id}`} role="heading" aria-level={2} tabIndex={-1}>{selected.name}</CardTitle><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="outline"><CustomerText message="m_e330d85ff901" />{selected.revision}</Badge><ProcedureStatusBadge item={selected} revisions={selectedFamily} /></div></div>
          <ProcedureActions item={selected} revisions={selectedFamily} onRevise={setEditor} onDiscard={setDiscardDraft} onStatusChange={(target, isActive) => openStatusChange(target, isActive, selected.id)} triggerRef={actionsTriggerRef} />
        </div></CardHeader>
        <CardContent className="p-4"><dl className="space-y-5">
          {selected.description ? <div><dt className="text-sm font-medium"><CustomerText message="m_526e0087cc3f" /></dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{selected.description}</dd></div> : null}
          {procedureFields.map(([key, label]) => <div key={key}><dt className="text-sm font-medium">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{selected[key]}</dd></div>)}
          {selected.internationalCustomsInstructions ? <div><dt className="text-sm font-medium"><CustomerText message="m_ed01dad7b410" /></dt><dd className="mt-1 whitespace-pre-wrap text-sm">{selected.internationalCustomsInstructions}</dd></div> : null}
        </dl>{selectedFamily[0]?.id === selected.id ? <ProcedureActiveRevisionNote item={selected} revisions={selectedFamily} /> : <p className="mt-5 text-sm text-muted-foreground"><CustomerText message="m_00a71cbc2a95" /></p>}</CardContent>
      </Card>
      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4"><CardTitle role="heading" aria-level={3}><CustomerText message="m_fe84b6fa96c1" /></CardTitle><CardDescription><CustomerText message="m_447404fcf6ee" /></CardDescription></CardHeader>
        <CardContent className="p-4">{sampleTypesUsingSelected.length ? <ul className="divide-y">{sampleTypesUsingSelected.map(sampleType => <li key={sampleType.id} className="py-3"><Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: "sample-types", sampleTypeId: sampleType.id }}>{sampleType.name}</Link><Badge variant="outline" className="ml-2"><CustomerText message="m_65dae0c1e49d" />{sampleType.revision}</Badge></li>)}</ul> : <p className="text-sm text-muted-foreground"><CustomerText message="m_007e51d1f11a" /></p>}</CardContent>
      </Card>
      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4"><CardTitle role="heading" aria-level={3}><CustomerText message="m_5ae0d3d186c7" /></CardTitle><CardDescription><CustomerText message="m_26c2ee4e57d6" /></CardDescription></CardHeader>
        <CardContent className="p-4"><ul className="divide-y">{selectedFamily.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: "procedures", procedureId: item.id }}><CustomerText message="m_e330d85ff901" />{item.revision} · {item.name}</Link>{item.id === selected.id ? <span className="ml-2 text-xs text-muted-foreground"><CustomerText message="m_9dc859e86f2e" /></span> : null}</div><ProcedureStatusBadge item={item} revisions={selectedFamily} /></li>)}</ul></CardContent>
      </Card></> : <Alert><AlertTitle><CustomerText message="m_552388e8a987" /></AlertTitle><AlertDescription><CustomerText message="m_5384ea7dbaae" /></AlertDescription></Alert>}
    </> : <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><CardTitle><CustomerText message="m_818f11904b30" /></CardTitle><Button onClick={() => setEditor(null)}><CustomerText message="m_38e723da4712" /></Button></div><CardDescription><CustomerText message="m_3bff786b411a" /></CardDescription></CardHeader>
      <CardContent className="space-y-4 p-4"><div className="divide-y">{latest.map(item => {
        const family = procedures.filter(value => value.definitionKey === item.definitionKey)
        const draft = family.find(value => value.lifecycle === 'Draft')
        return <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link id={`shipping-procedure-${item.id}`} className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: "procedures", procedureId: item.id }}>{item.name}</Link><Badge variant="outline"><CustomerText message="m_65dae0c1e49d" />{item.revision}</Badge><ProcedureStatusBadge item={item} /></div>{item.description ? <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.description}</p> : null}{draft && draft.id !== item.id ? <p className="mt-2 text-sm"><Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: "procedures", procedureId: draft.id }}><CustomerText message="m_d0adc1bb6f60" />{draft.revision}: {draft.name}</Link></p> : null}<ProcedureActiveRevisionNote item={item} revisions={family} /></div><ProcedureActions item={item} revisions={family} onRevise={setEditor} onDiscard={setDiscardDraft} onStatusChange={(target, isActive) => openStatusChange(target, isActive, item.id)} triggerRef={actionsTriggerRef} /></div>
      })}</div>{!latest.length ? <p className="py-4 text-sm text-muted-foreground"><CustomerText message="m_a702f0d43147" /></p> : null}
        {priorRevisions.length ? <details className="mt-4 border-t pt-4"><summary className="cursor-pointer text-sm font-medium"><CustomerText message="m_dd0fcd29c826" />{priorRevisions.length} <CustomerText message="m_5839fcd9437c" />{priorRevisions.length === 1 ? <CustomerSourceText source={"revision"} /> : __customerText('m_437f95fdeef1')}</summary><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{priorRevisions.map(item => <li key={item.id}>{item.name} <CustomerText message="m_3b0e4579f573" />{item.revision} · {procedureStatusLabel(item, procedures.filter(value => value.definitionKey === item.definitionKey)).toLowerCase()}</li>)}</ul></details> : null}
      </CardContent>
    </Card>}
    {editor !== undefined ? <ProcedureEditor source={editor} onClose={() => setEditor(undefined)} onSaved={item => { setEditor(undefined); void navigate({ to: '/sample-shipping-settings', search: { shippingSection: 'procedures', procedureId: item.id } }) }} /> : null}
    {statusChange ? <Dialog open onOpenChange={open => { if (!open && !changeStatus.isPending) setStatusChange(null) }}><DialogContent showCloseButton={!changeStatus.isPending} onCloseAutoFocus={event => { event.preventDefault(); (actionsTriggerRef.current?.isConnected ? actionsTriggerRef.current : document.getElementById(`shipping-procedure-${returnFocusId.current}`))?.focus() }}>
      <DialogHeader><DialogTitle>{statusChange.isActive ? <CustomerSourceText source={"Activate shipping procedure?"} /> : __customerText('m_20a4b8a29b29')}</DialogTitle><DialogDescription>{statusChange.item.name} <CustomerText message="m_3b0e4579f573" />{statusChange.item.revision}.</DialogDescription></DialogHeader>
      <div className="space-y-3 text-sm">
        <p>{statusChange.isActive ? <CustomerSourceText source={"Makes this revision current for newly placed Jobs. Once activated, changes require a new Draft revision."} /> : __customerText('m_b4da6a5e0dae')} <CustomerText message="m_c021bde5fc0c" /></p>
        {statusChange.isActive ? missingActivationFields.length ? <div id="procedure-activation-requirements" className="rounded-md border bg-muted/40 p-3">
          <p className="font-medium"><CustomerText message="m_f9f0a6d48d68" /></p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{missingActivationFields.map(label => <li key={label}>{label}</li>)}</ul>
          <p className="mt-3 text-muted-foreground"><CustomerText message="m_1005da3b2a82" /></p>
        </div> : <p className="text-muted-foreground"><CustomerText message="m_e5da0f1b430b" /></p> : null}
      </div>
      {affected.length ? <Alert variant="destructive"><AlertTitle>{affected.length} <CustomerText message="m_e83fb1ab439c" />{affected.length === 1 ? <CustomerSourceText source={"type uses"} /> : __customerText('m_6ba04f342df3')} <CustomerText message="m_b3143d056d4f" /></AlertTitle><AlertDescription><CustomerText message="m_c105e6a12bc8" />{affected.slice(0, 3).map(item => item.name).join('; ')}{affected.length > 3 ? __customerText('m_e01121508df3', { p0: String(affected.length - 3) }) : ''}.</AlertDescription></Alert> : null}
      {changeStatus.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_e36168d8263f" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(changeStatus.error, 'Refresh Shipping procedures and try again.')} />}</AlertDescription></Alert> : null}
      <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={changeStatus.isPending} onClick={() => setStatusChange(null)}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="button" variant={statusChange.isActive ? "default" : "destructive"} disabled={changeStatus.isPending || missingActivationFields.length > 0} aria-describedby={missingActivationFields.length ? "procedure-activation-requirements" : undefined} onClick={() => changeStatus.mutate(statusChange)}>{changeStatus.isPending ? <CustomerSourceText source={"Saving…"} /> : statusChange.isActive ? "Activate" : __customerText('m_fb1e6fa55327')}</Button></RequiredDialogFooter>
    </DialogContent></Dialog> : null}
    {discardDraft ? <Dialog open onOpenChange={open => { if (!open && !discard.isPending) setDiscardDraft(null) }}><DialogContent><DialogHeader><DialogTitle><CustomerText message="m_cf1f2d80cffd" />{discardDraft.revision}?</DialogTitle><DialogDescription><CustomerText message="m_67ebfd5a4638" /></DialogDescription></DialogHeader>{discard.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_f39e54ae4225" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(discard.error, 'Refresh the Draft and try again.')} />}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button variant="outline" onClick={() => setDiscardDraft(null)} disabled={discard.isPending}><CustomerText message="m_19766ed6ccb2" /></Button><Button variant="destructive" onClick={() => discard.mutate(discardDraft)} disabled={discard.isPending}>{discard.isPending ? <CustomerSourceText source={"Discarding…"} /> : __customerText('m_35cefb4d4564')}</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
  </div>
}

function ProcedureActions({ item, revisions, onRevise, onDiscard, onStatusChange, triggerRef }: {
  item: SampleShippingProcedure
  revisions: SampleShippingProcedure[]
  onRevise: (item: SampleShippingProcedure) => void
  onDiscard: (item: SampleShippingProcedure) => void
  onStatusChange: (item: SampleShippingProcedure, isActive: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}) {
  const __customerText = useCustomerText()

  const draft = revisions.find(value => value.lifecycle === 'Draft')
  const latest = !revisions.some(value => value.revision > item.revision)
  const latestReleased = [...revisions].filter(value => value.lifecycle === 'Released' || value.lifecycle === 'Superseded' || value.lifecycle === 'Deactivated').sort((a, b) => b.revision - a.revision)[0]
  if (!latest && !item.isActive && latestReleased?.id !== item.id) return null
  return <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={__customerText('m_e78d9a50658a', { p0: String(item.name) })} onPointerDown={event => { triggerRef.current = event.currentTarget }} onFocus={event => { triggerRef.current = event.currentTarget }}><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">
    {draft ? <DropdownMenuItem onSelect={() => onRevise(draft)}><CustomerText message="m_439cdd5d5ae6" />{draft.revision}</DropdownMenuItem> : <DropdownMenuItem onSelect={() => onRevise(latestReleased ?? item)}><CustomerText message="m_68bf5426f2b3" /></DropdownMenuItem>}
    {item.lifecycle === 'Draft' ? <><DropdownMenuItem onSelect={() => onStatusChange(item, true)}><CustomerText message="m_24433c70eba5" /></DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => onDiscard(item)}><CustomerText message="m_eb1a70e39274" /></DropdownMenuItem></> : null}
    {item.isActive ? <DropdownMenuItem variant="destructive" onSelect={() => onStatusChange(item, false)}><CustomerText message="m_fb1e6fa55327" /></DropdownMenuItem> : null}
  </DropdownMenuContent></ActionMenu>
}

function procedureStatusLabel(item: SampleShippingProcedure, revisions?: SampleShippingProcedure[]) {
  return item.lifecycle === 'Draft' ? 'Draft' : item.lifecycle === 'Discarded' ? 'Discarded'
    : item.lifecycle === 'Deactivated' ? 'Deactivated'
    : revisions?.some(value => value.isActive && value.revision > item.revision) ? 'Superseded'
    : item.isActive ? 'Active' : 'Superseded'
}

function ProcedureStatusBadge({ item, revisions }: { item: SampleShippingProcedure; revisions?: SampleShippingProcedure[] }) {


  const label = procedureStatusLabel(item, revisions)
  return <Badge variant={label === 'Active' ? "secondary" : "outline"}>{label}</Badge>
}

function ProcedureActiveRevisionNote({ item, revisions }: { item: SampleShippingProcedure; revisions: SampleShippingProcedure[] }) {
  const __customerText = useCustomerText()

  if (item.isActive) return null
  const earlierActive = revisions.filter(value => value.id !== item.id && value.isActive).sort((a, b) => b.revision - a.revision)
  if (!earlierActive.length) return null
  const label = earlierActive.map(value => value.revision).join(', ')
  return <p className="mt-2 text-sm text-muted-foreground">{earlierActive.length === 1 ? <CustomerSourceText source={"Revision"} /> : __customerText('m_da80b1d5740c')} {label} {earlierActive.length === 1 ? 'is' : __customerText('m_ba78973ddcf9')} <CustomerText message="m_0759b9efbafc" /></p>
}

function ProcedureEditor({ source, onClose, onSaved }: { source: SampleShippingProcedure | null; onClose: () => void; onSaved: (item: SampleShippingProcedure) => void }) {
  const __customerText = useCustomerText()

  const client = useQueryClient()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    name: source?.name ?? '', description: source?.description ?? '', packingInstructions: source?.packingInstructions ?? '', temperatureInstructions: source?.temperatureInstructions ?? '',
    carrierInstructions: source?.carrierInstructions ?? '', dispatchInstructions: source?.dispatchInstructions ?? '', requiredDocuments: source?.requiredDocuments ?? '',
    exceptionInstructions: source?.exceptionInstructions ?? '', internationalCustomsInstructions: source?.internationalCustomsInstructions ?? '',
  } })
  const { isDirty: __formDraftDirty } = form.formState

  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const draft = { ...values, isActive: false, internationalCustomsInstructions: values.internationalCustomsInstructions || null, supersedesProcedureId: source?.lifecycle === 'Draft' ? source.supersedesProcedureId : source?.id ?? null, supersededVersion: source?.version ?? null }
      return source?.lifecycle === 'Draft' ? updateSampleShippingProcedureDraft(source.id, source.version, draft) : createSampleShippingProcedure(draft)
    },
    onSuccess: async item => { form.reset(form.getValues()); allowSavedNavigation(); await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onSaved(item) },
  })
  const allowSavedNavigation = useOrderDraftGuard(__formDraftDirty, mutation.isPending)
  async function close() { if (!mutation.isPending && (!__formDraftDirty || (await confirmPortal('Discard the unsaved procedure changes?')))) onClose() }
  const errors = form.formState.errors
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>{source?.lifecycle === 'Draft' ? __customerText('m_fed098d586d6', { p0: String(source.revision) }) : source ? __customerText('m_d69d66c3f4fa', { p0: String(source.name), p1: String(source.revision + 1) }) : __customerText('m_ca5d32be9471')}</DialogTitle><DialogDescription><CustomerText message="m_d7de42d56fbe" /></DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_ad616f0e86dc" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Review the instructions and try again.')} />}</AlertDescription></Alert> : null}
    <form id="shipping-procedure-form" noValidate onSubmit={form.handleSubmit(values => mutation.mutate(values))}><fieldset disabled={mutation.isPending} className="space-y-4">
      <div><Label htmlFor="procedure-name"><RequiredFieldName><CustomerText message="m_dcd1d5223f73" /></RequiredFieldName></Label><Input id="procedure-name" className="mt-2" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "procedure-name-error" : undefined} {...form.register('name')} />{errors.name ? <p id="procedure-name-error" role="alert" className="text-sm text-destructive">{<CustomerSourceText source={errors.name.message} />}</p> : null}</div>
      <div><Label htmlFor="procedure-description"><CustomerText message="m_526e0087cc3f" /></Label><Textarea id="procedure-description" className="mt-2" rows={3} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "procedure-description-error" : undefined} {...form.register('description')} />{errors.description ? <p id="procedure-description-error" role="alert" className="text-sm text-destructive">{<CustomerSourceText source={errors.description.message} />}</p> : null}</div>
      {procedureFields.map(([key, label]) => <div key={key}><Label htmlFor={`procedure-${key}`}><RequiredFieldName>{label}</RequiredFieldName></Label><p id={`procedure-${key}-help`} className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_c4085f9c76a6" />{procedureHints[key]}</p><Textarea id={`procedure-${key}`} className="mt-2" rows={3} aria-invalid={Boolean(errors[key])} aria-describedby={`procedure-${key}-help${errors[key] ? ` procedure-${key}-error` : ''}`} {...form.register(key)} />{errors[key] ? <p id={`procedure-${key}-error`} role="alert" className="text-sm text-destructive">{<CustomerSourceText source={errors[key].message} />}</p> : null}</div>)}
      <div><Label htmlFor="procedure-customs"><CustomerText message="m_ed01dad7b410" /></Label><Textarea id="procedure-customs" className="mt-2" rows={3} aria-invalid={Boolean(errors.internationalCustomsInstructions)} aria-describedby={errors.internationalCustomsInstructions ? "procedure-customs-error" : undefined} {...form.register('internationalCustomsInstructions')} />{errors.internationalCustomsInstructions ? <p id="procedure-customs-error" role="alert" className="text-sm text-destructive">{<CustomerSourceText source={errors.internationalCustomsInstructions.message} />}</p> : null}</div>
    </fieldset></form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}><CustomerText message="m_19766ed6ccb2" /></Button><Button form="shipping-procedure-form" type="submit" disabled={mutation.isPending}>{mutation.isPending ? <CustomerSourceText source={"Saving…"} /> : source?.lifecycle === 'Draft' ? "Save Draft" : __customerText('m_0f3960b0d6d6')}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
