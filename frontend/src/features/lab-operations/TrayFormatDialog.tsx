import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { saveTrayFormat, trayPositions, type TrayFormat, type TrayLayout } from '#/api/lab-preparation'
import { getLabOperationsError } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { PreparationField, prepSelectClass } from './preparation-ui'
import { useState } from 'react'

const schema = z.object({ name: z.string().trim().min(1).max(120), rows: z.number().int().min(1).max(26), columns: z.number().int().min(1).max(24), labels: z.enum(['grid', 'numeric']), unavailable: z.string(), isActive: z.boolean() }).refine(v => v.rows * v.columns <= 384, { message: 'Use at most 384 positions.', path: ['columns'] })
export function TrayFormatDialog({ format, onClose }: { format?: TrayFormat; onClose: () => void }) {
  const [id] = useState(() => format?.id ?? crypto.randomUUID())
  const client = useQueryClient()
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: format?.layout.name ?? '', rows: format?.layout.rows ?? 4, columns: format?.layout.columns ?? 6, labels: format?.layout.labels ?? 'grid', unavailable: format?.layout.unavailable.join(', ') ?? '', isActive: format?.isActive ?? true } })
  const value = form.watch()
  const layout: TrayLayout = { ...value, rows: Number.isFinite(value.rows) ? Math.max(1, Math.min(26, value.rows)) : 1, columns: Number.isFinite(value.columns) ? Math.max(1, Math.min(24, value.columns)) : 1, unavailable: value.unavailable.split(/[\s,]+/).filter(Boolean) }
  const save = useMutation({ mutationFn: (v: z.infer<typeof schema>) => saveTrayFormat({ id, version: format?.version ?? 0, layout: { name: v.name, rows: v.rows, columns: v.columns, labels: v.labels, unavailable: v.unavailable.split(/[\s,]+/).filter(Boolean) }, isActive: v.isActive }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['lab-preparation'] }); onClose() } })
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose() }}><DialogContent><form className="contents" noValidate onSubmit={form.handleSubmit(v => save.mutate(v))}>
    <DialogHeader><DialogTitle>{format ? 'Edit tray format' : 'New tray format'}</DialogTitle><DialogDescription>Existing batch layouts remain unchanged when this format is edited or retired.</DialogDescription></DialogHeader>
    <div className="space-y-4">{save.isError ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(save.error, 'Tray format could not be saved.')}</p> : null}
      <PreparationField label="Name" id="tray-name" required error={form.formState.errors.name?.message}><Input id="tray-name" {...form.register('name')} /></PreparationField>
      <PreparationField label="Rows" id="tray-rows" required error={form.formState.errors.rows?.message}><Input id="tray-rows" type="number" {...form.register('rows', { valueAsNumber: true })} /></PreparationField>
      <PreparationField label="Columns" id="tray-columns" required error={form.formState.errors.columns?.message}><Input id="tray-columns" type="number" {...form.register('columns', { valueAsNumber: true })} /></PreparationField>
      <PreparationField label="Position labels" id="tray-labels" required><select id="tray-labels" className={prepSelectClass} {...form.register('labels')}><option value="grid">Rows and columns (A1, A2…)</option><option value="numeric">Numbers (1, 2…)</option></select></PreparationField>
      <PreparationField label="Unavailable positions (optional)" id="tray-unavailable"><Input id="tray-unavailable" placeholder="A1, D6" {...form.register('unavailable')} /></PreparationField>
      <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" {...form.register('isActive')} />Available for new batches</label>
      <div aria-label="Tray layout preview" className="overflow-x-auto"><div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(2.5rem, 1fr))` }}>{trayPositions(layout).map(p => <span key={p} className={`rounded border p-1 text-center text-xs ${layout.unavailable.includes(p) ? 'bg-muted line-through' : 'bg-background'}`}>{p}</span>)}</div></div>
    </div><RequiredDialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button disabled={save.isPending}>Save format</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
