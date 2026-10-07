import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Children, cloneElement, isValidElement, useRef, type ReactNode } from 'react'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Field, FieldError } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { operationalInputProps } from './lab-presentation'
import { RequiredFieldName, RequiredDialogFooter } from '#/components/ui/required-field'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'

export const prepSelectClass = 'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
export const prepRowClass = 'rounded-lg border bg-muted/30 p-4 shadow-xs'
export function PreparationPanel({ title, description, actions, headerContent, children }: { title: string; description?: string; actions?: ReactNode; headerContent?: ReactNode; children: ReactNode }) {
  return <Card className="gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>{title}</CardTitle>{description ? <CardDescription>{description}</CardDescription> : null}{actions ? <CardAction>{actions}</CardAction> : null}{headerContent ? <div className="col-span-full space-y-2">{headerContent}</div> : null}</CardHeader><CardContent className="space-y-3 p-4">{children}</CardContent></Card>
}
export function PreparationActions({ items, triggerId }: { items: { label: string; icon?: ReactNode; onClick: () => void; disabled?: boolean }[]; triggerId?: string }) {
  if (!items.length) return null
  return <ActionMenu><DropdownMenuTrigger asChild><Button id={triggerId} type="button" variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max min-w-48 max-w-[calc(100vw-2rem)]">{items.map(item => <DropdownMenuItem key={item.label} disabled={item.disabled} onSelect={item.onClick}>{item.icon}{item.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu>
}
export function PreparationField({ label, id, required, children, error, hideLabel = false }: { label: string; id: string; required?: boolean; children: ReactNode; error?: string; hideLabel?: boolean }) {
  const control = Children.map(children, child => isValidElement<{ id?: string; 'aria-required'?: boolean; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>(child) && child.props.id === id ? cloneElement(child, { 'aria-required': required || undefined, 'aria-invalid': Boolean(error), 'aria-describedby': [child.props['aria-describedby'], error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined }) : child)
  return <Field><Label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>{control}<FieldError id={`${id}-error`}>{error}</FieldError></Field>
}
export type PreparationFormField = { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'textarea' | 'checkbox'; defaultValue?: string; maxLength?: number; options?: { value: string; label: string }[] }
export function PreparationFormDialog({ title, description, fields, onClose, onSubmit, pending, error, children, submitLabel = 'Save', initialFocus, suspended = false }: {
  title: string; description: string; fields: PreparationFormField[]; onClose: () => void; onSubmit: (values: Record<string, string>) => void; pending: boolean; error?: string; children?: ReactNode; submitLabel?: string; initialFocus?: 'cancel'; suspended?: boolean
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const schema = z.record(z.string(), z.string()).superRefine((values, ctx) => fields.forEach(field => {
    if (field.required && (field.type === 'checkbox' ? values[field.key] !== 'yes' : !(values[field.key] ?? '').trim())) ctx.addIssue({ code: 'custom', path: [field.key], message: field.type === 'checkbox' ? 'Check this box to confirm.' : `${field.label} is required.` })
    if (field.maxLength && (values[field.key] ?? '').trim().length > field.maxLength) ctx.addIssue({ code: 'custom', path: [field.key], message: `${field.label} must be ${field.maxLength} characters or fewer.` })
    if (field.type === 'number' && values[field.key] && (!Number.isFinite(Number(values[field.key])) || Number(values[field.key]) <= 0)) ctx.addIssue({ code: 'custom', path: [field.key], message: 'Enter a positive number.' })
    if (field.options && values[field.key] && !field.options.some(o => o.value === values[field.key])) ctx.addIssue({ code: 'custom', path: [field.key], message: 'Choose an available option.' })
  }))
  const form = useForm<Record<string, string>>({ resolver: zodResolver(schema), defaultValues: Object.fromEntries(fields.map(f => [f.key, f.defaultValue ?? ''])) })
  return <Dialog open={!suspended} onOpenChange={open => { if (!open && !pending) onClose() }}><DialogContent onOpenAutoFocus={event => { if (initialFocus === 'cancel') { event.preventDefault(); cancelRef.current?.focus() } }}><form className="contents" onSubmit={form.handleSubmit(onSubmit)} noValidate>
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    <div className="space-y-4">{children}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {fields.map(field => field.type === 'checkbox' ? <div key={field.key} className="space-y-1.5">
        <label htmlFor={`prep-${field.key}`} className="flex cursor-pointer items-start gap-2 text-sm leading-snug">
          <Controller name={field.key} control={form.control} render={({ field: control }) => <input id={`prep-${field.key}`} type="checkbox" name={control.name} ref={control.ref} checked={control.value === 'yes'} onChange={event => control.onChange(event.target.checked ? 'yes' : '')} onBlur={control.onBlur} disabled={pending}
            aria-required={field.required || undefined} aria-invalid={Boolean(form.formState.errors[field.key])} aria-describedby={form.formState.errors[field.key] ? `prep-${field.key}-error` : undefined}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />} />
          {field.required ? <RequiredFieldName>{field.label}</RequiredFieldName> : <span>{field.label}</span>}
        </label>
        {form.formState.errors[field.key] ? <p id={`prep-${field.key}-error`} role="alert" className="text-sm text-destructive">{form.formState.errors[field.key]?.message}</p> : null}
      </div> : <PreparationField key={field.key} id={`prep-${field.key}`} label={field.label} required={field.required} error={form.formState.errors[field.key]?.message}>
        {field.options ? <NativeSelect id={`prep-${field.key}`} {...form.register(field.key)}><option value="">Choose…</option>{field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</NativeSelect>
          : field.type === 'textarea' ? <textarea id={`prep-${field.key}`} className={`${prepSelectClass} min-h-24 py-2`} maxLength={field.maxLength} {...form.register(field.key)} />
          : <Input id={`prep-${field.key}`} {...operationalInputProps} type={field.type ?? 'text'} step={field.type === 'number' ? 'any' : undefined} maxLength={field.maxLength} {...form.register(field.key)} />}
      </PreparationField>)}
    </div>
    <RequiredDialogFooter showLegend={fields.some(field => field.required)}><Button ref={cancelRef} type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button disabled={pending} type="submit">{pending ? 'Saving…' : submitLabel}</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}

export function preparationResourceFields(kind: 'material' | 'equipment', options: { value: string; label: string }[]): PreparationFormField[] {
  return [
    { key: 'resource', label: kind === 'material' ? 'Material lot' : 'Equipment', required: true, options },
    ...(kind === 'material' ? [{ key: 'quantity', label: 'Total quantity used for these tubes', type: 'number' as const, required: true }] : [{ key: 'reason', label: 'Run reference (optional)' }]),
    { key: 'confirm', label: 'Confirm resource coverage', required: true, options: [{ value: 'yes', label: 'Confirmed' }] },
  ]
}
