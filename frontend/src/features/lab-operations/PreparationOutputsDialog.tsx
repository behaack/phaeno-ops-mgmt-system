import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { PreparationDetail, PreparationMember, PreparationOutputInput } from '#/api/lab-preparation'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { PreparationField, prepRowClass } from './preparation-ui'

const schema = z.object({
  unit: z.string().trim().min(1, 'Enter the shared quantity unit.').max(50),
  location: z.string().trim().min(1, 'Enter the shared storage location.').max(255),
  rows: z.array(z.object({
    quantity: z.string().trim().refine(value => value !== '' && Number.isFinite(Number(value)) && Number(value) > 0, 'Enter a positive actual quantity.'),
    unit: z.string().trim().max(50), location: z.string().trim().max(255),
  })).min(1),
})
type Values = z.infer<typeof schema>

export function PreparationOutputsDialog({ members, supported, pending, error, onClose, onSubmit, preview = false }: {
  preview?: boolean;
  members: PreparationMember[]; supported: boolean; pending: boolean; error?: string; onClose: () => void;
  onSubmit: (outputs: PreparationOutputInput[]) => Promise<PreparationDetail>;
}) {
  // Keep the reviewed rows and draft stable if a failed request refreshes the batch.
  // An uncertain response must be retried with the original member coverage.
  const [reviewed] = useState(() => members)
  const [targets] = useState(() => members.filter(m => !m.output && !m.blocker && !['Failed', 'Cancelled', 'Succeeded', 'QcHeld'].includes(m.state)))
  const [saved, setSaved] = useState<PreparationMember[]>()
  const [saveError, setSaveError] = useState('')
  const [previewValid, setPreviewValid] = useState(false)
  const saving = useRef(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { unit: '', location: '', rows: targets.map(() => ({ quantity: '', unit: '', location: '' })) } })
  const busy = pending || form.formState.isSubmitting
  const sharedUnit = form.watch('unit')
  const sharedLocation = form.watch('location')
  const submit = async (values: Values) => {
    if (pending || !supported || saving.current) return
    if (preview) { setPreviewValid(true); return }
    saving.current = true
    setSaveError('')
    try {
      const result = await onSubmit(targets.map((member, index) => ({ memberId: member.id, quantity: Number(values.rows[index].quantity), quantityUnit: values.rows[index].unit || values.unit, location: values.rows[index].location || values.location })))
      setSaved(result.members.filter(m => targets.some(t => t.id === m.id)))
    } catch {
      setSaveError('Outputs could not be confirmed as saved. Your entries are retained; review the message and retry.')
    } finally {
      saving.current = false
    }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent className="sm:max-w-3xl"><form className="contents" onSubmit={form.handleSubmit(submit)} noValidate>
    <DialogHeader><DialogTitle>{preview ? 'Configuration preview · ' : ''}{saved ? 'Library outputs created' : 'Create library outputs'}</DialogTitle><DialogDescription>{preview ? 'Inspect shared defaults and individual output quantities with fictional tubes.' : saved ? 'Each output has its own barcode and remains linked to its source tube. Physical barcode confirmation is still required.' : 'Record prepared library quantities and locations. Assigned library tubes retain their barcodes; POMS assigns a barcode when no library tube was assigned. This does not withdraw source material again.'}</DialogDescription>{preview ? <p className="text-sm">Fictional tubes. No outputs or barcodes will be created.</p> : null}{previewValid ? <p role="status">Example output values are valid. Nothing was saved.</p> : null}</DialogHeader>
    {saved ? <div className="space-y-3">
      <p role="status">Created {saved.length} library outputs. Return to the step to record the output barcodes; confirm physical output identity from each tube when ready.</p>
      {saved.map(m => <div key={m.id} className={prepRowClass}><h3 className="font-medium">{m.position} · {m.barcode}</h3><p className="mt-1 break-all">Output: {m.output?.barcode}</p><p className="text-sm">{m.output?.quantity} {m.output?.quantityUnit}</p></div>)}
    </div> : <fieldset disabled={busy} className="min-w-0 space-y-4">
      {!supported ? <p role="alert">Shared output creation needs the latest application update. Refresh the page once it is available.</p> : null}
      {error || saveError ? <p role="alert" className="text-sm text-destructive">{error || saveError}</p> : null}
      {targets.length ? <>
        <div className={`${prepRowClass} space-y-3`}><h3 className="font-medium">Shared defaults</h3><div className="grid gap-3 sm:grid-cols-2">
          <PreparationField id="outputs-unit" label="Quantity unit" required error={form.formState.errors.unit?.message}><Input id="outputs-unit" maxLength={50} {...form.register('unit')} /></PreparationField>
          <PreparationField id="outputs-location" label="Storage location" required error={form.formState.errors.location?.message}><Input id="outputs-location" maxLength={255} {...form.register('location')} /></PreparationField>
        </div></div>
        {targets.map((m, index) => <section key={m.id} className={`${prepRowClass} space-y-3`} aria-label={`Output for ${m.position}`}>
          <h3 className="font-medium">{m.position} · {m.barcode}</h3>
          <p className="text-sm text-muted-foreground">{preview ? 'Example only · no barcode allocated' : m.libraryTube ? `Library tube: ${m.libraryTube.barcode}. Record its prepared yield.` : 'Output barcode: assigned when saved'}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <PreparationField id={`output-${m.id}-quantity`} label="Actual output quantity" required error={form.formState.errors.rows?.[index]?.quantity?.message}><Input id={`output-${m.id}-quantity`} type="number" step="any" {...form.register(`rows.${index}.quantity`)} /></PreparationField>
            <PreparationField id={`output-${m.id}-unit`} label="Unit override (optional)" error={form.formState.errors.rows?.[index]?.unit?.message}><Input id={`output-${m.id}-unit`} placeholder={sharedUnit || 'Use shared unit'} maxLength={50} {...form.register(`rows.${index}.unit`)} /></PreparationField>
            <PreparationField id={`output-${m.id}-location`} label="Location override (optional)" error={form.formState.errors.rows?.[index]?.location?.message}><Input id={`output-${m.id}-location`} placeholder={sharedLocation || 'Use shared location'} maxLength={255} {...form.register(`rows.${index}.location`)} /></PreparationField>
          </div>
        </section>)}
      </> : <p>All covered tubes already have outputs or are unavailable for output creation.</p>}
      {reviewed.filter(m => !targets.some(t => t.id === m.id)).map(m => <div key={m.id} className={prepRowClass}><h3 className="font-medium">{m.position} · {m.barcode}</h3><p className="break-all text-sm">{m.output ? `Existing output: ${m.output.barcode}` : m.blocker || `Output unavailable: ${m.state}`}</p></div>)}
    </fieldset>}
    <RequiredDialogFooter showLegend={!saved && targets.length > 0}>
      {saved ? <Button type="button" onClick={onClose}>Done</Button> : <><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || !supported || !targets.length}>{busy ? 'Creating outputs…' : preview ? 'Validate entry' : 'Create library outputs'}</Button></>}
    </RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
