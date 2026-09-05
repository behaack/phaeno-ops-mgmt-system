import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from '@tanstack/react-router'
import { useRef, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage } from '#/api/organization-management'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { SearchableSelect } from '#/components/ui/searchable-select'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'

export type TrialFormField = { name: string; label: string; type?: 'text' | 'number' | 'datetime-local' | 'textarea' | 'select' | 'checkbox'; required?: boolean; min?: number; max?: number; options?: { value: string; label: string }[]; defaultValue?: string; help?: string }
export type TrialReloadResult = { resetFields?: string[]; values?: Record<string, string>; message?: string; fields?: TrialFormField[] } | void
export function TrialFormDialog({ title, description, fields, children, onClose, onSubmit, onReload, submitLabel = 'Save', submitDisabled = false }: {
  title: string; description: string; fields: TrialFormField[]; children?: ReactNode; onClose: () => void
  onSubmit: (values: Record<string, string>, key: string) => Promise<void>; onReload?: () => Promise<TrialReloadResult>; submitLabel?: string; submitDisabled?: boolean
}) {
  const key = useRef(crypto.randomUUID()); const [error, setError] = useState<string | null>(null)
  const [opener] = useState(() => typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null)
  const [reloaded, setReloaded] = useState<string | null>(null)
  const [isReloading, setIsReloading] = useState(false)
  const reloadPending = useRef(false)
  const schema = z.record(z.string(), z.string()).superRefine((values, context) => {
    for (const field of fields) {
      const value = values[field.name] ?? ''
      if (field.required && (!value.trim() || field.type === 'checkbox' && value !== 'yes')) context.addIssue({ code: 'custom', path: [field.name], message: `${field.label} is required.` })
      if (field.type === 'number' && value && (!Number.isFinite(Number(value)) || Number(value) < (field.min ?? 0))) context.addIssue({ code: 'custom', path: [field.name], message: `Enter a number of at least ${field.min ?? 0}.` })
      if (field.type === 'number' && value && field.max !== undefined && Number(value) > field.max) context.addIssue({ code: 'custom', path: [field.name], message: `Enter a number no greater than ${field.max}.` })
      if (field.type === 'select' && value && !field.options?.some(option => option.value === value)) context.addIssue({ code: 'custom', path: [field.name], message: 'This choice is no longer available. Choose a current option.' })
    }
  })
  const form = useForm<Record<string, string>>({ resolver: zodResolver(schema), defaultValues: Object.fromEntries(fields.map(field => [field.name, field.defaultValue ?? (field.options?.length === 1 ? field.options[0].value : '')])) })
  const { isDirty } = form.formState
  const busy = form.formState.isSubmitting || isReloading
  useBlocker({ shouldBlockFn: () => reloadPending.current, enableBeforeUnload: () => reloadPending.current, disabled: !isReloading })
  async function submit(values: Record<string, string>) {
    if (submitDisabled || reloadPending.current) return
    setError(null)
    try { await onSubmit(values, key.current); onClose() }
    catch (failure) { setError(apiErrorMessage(failure)); setReloaded(null) }
  }
  function close() { if (!reloadPending.current && !form.formState.isSubmitting && (!isDirty || window.confirm('Discard the unsaved Trial changes?'))) onClose() }
  async function reload() {
    if (reloadPending.current || form.formState.isSubmitting || !onReload) return
    reloadPending.current = true; setIsReloading(true); setReloaded(null)
    try {
      const result = await onReload()
      for (const name of result?.resetFields ?? []) form.setValue(name, '', { shouldValidate: false })
      for (const [name, value] of Object.entries(result?.values ?? {})) form.setValue(name, value)
      for (const field of result?.fields ?? fields) if (field.type === 'select' && form.getValues(field.name) && !field.options?.some(option => option.value === form.getValues(field.name))) form.setValue(field.name, '')
      form.clearErrors(); key.current = crypto.randomUUID(); setError(null)
      setReloaded(result?.message ?? 'The current Trial was reloaded. Your entries are preserved; review them before saving again.')
    } catch (failure) { setError(apiErrorMessage(failure)) }
    finally { reloadPending.current = false; setIsReloading(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent className="max-h-[90dvh] sm:max-w-2xl" showCloseButton={!busy} onCloseAutoFocus={event => { event.preventDefault(); opener?.focus() }}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <DialogFeedback>{error ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p>{onReload ? <Button type="button" variant="outline" disabled={busy} onClick={() => { void reload() }}>{isReloading ? 'Reloading…' : 'Reload current Trial; keep my entries'}</Button> : null}</div> : null}{isReloading ? <p role="status" className="text-sm">Reloading current Trial… Your entries are preserved.</p> : reloaded ? <p role="status" className="text-sm">{reloaded}</p> : null}</DialogFeedback>
      <form noValidate aria-busy={busy} onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-col gap-4">
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Disabled controls leave the scrollable fields without a keyboard target. */}
        <div role="region" aria-label={`${title} fields`} tabIndex={busy ? 0 : undefined} className="max-h-[60dvh] space-y-4 overflow-y-auto px-1 pb-2 focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 focus-visible:outline-none">
          <fieldset disabled={busy} className="space-y-4">
          {children}
          {fields.map(field => <div key={field.name} className="space-y-1.5">
            <Label htmlFor={`trial-${field.name}`}>{field.required ? <RequiredFieldName>{field.label}</RequiredFieldName> : field.label}</Label>
            {field.type === 'textarea' ? <Textarea id={`trial-${field.name}`} rows={3} {...form.register(field.name)} aria-invalid={Boolean(form.formState.errors[field.name])} aria-describedby={`trial-${field.name}-help trial-${field.name}-error`} />
              : field.type === 'select' ? <Controller name={field.name} control={form.control} render={({ field: control }) => <SearchableSelect id={`trial-${field.name}`} value={control.value ?? ''} onValueChange={control.onChange} inputRef={control.ref} aria-invalid={Boolean(form.formState.errors[field.name])} resultsLabel={`${field.label} choices`} selectionMessage="Select an option from the results." noMatchMessage="No matching choices." narrowMessage={count => `Keep typing to narrow ${count} choices.`} options={field.options ?? []} placeholder="Search and select…" emptyMessage="No matching choices." required={field.required} aria-describedby={`trial-${field.name}-help trial-${field.name}-error`} />} />
                : field.type === 'checkbox' ? <Controller name={field.name} control={form.control} render={({ field: control }) => <input id={`trial-${field.name}`} type="checkbox" ref={control.ref} checked={control.value === 'yes'} onChange={event => control.onChange(event.target.checked ? 'yes' : '')} onBlur={control.onBlur} aria-invalid={Boolean(form.formState.errors[field.name])} aria-describedby={`trial-${field.name}-help trial-${field.name}-error`} className="block size-5 cursor-pointer accent-primary" />} />
                  : <Input id={`trial-${field.name}`} type={field.type ?? 'text'} min={field.min} max={field.max} step={field.type === 'number' ? 'any' : undefined} {...form.register(field.name)} aria-invalid={Boolean(form.formState.errors[field.name])} aria-describedby={`trial-${field.name}-help trial-${field.name}-error`} />}
            <p id={`trial-${field.name}-help`} className="text-xs text-muted-foreground">{field.help}</p>
            {form.formState.errors[field.name] ? <p id={`trial-${field.name}-error`} role="alert" className="text-sm text-destructive">{form.formState.errors[field.name]?.message}</p> : null}
          </div>)}
          </fieldset>
        </div>
        <DialogFooter><RequiredLegend className="mr-auto" /><Button type="button" variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button type="submit" disabled={busy || submitDisabled}>{form.formState.isSubmitting ? 'Saving…' : submitLabel}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
