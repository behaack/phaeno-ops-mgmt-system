import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown } from 'lucide-react'
import { api } from '#/api/client'
import { Button } from '#/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Label } from '#/components/ui/label'
import { ActionMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { EvidenceError } from '#/features/lab-operations/InvestigationEvidence'

type Hold = { id: string; labSpecimenId: string; state: string; reason: string; response: string | null; version: number; requestedAtUtc: string }
type Workspace = { workOrderId: string | null; specimens: { id: string; name: string }[]; holds: Hold[]; history?: { id: string; labSpecimenId: string; occurredAtUtc: string; state: string; reason: string }[]; canRequest: boolean; canDecide: boolean }
type Decision = { specimen: { id: string; name: string }; hold?: Hold; action: string; label: string }
const labels: Record<string, string> = { Requested: 'Pause requested — awaiting Phaeno', Applied: 'Pause confirmed', UnableToPause: 'Unable to pause ongoing work — new work remains blocked', ResumeRequested: 'Resumption requested — still blocked', Released: 'Hold released' }
const schema = z.object({ reason: z.string().trim().min(1, 'Enter a reason.').max(2000), confirmed: z.boolean() })

export function SpecimenHolds({ orderId, workOrderId }: { orderId?: string; workOrderId?: string }) {
  const staff = Boolean(workOrderId)
  const url = staff ? `/platform/lab-operations/work-orders/${workOrderId}/customer-holds` : `/lab-service-orders/${orderId}/specimen-holds`
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['specimen-holds', url], queryFn: async () => (await api.get<{ data: Workspace }>(url)).data.data, refetchInterval: 15000 })
  const [decision, setDecision] = useState<Decision | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { reason: '', confirmed: false } })
  const id = useId()
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
  const dirty = decision !== null && form.formState.isDirty
  useBlocker({ shouldBlockFn: () => mutation.isPending || dirty && !window.confirm('Discard the unsaved hold request or decision?'), enableBeforeUnload: () => dirty || mutation.isPending })
  function close() { if (!mutation.isPending && (!dirty || window.confirm('Discard the unsaved hold request or decision?'))) { setDecision(null); form.reset() } }
  function choose(value: Decision) { mutation.reset(); form.reset(); setDecision(value) }
  if (query.isPending) return <p role="status">Loading specimen holds…</p>
  if (query.isError) return <div><EvidenceError error={query.error} /><Button variant="outline" onClick={() => void query.refetch()}>Reload specimen holds</Button></div>
  if (!query.data.workOrderId || !query.data.specimens.length) return null
  return <Card className="my-4 gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Specimen holds</CardTitle><p className="text-sm text-muted-foreground">A request blocks new work and result release. Phaeno confirms when an ongoing procedure can safely pause or resume. Charges and retention dates do not change automatically. Results already delivered remain available.</p></CardHeader>
    <CardContent className="space-y-3 p-4">{query.data.specimens.map(specimen => {
      const history = query.data.holds.filter(h => h.labSpecimenId === specimen.id)
      const hold = history.find(h => h.state !== 'Released')
      const actions: Decision[] = []
      if (query.data.canRequest && (!hold || hold.state !== 'ResumeRequested')) actions.push({ specimen, hold, action: 'request', label: hold ? 'Request resumption' : 'Request pause' })
      if (query.data.canDecide && hold) {
        if (hold.state === 'Requested' || hold.state === 'UnableToPause') actions.push({ specimen, hold, action: 'apply', label: 'Confirm safe pause' })
        if (hold.state === 'Requested') actions.push({ specimen, hold, action: 'unable', label: 'Cannot pause ongoing work' })
        if (hold.state === 'ResumeRequested') actions.push({ specimen, hold, action: 'resume', label: 'Approve resumption' }, { specimen, hold, action: 'keep-held', label: 'Keep paused' })
      }
      return <div key={specimen.id} className="rounded-md border p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium wrap-anywhere">{specimen.name}</p><p className="text-sm">{hold ? labels[hold.state] : 'No customer hold'}</p></div>
        {actions.length === 1 ? <Button size="sm" variant="outline" onClick={() => choose(actions[0])}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline">Actions<ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">{actions.map(action => <DropdownMenuItem key={action.action} onSelect={() => choose(action)}>{action.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}</div>
        {hold ? <div className="mt-2 text-sm whitespace-pre-wrap"><p>{hold.reason}</p>{hold.response ? <p className="mt-1">Latest response: {hold.response}</p> : null}</div> : null}
        {history.length ? <details className="mt-2 text-sm"><summary className="cursor-pointer">Hold history</summary>{(query.data.history ?? []).filter(h => h.labSpecimenId === specimen.id).map(h => <p key={h.id} className="mt-2 whitespace-pre-wrap">{new Date(h.occurredAtUtc).toLocaleString()} · {labels[h.state]} · {h.reason}</p>)}</details> : null}
      </div>
    })}</CardContent>
    <Dialog open={decision !== null} onOpenChange={open => { if (!open) close() }}><DialogContent showCloseButton={!mutation.isPending}><form onSubmit={form.handleSubmit(values => mutation.mutate(values))}><DialogHeader><DialogTitle>{decision?.label}</DialogTitle><DialogDescription>{decision?.specimen.name}. Changes are recorded in the sample history. Releasing this hold does not automatically start work or clear other restrictions.</DialogDescription></DialogHeader>
      <div className="my-4 space-y-3"><Label htmlFor={id}><RequiredFieldName>{staff ? 'Reason shared with the customer' : 'Reason'}</RequiredFieldName></Label><textarea id={id} disabled={mutation.isPending} maxLength={2000} aria-invalid={Boolean(form.formState.errors.reason)} className="min-h-24 w-full rounded-md border bg-background p-2" {...form.register('reason')} />{form.formState.errors.reason ? <p role="alert">{form.formState.errors.reason.message}</p> : null}
      {staff ? <label className="flex items-start gap-2"><input type="checkbox" disabled={mutation.isPending} {...form.register('confirmed')} /><span>I verified the safe operational boundary, including work with external providers.</span></label> : null}{form.formState.errors.confirmed ? <p role="alert">{form.formState.errors.confirmed.message}</p> : null}
      {mutation.isError ? <EvidenceError error={mutation.error} /> : null}</div>
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : decision?.label}</Button></RequiredDialogFooter>
    </form></DialogContent></Dialog>
  </Card>
}
