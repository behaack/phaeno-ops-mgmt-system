import { LoadingState } from '#/components/ui/content-state'
import { useBlocker } from '@tanstack/react-router'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { findStorageBoxes, saveStorageBox, type StorageBox } from '#/api/lab-physical'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { confirmPortal } from '#/components/PortalConfirmation'
import { EvidenceError } from './InvestigationEvidence'

export const boxLocation = (box: StorageBox) => `${box.room} / ${box.freezer} / ${box.rack} / ${box.shelf}`
const schema = z.object({ room: z.string().trim().min(1).max(100), freezer: z.string().trim().min(1).max(100), rack: z.string().trim().min(1).max(100), shelf: z.string().trim().min(1).max(100), reason: z.string().trim().min(1).max(2000) })

// A known box is confirmed without rewriting it. Editing requires an explicit move action.
export function StorageBoxDialog({ barcode, mode = 'confirm', onClose, onConfirmed }: { barcode: string; mode?: 'confirm' | 'move'; onClose: () => void; onConfirmed: (box: StorageBox) => void }) {
  const query = useQuery({ queryKey: ['storage-box', barcode], queryFn: () => findStorageBoxes(barcode) })
  const box = query.data?.[0]
  if (!query.isPending && !query.isError && (!box || mode === 'move')) return <BoxForm key={box?.id ?? barcode} barcode={barcode} box={box} onClose={onClose} onConfirmed={onConfirmed} />
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); (event.target as HTMLElement).querySelector<HTMLButtonElement>('[data-slot="dialog-footer"] button')?.focus() }}>
    <DialogHeader><DialogTitle>{mode === 'move' ? 'Register or move freezer box' : 'Confirm freezer box'}</DialogTitle><DialogDescription>{barcode}. A box move changes the effective location of every tube currently associated with it.</DialogDescription></DialogHeader>
    <div>{query.isPending ? <LoadingState label="Looking up box…" /> : query.isError ? <><EvidenceError error={query.error} /><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></> : box && mode === 'confirm' ? <><p className="break-words">Recorded location: {boxLocation(box)}</p><p className="mt-2 text-sm">Confirm the physical box and its location before placing tubes.</p></> : null}</div>
    {box && mode === 'confirm' ? <RequiredDialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onConfirmed(box)}>Confirm box and location</Button></RequiredDialogFooter> : query.isPending || query.isError ? <RequiredDialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button></RequiredDialogFooter> : null}
  </DialogContent></Dialog>
}

function BoxForm({ barcode, box, onClose, onConfirmed }: { barcode: string; box?: StorageBox; onClose: () => void; onConfirmed: (box: StorageBox) => void }) {
  const client = useQueryClient()
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { room: box?.room ?? '', freezer: box?.freezer ?? '', rack: box?.rack ?? '', shelf: box?.shelf ?? '', reason: '' } })
  const request = useRef<{ hash: string; id: string } | null>(null)
  const save = useMutation({ mutationFn: (value: z.infer<typeof schema>) => {
    const hash = JSON.stringify(value)
    if (request.current?.hash !== hash) request.current = { hash, id: crypto.randomUUID() }
    return saveStorageBox({ requestId: request.current.id, barcode, ...value, version: box?.version })
  }, onSuccess: async result => { await client.invalidateQueries({ queryKey: ['storage-box'] }); await client.invalidateQueries({ queryKey: ['lab-physical'] }); onConfirmed(result) } })
  const dirty = form.formState.isDirty
  const cancel = async () => { if (!save.isPending && (!dirty || await confirmPortal('Discard the unsaved box location?'))) onClose() }
  useBlocker({ shouldBlockFn: async () => save.isPending || dirty && !await confirmPortal('Discard the unsaved box location?'), enableBeforeUnload: () => save.isPending || dirty })
  return <Dialog open onOpenChange={open => { if (!open) void cancel() }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); (event.target as HTMLElement).querySelector<HTMLButtonElement>('[data-slot="dialog-footer"] button')?.focus() }}><DialogHeader><DialogTitle>{box ? 'Move freezer box' : 'Register freezer box'}</DialogTitle><DialogDescription>{barcode}. Record the actual location. A box move applies to all associated tubes.</DialogDescription></DialogHeader><form id="storage-box-form" className="space-y-3" noValidate onSubmit={form.handleSubmit(value => save.mutate(value))}>
    <p className="text-sm">{box ? `Current location: ${boxLocation(box)}. Record the actual destination.` : 'This box is not registered. Record its actual location; no earlier location is inferred.'}</p>
    {(['room', 'freezer', 'rack', 'shelf', 'reason'] as const).map(key => <Field key={key}><Label htmlFor={`box-${key}`}><RequiredFieldName>{key === 'shelf' ? 'Shelf / box location' : key[0].toUpperCase() + key.slice(1)}</RequiredFieldName></Label><Input id={`box-${key}`} {...form.register(key)} aria-invalid={Boolean(form.formState.errors[key])} aria-describedby={`box-${key}-error`} /><FieldError id={`box-${key}-error`}>{form.formState.errors[key]?.message}</FieldError></Field>)}
    {save.isError ? <EvidenceError error={save.error} /> : null}
  </form><RequiredDialogFooter><Button variant="outline" disabled={save.isPending} onClick={() => void cancel()}>Cancel</Button><Button form="storage-box-form" type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : box ? 'Record box move' : 'Register box and confirm'}</Button></RequiredDialogFooter></DialogContent></Dialog>
}
