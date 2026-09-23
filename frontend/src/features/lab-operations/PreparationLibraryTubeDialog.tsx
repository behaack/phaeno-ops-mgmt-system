import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { PreparationMember } from '#/api/lab-preparation'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { PreparationField, prepSelectClass } from './preparation-ui'

const schema = z.object({ barcodeSource: z.enum(['PhaenoGenerated', 'Manufacturer']), barcode: z.string().trim().max(100, 'Use 100 characters or fewer.') }).superRefine((value, context) => {
  if (value.barcodeSource === 'Manufacturer' && !value.barcode) context.addIssue({ code: 'custom', path: ['barcode'], message: 'Scan the full manufacturer barcode.' })
  if (value.barcodeSource === 'Manufacturer' && (/\s/u.test(value.barcode) || [...value.barcode].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) >= 127 && character.charCodeAt(0) <= 159))) context.addIssue({ code: 'custom', path: ['barcode'], message: 'Use the complete barcode without whitespace or control characters.' })
})
type Values = z.infer<typeof schema>

export function PreparationLibraryTubeDialog({ member, pending, error, onClose, onSubmit }: {
  member: PreparationMember; pending: boolean; error?: string; onClose: () => void;
  onSubmit: (value: { barcodeSource: 'PhaenoGenerated' | 'Manufacturer'; barcode?: string }) => void
}) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { barcodeSource: 'PhaenoGenerated', barcode: '' } })
  const source = form.watch('barcodeSource')
  const close = () => { if (!pending && (!form.formState.isDirty || window.confirm('Discard the unsaved library tube entry?'))) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><form className="contents" onSubmit={form.handleSubmit(value => onSubmit({ barcodeSource: value.barcodeSource, ...(value.barcodeSource === 'Manufacturer' ? { barcode: value.barcode } : {}) }))} noValidate>
    <DialogHeader><DialogTitle>Assign library tube</DialogTitle><DialogDescription>Assign the separate physical tube for position {member.position}. Record the amount pipetted into it during the Biological material step.</DialogDescription>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</DialogHeader>
    <fieldset disabled={pending} className="min-w-0 space-y-4">
      <p className="text-sm">Source: <span className="break-all font-mono">{member.barcode}</span> · Attempt {member.sequence}</p>
      <PreparationField id="library-tube-barcode-source" label="Library tube barcode" required error={form.formState.errors.barcodeSource?.message}><select id="library-tube-barcode-source" className={`${prepSelectClass} cursor-pointer`} {...form.register('barcodeSource')}><option value="PhaenoGenerated">Generate POMS label</option><option value="Manufacturer">Use manufacturer barcode</option></select></PreparationField>
      {source === 'Manufacturer' ? <PreparationField id="library-tube-manufacturer-barcode" label="Scan manufacturer barcode" required error={form.formState.errors.barcode?.message}><Input id="library-tube-manufacturer-barcode" maxLength={100} autoComplete="off" spellCheck={false} {...form.register('barcode')} /></PreparationField> : <p className="text-sm text-muted-foreground">POMS will allocate the tube barcode. Open the assigned tube to print its label, then scan the physical label when recording the transfer.</p>}
      <p className="text-sm text-muted-foreground">Assigning a tube does not record pipetting or change the source material amount.</p>
    </fieldset>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={pending} onClick={close}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? 'Assigning…' : 'Assign library tube'}</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
