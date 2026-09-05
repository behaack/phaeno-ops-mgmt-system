import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage } from '#/api/organization-management'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'

export type TrialFormField = { name: string; label: string; type?: 'text' | 'number' | 'datetime-local' | 'textarea' | 'select' | 'checkbox'; required?: boolean; min?: number; options?: { value: string; label: string }[]; defaultValue?: string; help?: string }
export function TrialFormDialog({ title, description, fields, children, onClose, onSubmit, onReload, submitLabel = 'Save' }: {
  title: string; description: string; fields: TrialFormField[]; children?: ReactNode; onClose: () => void
  onSubmit: (values: Record<string, string>, key: string) => Promise<void>; onReload?: () => Promise<unknown>; submitLabel?: string
}) {
  const key = useRef(crypto.randomUUID()); const [error, setError] = useState<string | null>(null)
  const [opener] = useState(() => typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null)
  const [reloaded, setReloaded] = useState(false)
  const schema = z.record(z.string(), z.string()).superRefine((values, context) => {
    for (const field of fields) {
      const value = values[field.name] ?? ''
      if (field.required && (!value.trim() || field.type === 'checkbox' && value !== 'yes')) context.addIssue({ code: 'custom', path: [field.name], message: `${field.label} is required.` })
      if (field.type === 'number' && value && (!Number.isFinite(Number(value)) || Number(value) < (field.min ?? 0))) context.addIssue({ code: 'custom', path: [field.name], message: `Enter a number of at least ${field.min ?? 0}.` })
    }
  })
  const form = useForm<Record<string, string>>({ resolver: zodResolver(schema), defaultValues: Object.fromEntries(fields.map(field => [field.name, field.defaultValue ?? (field.options?.length === 1 ? field.options[0].value : '')])) })
  async function submit(values: Record<string, string>) {
    setError(null)
    try { await onSubmit(values, key.current); onClose() }
    catch (failure) { setError(apiErrorMessage(failure)); setReloaded(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !form.formState.isSubmitting) onClose() }}>
    <DialogContent className="max-h-[90dvh] sm:max-w-2xl" onCloseAutoFocus={event => { event.preventDefault(); opener?.focus() }}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <form onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-col gap-4">
        <div className="max-h-[60dvh] space-y-4 overflow-y-auto px-1 pb-2">
          {children}
          {fields.map(field => <div key={field.name} className="space-y-1.5">
            <Label htmlFor={`trial-${field.name}`}>{field.label}{field.required ? <span aria-hidden="true">*</span> : null}</Label>
            {field.type === 'textarea' ? <Textarea id={`trial-${field.name}`} rows={3} {...form.register(field.name)} aria-invalid={Boolean(form.formState.errors[field.name])} aria-describedby={`trial-${field.name}-help trial-${field.name}-error`} />
              : field.type === 'select' ? <select id={`trial-${field.name}`} {...form.register(field.name)} aria-invalid={Boolean(form.formState.errors[field.name])} aria-describedby={`trial-${field.name}-help trial-${field.name}-error`} className="h-10 w-full cursor-pointer rounded-md border bg-background px-3 text-sm"><option value="">Select…</option>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                : field.type === 'checkbox' ? <Controller name={field.name} control={form.control} render={({ field: control }) => <input id={`trial-${field.name}`} type="checkbox" ref={control.ref} checked={control.value === 'yes'} onChange={event => control.onChange(event.target.checked ? 'yes' : '')} onBlur={control.onBlur} aria-invalid={Boolean(form.formState.errors[field.name])} aria-describedby={`trial-${field.name}-help trial-${field.name}-error`} className="block size-5 cursor-pointer accent-primary" />} />
                  : <Input id={`trial-${field.name}`} type={field.type ?? 'text'} min={field.min} step={field.type === 'number' ? 'any' : undefined} {...form.register(field.name)} aria-invalid={Boolean(form.formState.errors[field.name])} aria-describedby={`trial-${field.name}-help trial-${field.name}-error`} />}
            <p id={`trial-${field.name}-help`} className="text-xs text-muted-foreground">{field.help}</p>
            {form.formState.errors[field.name] ? <p id={`trial-${field.name}-error`} role="alert" className="text-sm text-destructive">{form.formState.errors[field.name]?.message}</p> : null}
          </div>)}
          {error ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p>{onReload ? <Button type="button" variant="outline" onClick={async () => { try { await onReload(); key.current = crypto.randomUUID(); setReloaded(true) } catch (failure) { setError(apiErrorMessage(failure)) } }}>Reload current Trial; keep my entries</Button> : null}</div> : null}
          {reloaded ? <p role="status" className="text-sm">The current Trial was reloaded. Your entries are preserved; review them before saving again.</p> : null}
        </div>
        <DialogFooter><span className="mr-auto text-xs text-muted-foreground">* Required</span><Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onClose}>Cancel</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : submitLabel}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
