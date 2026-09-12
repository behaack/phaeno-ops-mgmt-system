import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { cloneElement, isValidElement, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName, RequiredDialogFooter } from '#/components/ui/required-field'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'

export const prepSelectClass = 'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
export const prepRowClass = 'rounded-lg border bg-muted/30 p-4 shadow-xs'
export function PreparationPanel({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return <Card className="gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>{title}</CardTitle>{description ? <CardDescription>{description}</CardDescription> : null}{actions ? <CardAction>{actions}</CardAction> : null}</CardHeader><CardContent className="space-y-3 p-4">{children}</CardContent></Card>
}
export function PreparationActions({ items }: { items: { label: string; onClick: () => void; disabled?: boolean }[] }) {
  return <ActionMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions <ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max min-w-48 max-w-[calc(100vw-2rem)]">{items.map(item => <DropdownMenuItem key={item.label} disabled={item.disabled} onSelect={item.onClick}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu>
}
export function PreparationField({ label, id, required, children, error }: { label: string; id: string; required?: boolean; children: ReactNode; error?: string }) {
  const control = isValidElement<{ 'aria-required'?: boolean; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>(children) ? cloneElement(children, { 'aria-required': required || undefined, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined }) : children
  return <div className="space-y-1.5"><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>{control}{error ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p> : null}</div>
}
export type PreparationFormField = { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'textarea' | 'checkbox'; defaultValue?: string; options?: { value: string; label: string }[] }
export function PreparationFormDialog({ title, description, fields, onClose, onSubmit, pending, error, children, submitLabel = 'Save' }: {
  title: string; description: string; fields: PreparationFormField[]; onClose: () => void; onSubmit: (values: Record<string, string>) => void; pending: boolean; error?: string; children?: ReactNode; submitLabel?: string
}) {
  const schema = z.record(z.string(), z.string()).superRefine((values, ctx) => fields.forEach(field => {
    if (field.required && !(values[field.key] ?? '').trim()) ctx.addIssue({ code: 'custom', path: [field.key], message: `${field.label} is required.` })
    if (field.type === 'number' && values[field.key] && (!Number.isFinite(Number(values[field.key])) || Number(values[field.key]) <= 0)) ctx.addIssue({ code: 'custom', path: [field.key], message: 'Enter a positive number.' })
    if (field.options && values[field.key] && !field.options.some(o => o.value === values[field.key])) ctx.addIssue({ code: 'custom', path: [field.key], message: 'Choose an available option.' })
  }))
  const form = useForm<Record<string, string>>({ resolver: zodResolver(schema), defaultValues: Object.fromEntries(fields.map(f => [f.key, f.defaultValue ?? ''])) })
  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose() }}><DialogContent><form className="contents" onSubmit={form.handleSubmit(onSubmit)} noValidate>
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    <div className="space-y-4">{children}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {fields.map(field => <PreparationField key={field.key} id={`prep-${field.key}`} label={field.label} required={field.required} error={form.formState.errors[field.key]?.message}>
        {field.options ? <select id={`prep-${field.key}`} className={prepSelectClass} {...form.register(field.key)}><option value="">Choose…</option>{field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          : field.type === 'textarea' ? <textarea id={`prep-${field.key}`} className={`${prepSelectClass} min-h-24 py-2`} {...form.register(field.key)} />
          : <Input id={`prep-${field.key}`} type={field.type ?? 'text'} step={field.type === 'number' ? 'any' : undefined} {...form.register(field.key)} />}
      </PreparationField>)}
    </div>
    <RequiredDialogFooter showLegend={fields.some(field => field.required)}><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button disabled={pending} type="submit">{pending ? 'Saving…' : submitLabel}</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
