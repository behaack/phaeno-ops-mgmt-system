import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createSampleShippingProcedure, type SampleShippingProcedure } from '#/api/sample-shipping'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '../use-order-draft-guard'

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
  temperatureInstructions: 'Common handling during transit. Sample preservation limits belong to the sample type; the cooling method and amount belong to the sample/container combination.',
  carrierInstructions: 'Approved carrier services and tracking requirements. Receiving-site restrictions belong to the destination.',
  dispatchInstructions: 'When to dispatch and how to arrange arrival. Maintain receiving hours once on the destination.',
  requiredDocuments: 'List documents to include, or explicitly state that none are required.',
  exceptionInstructions: 'What to do about delays, damage or handling problems, including whom to contact.',
}
const requiredText = z.string().trim().min(1, 'Enter the approved instructions.').max(4000)
const schema = z.object({
  name: z.string().trim().min(1, 'Enter a procedure name.').max(255),
  packingInstructions: requiredText, temperatureInstructions: requiredText, carrierInstructions: requiredText,
  dispatchInstructions: requiredText, requiredDocuments: requiredText, exceptionInstructions: requiredText,
  internationalCustomsInstructions: z.string().trim().max(4000), isActive: z.boolean(),
})
type Values = z.infer<typeof schema>

export function ShippingProceduresPanel({ procedures, procedureId }: { procedures: SampleShippingProcedure[]; procedureId?: string }) {
  const [editor, setEditor] = useState<SampleShippingProcedure | null | undefined>()
  const navigate = useNavigate()
  const selected = procedures.find(item => item.id === procedureId)
  const latest = procedures.filter(item => !procedures.some(other => other.definitionKey === item.definitionKey && other.revision > item.revision))
  return <div className="space-y-4">
    {procedureId ? <>
      <Link className="text-sm underline" to="/sample-shipping-settings" search={{ shippingSection: 'procedures' }}>Back to shipping procedures</Link>
      {selected ? <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle>{selected.name}</CardTitle><p className="mt-2 text-sm text-muted-foreground">Revision {selected.revision} · {selected.isActive ? 'Approved for assignment' : 'Draft'}</p></div>
          {latest.some(item => item.id === selected.id) ? <Button variant="outline" onClick={() => setEditor(selected)}>Create revision</Button> : null}
        </div></CardHeader>
        <CardContent className="p-4"><dl className="space-y-5">
          {procedureFields.map(([key, label]) => <div key={key}><dt className="text-sm font-medium">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{selected[key]}</dd></div>)}
          {selected.internationalCustomsInstructions ? <div><dt className="text-sm font-medium">International customs</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{selected.internationalCustomsInstructions}</dd></div> : null}
        </dl><nav className="mt-6 border-t pt-4" aria-label="Procedure revisions"><p className="text-sm font-medium">Revision history</p><div className="mt-2 flex flex-wrap gap-3">
          {procedures.filter(item => item.definitionKey === selected.definitionKey).map(item => <Link key={item.id} className="text-sm underline" to="/sample-shipping-settings" search={{ shippingSection: 'procedures', procedureId: item.id }}>Revision {item.revision}</Link>)}
        </div></nav></CardContent>
      </Card> : <Alert><AlertTitle>Procedure not found</AlertTitle><AlertDescription>Choose an available procedure from the list.</AlertDescription></Alert>}
    </> : <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><CardTitle>Shipping procedures</CardTitle><Button onClick={() => setEditor(null)}>Add procedure</Button></div><CardDescription>Reusable common steps. Temperature control and packing for each container are maintained with its approved sample combinations.</CardDescription></CardHeader>
      <CardContent className="divide-y px-4">{latest.map(item => <div key={item.id} className="py-4"><Link className="font-medium underline" to="/sample-shipping-settings" search={{ shippingSection: 'procedures', procedureId: item.id }}>{item.name}</Link><p className="mt-1 text-sm text-muted-foreground">Revision {item.revision} · {item.isActive ? 'Approved for assignment' : 'Draft'}</p></div>)}{!latest.length ? <p className="py-4 text-sm text-muted-foreground">No shared shipping procedures have been configured.</p> : null}</CardContent>
    </Card>}
    {editor !== undefined ? <ProcedureEditor source={editor} onClose={() => setEditor(undefined)} onSaved={item => { setEditor(undefined); void navigate({ to: '/sample-shipping-settings', search: { shippingSection: 'procedures', procedureId: item.id } }) }} /> : null}
  </div>
}

function ProcedureEditor({ source, onClose, onSaved }: { source: SampleShippingProcedure | null; onClose: () => void; onSaved: (item: SampleShippingProcedure) => void }) {
  const client = useQueryClient()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    name: source?.name ?? '', packingInstructions: source?.packingInstructions ?? '', temperatureInstructions: source?.temperatureInstructions ?? '',
    carrierInstructions: source?.carrierInstructions ?? '', dispatchInstructions: source?.dispatchInstructions ?? '', requiredDocuments: source?.requiredDocuments ?? '',
    exceptionInstructions: source?.exceptionInstructions ?? '', internationalCustomsInstructions: source?.internationalCustomsInstructions ?? '', isActive: false,
  } })
  const mutation = useMutation({
    mutationFn: (values: Values) => createSampleShippingProcedure({ ...values, internationalCustomsInstructions: values.internationalCustomsInstructions || null, supersedesProcedureId: source?.id ?? null, supersededVersion: source?.version ?? null }),
    onSuccess: async item => { form.reset(form.getValues()); allowSavedNavigation(); await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onSaved(item) },
  })
  const allowSavedNavigation = useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  function close() { if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard the unsaved procedure changes?'))) onClose() }
  const errors = form.formState.errors
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="sm:max-w-2xl">
    <DialogHeader><DialogTitle>{source ? `Revise ${source.name}` : 'Add shipping procedure'}</DialogTitle><DialogDescription>Save common steps once and select this approved revision in sample shipping assignments. Existing assignments and shipments retain their recorded revisions.</DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Procedure was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the instructions and try again.')}</AlertDescription></Alert> : null}
    <form id="shipping-procedure-form" noValidate onSubmit={form.handleSubmit(values => mutation.mutate(values))}><fieldset disabled={mutation.isPending} className="space-y-4">
      <div><Label htmlFor="procedure-name"><RequiredFieldName>Name</RequiredFieldName></Label><Input id="procedure-name" className="mt-2" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'procedure-name-error' : undefined} {...form.register('name')} />{errors.name ? <p id="procedure-name-error" role="alert" className="text-sm text-destructive">{errors.name.message}</p> : null}</div>
      {procedureFields.map(([key, label]) => <div key={key}><Label htmlFor={`procedure-${key}`}><RequiredFieldName>{label}</RequiredFieldName></Label><p id={`procedure-${key}-help`} className="mt-1 text-xs text-muted-foreground">{procedureHints[key]}</p><Textarea id={`procedure-${key}`} className="mt-2" rows={3} aria-invalid={Boolean(errors[key])} aria-describedby={`procedure-${key}-help${errors[key] ? ` procedure-${key}-error` : ''}`} {...form.register(key)} />{errors[key] ? <p id={`procedure-${key}-error`} role="alert" className="text-sm text-destructive">{errors[key].message}</p> : null}</div>)}
      <div><Label htmlFor="procedure-customs">International customs</Label><Textarea id="procedure-customs" className="mt-2" rows={3} aria-invalid={Boolean(errors.internationalCustomsInstructions)} aria-describedby={errors.internationalCustomsInstructions ? 'procedure-customs-error' : undefined} {...form.register('internationalCustomsInstructions')} />{errors.internationalCustomsInstructions ? <p id="procedure-customs-error" role="alert" className="text-sm text-destructive">{errors.internationalCustomsInstructions.message}</p> : null}</div>
      <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-1" {...form.register('isActive')} /><span>Approved for assignment to samples and destinations</span></label>
    </fieldset></form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button form="shipping-procedure-form" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : source ? 'Create revision' : 'Add procedure'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
