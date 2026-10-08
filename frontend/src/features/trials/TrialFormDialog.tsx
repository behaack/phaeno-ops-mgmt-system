import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from '@tanstack/react-router'
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
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
import { FieldError } from '#/components/ui/field'

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
  const submitPending = useRef(false)
  const navigationApproved = useRef(false)
  const schema = z.record(z.string(), z.string()).superRefine((values, context) => {
    for (const field of fields) {
      const value = values[field.name] ?? ''
      if (field.required && (!value.trim() || field.type === 'checkbox' && value !== 'yes')) context.addIssue({ code: 'custom', path: [field.name], message: `${field.label} is required.` })
      if (field.type === 'number' && value && (!Number.isFinite(Number(value)) || Number(value) < (field.min ?? 0))) context.addIssue({ code: 'custom', path: [field.name], message: `Enter a number of at least ${field.min ?? 0}.` })
      if (field.type === 'number' && value && field.max !== undefined && Number(value) > field.max) context.addIssue({ code: 'custom', path: [field.name], message: `Enter a number no greater than ${field.max}.` })
      if (field.type === 'select' && value && !field.options?.some(option => option.value === value)) context.addIssue({ code: 'custom', path: [field.name], message: 'This choice is no longer available. Choose a current option.' })
    }
  })
  const form = useForm<Record<string, string>>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: Object.fromEntries(fields.map(field => [field.name, field.defaultValue ?? (field.options?.length === 1 ? field.options[0].value : '')])) })
  const { isDirty } = form.formState
  const busy = form.formState.isSubmitting || isReloading
  useBlocker({
    shouldBlockFn: () => !navigationApproved.current && (busy || reloadPending.current || submitPending.current || (isDirty && !window.confirm('Discard the unsaved Trial changes?'))),
    enableBeforeUnload: () => !navigationApproved.current && (isDirty || busy || reloadPending.current || submitPending.current),
  })
  async function submit(values: Record<string, string>) {
    if (submitDisabled || reloadPending.current || submitPending.current) return
    submitPending.current = true
    setError(null)
    try { await onSubmit(values, key.current); navigationApproved.current = true; onClose() }
    catch (failure) { setError(apiErrorMessage(failure)); setReloaded(null) }
    finally { submitPending.current = false }
  }
  function close() { if (!reloadPending.current && !submitPending.current && !form.formState.isSubmitting && (!isDirty || window.confirm('Discard the unsaved Trial changes?'))) { navigationApproved.current = true; onClose() } }
  function updateChoice(name: string, value: string) { form.setValue(name, value, { shouldDirty: true, shouldValidate: Boolean(form.getFieldState(name).error) }) }
  function inputProps(name: string) { return { ...form.register(name), onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { void form.register(name).onChange(event); if (form.getFieldState(name).error) void form.trigger(name) } } }
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
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keep the fields keyboard-focusable while controls are disabled. */}
        <div role="region" aria-label={`${title} fields`} tabIndex={busy ? 0 : undefined} className="space-y-4 px-1 pb-2 focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 focus-visible:outline-none">
          <fieldset disabled={busy} className="space-y-4">
          {children}
          {fields.map(field => {
            const fieldError = form.formState.errors[field.name]
            const describedBy = [field.help ? `trial-${field.name}-help` : '', fieldError ? `trial-${field.name}-error` : ''].filter(Boolean).join(' ') || undefined
            return <div key={field.name} className="space-y-1.5" onBlur={event => { if (field.type === 'select' && !event.currentTarget.contains(event.relatedTarget)) void form.trigger(field.name) }}>
            <Label htmlFor={`trial-${field.name}`}>{field.required ? <RequiredFieldName>{field.label}</RequiredFieldName> : field.label}</Label>
            {field.help ? <p id={`trial-${field.name}-help`} className="text-xs text-muted-foreground">{field.help}</p> : null}
            {field.type === 'textarea' ? <Textarea id={`trial-${field.name}`} rows={3} required={field.required} {...inputProps(field.name)} aria-invalid={Boolean(fieldError)} aria-describedby={describedBy} />
              : field.type === 'select' ? <Controller name={field.name} control={form.control} render={({ field: control }) => <SearchableSelect portal id={`trial-${field.name}`} value={control.value ?? ''} onValueChange={value => updateChoice(field.name, value)} inputRef={control.ref} aria-invalid={Boolean(fieldError)} resultsLabel={`${field.label} choices`} selectionMessage="Select an option from the results." noMatchMessage="No matching choices." narrowMessage={count => `Keep typing to narrow ${count} choices.`} options={field.options ?? []} placeholder="Search and select…" emptyMessage="No matching choices." required={field.required} aria-describedby={describedBy} />} />
                : field.type === 'checkbox' ? <Controller name={field.name} control={form.control} render={({ field: control }) => <input id={`trial-${field.name}`} type="checkbox" required={field.required} ref={control.ref} checked={control.value === 'yes'} onChange={event => updateChoice(field.name, event.target.checked ? 'yes' : '')} onBlur={control.onBlur} aria-invalid={Boolean(fieldError)} aria-describedby={describedBy} className="block size-5 cursor-pointer accent-primary" />} />
                  : <Input id={`trial-${field.name}`} required={field.required} type={field.type ?? 'text'} min={field.min} max={field.max} step={field.type === 'number' ? 'any' : undefined} {...inputProps(field.name)} aria-invalid={Boolean(fieldError)} aria-describedby={describedBy} />}
            <FieldError id={`trial-${field.name}-error`}>{fieldError?.message}</FieldError>
          </div>})}
          </fieldset>
        </div>
        <DialogFooter>{fields.some(field => field.required) ? <RequiredLegend className="mr-auto" /> : null}<Button type="button" variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button type="submit" disabled={busy || submitDisabled}>{form.formState.isSubmitting ? 'Saving…' : submitLabel}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
