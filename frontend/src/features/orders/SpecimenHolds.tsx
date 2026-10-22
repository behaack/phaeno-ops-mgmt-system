import { NativeCheckbox } from '#/components/ui/native-checkbox'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '#/api/client'
import { Button } from '#/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Label } from '#/components/ui/label'
import { ActionMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { EvidenceError } from '#/features/lab-operations/InvestigationEvidence'
import { customerSpecimenHoldsEnabled, useSpecimenHolds, type SpecimenHold as Hold } from './use-specimen-holds'
import { useOrderDecisionDismissal } from './use-order-decision-dismissal'

type Decision = { specimen: { id: string; name: string }; hold?: Hold; action: string; label: string }
const labels: Record<string, string> = { Requested: 'Pause requested — awaiting Phaeno', Applied: 'Pause confirmed', UnableToPause: 'Unable to pause ongoing work — new work remains blocked', ResumeRequested: 'Resumption requested — still blocked', Released: 'Hold released' }
const schema = z.object({ reason: z.string().trim().min(1, 'Enter a reason.').max(2000), confirmed: z.boolean() })

export function SpecimenHolds({ orderId, workOrderId, sampleIds, embedded = false, onModalChange }: { orderId?: string; workOrderId?: string; sampleIds?: string[]; embedded?: boolean; onModalChange?: (open: boolean) => void }) {
  const __customerText = useCustomerText()

  const staff = Boolean(workOrderId)
  const { url, query } = useSpecimenHolds(orderId, workOrderId)
  const client = useQueryClient()
  const [decision, setDecision] = useState<Decision | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { reason: '', confirmed: false } })
  const { isDirty: __formDraftDirty } = form.formState

  const id = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => { onModalChange?.(Boolean(decision)); return () => onModalChange?.(false) }, [decision, onModalChange])
  const mutation = useMutation({ mutationFn: async (values: z.infer<typeof schema>) => {
    if (!decision) throw new Error('Choose a sample first.')
    if (staff && !values.confirmed) { form.setError('confirmed', { message: 'Confirm the safe operational boundary.' }); throw new Error('Confirm the safe operational boundary.') }
    return api.post(staff ? `${url}/${decision.hold!.id}` : url, staff
      ? { version: decision.hold!.version, action: decision.action, reason: values.reason, confirmed: values.confirmed }
      : { specimenId: decision.specimen.id, holdId: decision.hold?.id ?? null, version: decision.hold?.version ?? 0, reason: values.reason })
  }, onSuccess: async () => {
    form.reset(); setDecision(null)
    await client.invalidateQueries({ queryKey: ['specimen-holds'] })
    await Promise.all(['lab-operations', 'lab-work-order', 'lab-jobs', 'lab-service-order'].map(key => client.invalidateQueries({ queryKey: [key] })))
  }, retry: false })
  const dirty = decision !== null && __formDraftDirty
  const dismissal = useOrderDecisionDismissal(dirty, mutation.isPending, () => { setDecision(null); form.reset() }, { scope: 'hold request', description: __customerText('m_4d43ce511428') })
  const close = dismissal.close
  function choose(value: Decision) { opener.current = document.getElementById(`hold-action-${value.specimen.id}`); mutation.reset(); form.reset(); setDecision(value) }
  if (!staff && !customerSpecimenHoldsEnabled) return null
  if (query.isPending) return <p role="status"><CustomerText message="m_0bcf86164da3" /></p>
  if (query.isError) return <div><EvidenceError error={query.error} /><Button variant="outline" onClick={() => void query.refetch()}><CustomerText message="m_33bd6c3e5d54" /></Button></div>
  if (!query.data.workOrderId || !query.data.specimens.length) return null
  const specimens = query.data.specimens.filter(specimen => !sampleIds || sampleIds.includes(specimen.sampleId))
  if (!specimens.length) return null
  const activeHolds = query.data.holds.filter(hold => hold.state !== 'Released' && specimens.some(specimen => specimen.id === hold.labSpecimenId))
  const Container = embedded ? 'details' : Card
  const Header = embedded ? 'summary' : CardHeader
  const Title = embedded ? 'span' : CardTitle
  const Content = embedded ? 'div' : CardContent
  return <Container open={embedded ? activeHolds.length > 0 : undefined} className={embedded ? "space-y-3 border-t pt-4" : "my-4 gap-0 overflow-hidden py-0"}><Header className={embedded ? "cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "border-b bg-muted/50 p-4"}><Title className="font-semibold"><CustomerText message="m_85f0659106e6" />{embedded ? __customerText('m_d5fe557c77e6', { p0: String(activeHolds.length) }) : ''}</Title></Header>
    <Content className={embedded ? "divide-y" : "space-y-3 p-4"}><p className="pb-3 text-sm text-muted-foreground"><CustomerText message="m_c926d58d50e1" /></p>{specimens.map(specimen => {
      const history = query.data.holds.filter(h => h.labSpecimenId === specimen.id)
      const hold = history.find(h => h.state !== 'Released')
      const actions: Decision[] = []
      if (query.data.canRequest && (!hold || hold.state !== 'ResumeRequested')) actions.push({ specimen, hold, action: 'request', label: hold ? 'Request resumption' : 'Request pause' })
      if (query.data.canDecide && hold) {
        if (hold.state === 'Requested' || hold.state === 'UnableToPause') actions.push({ specimen, hold, action: 'apply', label: __customerText('m_dc905493c366') })
        if (hold.state === 'Requested') actions.push({ specimen, hold, action: 'unable', label: __customerText('m_0778a52d3465') })
        if (hold.state === 'ResumeRequested') actions.push({ specimen, hold, action: 'resume', label: __customerText('m_224c9e22774f') }, { specimen, hold, action: 'keep-held', label: __customerText('m_686b908d5611') })
      }
      return <div key={specimen.id} className={embedded ? 'py-3' : "rounded-md border p-3"}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium wrap-anywhere">{specimen.name}</p><p className="text-sm">{hold ? labels[hold.state] : __customerText('m_1153d051f517')}</p></div>
        {actions.length === 1 ? <Button id={`hold-action-${specimen.id}`} size="sm" variant="outline" onClick={() => choose(actions[0])}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button id={`hold-action-${specimen.id}`} size="sm" variant="outline"><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">{actions.map(action => <DropdownMenuItem key={action.action} onSelect={() => choose(action)}>{action.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}</div>
        {hold ? <div className="mt-2 text-sm whitespace-pre-wrap"><p>{hold.reason}</p>{hold.response ? <p className="mt-1"><CustomerText message="m_4b4215b690be" />{hold.response}</p> : null}</div> : null}
        {history.length ? <details className="mt-2 text-sm"><summary className="cursor-pointer"><CustomerText message="m_b5f943952143" /></summary>{(query.data.history ?? []).filter(h => h.labSpecimenId === specimen.id).map(h => <p key={h.id} className="mt-2 whitespace-pre-wrap">{new Date(h.occurredAtUtc).toLocaleString()} · {labels[h.state]} · {h.reason}</p>)}</details> : null}
      </div>
    })}</Content>
    <Dialog open={decision !== null} onOpenChange={open => { if (!open) close() }}><DialogContent showCloseButton={!mutation.isPending} onOpenAutoFocus={event => { event.preventDefault(); cancelRef.current?.focus() }} onCloseAutoFocus={event => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus(); else document.getElementById('job-phase-progress')?.focus() }}><form onSubmit={form.handleSubmit(values => mutation.mutate(values))}><DialogHeader><DialogTitle>{decision?.label}</DialogTitle></DialogHeader>
      <div><DialogDescription>{decision?.specimen.name}<CustomerText message="m_6597af94a2ef" /></DialogDescription></div>
      <div className="my-4 space-y-3"><Label htmlFor={id}><RequiredFieldName>{staff ? <CustomerSourceText source={"Reason shared with the customer"} /> : __customerText('m_f81ab834de5f')}</RequiredFieldName></Label><textarea id={id} disabled={mutation.isPending} maxLength={2000} aria-invalid={Boolean(form.formState.errors.reason)} className="min-h-24 w-full rounded-md border bg-background p-2" {...form.register('reason')} />{form.formState.errors.reason ? <p role="alert">{<CustomerSourceText source={form.formState.errors.reason.message} />}</p> : null}
      {staff ? <label className="flex items-start gap-2"><NativeCheckbox  disabled={mutation.isPending} {...form.register('confirmed')} /><span><CustomerText message="m_5aac35273c70" /></span></label> : null}{form.formState.errors.confirmed ? <p role="alert">{<CustomerSourceText source={form.formState.errors.confirmed.message} />}</p> : null}
      {mutation.isError ? <EvidenceError error={mutation.error} /> : null}</div>
      <RequiredDialogFooter><Button ref={cancelRef} type="button" variant="outline" disabled={mutation.isPending} onClick={close}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <CustomerSourceText source={"Saving…"} /> : decision?.label}</Button></RequiredDialogFooter>
    </form></DialogContent></Dialog>
    {dismissal.confirmation}
  </Container>
}
