import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type {
  Organization,
  PortalReadinessStatus,
} from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter an organization name.').max(255),
  description: z.string().trim().max(1000),
  kind: z.enum(['Prospect', 'Customer', 'Partner']),
  portalReadiness: z.enum(['NotReviewed', 'Pending', 'Ready', 'Blocked']),
  portalReadinessNote: z.string().trim().max(2000),
})

export type OrganizationFormValues = z.infer<typeof schema>

export function OrganizationFormDialog({
  error,
  isPending,
  onOpenChange,
  onSubmit,
  open,
  organization,
}: {
  error?: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: OrganizationFormValues) => void
  open: boolean
  organization: Organization | null
}) {
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesFor(organization),
    mode: 'onBlur',
  })

  useEffect(() => {
    if (open) form.reset(valuesFor(organization))
  }, [form, open, organization])

  const editing = Boolean(organization)
  const formId = editing ? 'edit-organization' : 'create-organization'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit organization' : 'New organization'}</DialogTitle>
          <DialogDescription>
            Relationship type and Portal readiness are separate. Readiness never grants access or services.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
        ) : null}
        <form id={formId} className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <Field id={`${formId}-name`} label="Name" required error={form.formState.errors.name?.message}>
            <Input id={`${formId}-name`} aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} />
          </Field>
          <Field id={`${formId}-description`} label="Description" error={form.formState.errors.description?.message}>
            <textarea id={`${formId}-description`} className={textareaClass} rows={3} {...form.register('description')} />
          </Field>
          <Field id={`${formId}-kind`} label="Relationship type" required>
            <select id={`${formId}-kind`} className={selectClass} disabled={editing} {...form.register('kind')}>
              <option value="Prospect">Prospect</option>
              <option value="Customer">Customer</option>
              <option value="Partner">Partner</option>
            </select>
            {editing ? <p className="text-xs text-muted-foreground">Prospect conversion is handled as a separate reviewed action.</p> : null}
          </Field>
          <Field id={`${formId}-readiness`} label="Portal readiness" required>
            <select id={`${formId}-readiness`} className={selectClass} {...form.register('portalReadiness')}>
              {(['NotReviewed', 'Pending', 'Ready', 'Blocked'] satisfies PortalReadinessStatus[]).map((value) => (
                <option key={value} value={value}>{readinessLabel(value)}</option>
              ))}
            </select>
          </Field>
          <Field id={`${formId}-readiness-note`} label="Readiness note" error={form.formState.errors.portalReadinessNote?.message}>
            <textarea id={`${formId}-readiness-note`} className={textareaClass} rows={3} {...form.register('portalReadinessNote')} />
          </Field>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form={formId} disabled={isPending}>{isPending ? 'Saving…' : editing ? 'Save changes' : 'Create organization'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ children, error, id, label, required }: { children: ReactNode; error?: string; id: string; label: string; required?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}{required ? <span className="ml-1 text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> : null}</Label>
      {children}
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  )
}

function valuesFor(organization: Organization | null): OrganizationFormValues {
  return {
    name: organization?.name ?? '',
    description: organization?.description ?? '',
    kind: organization?.kind === 'Phaeno' ? 'Prospect' : (organization?.kind ?? 'Prospect'),
    portalReadiness: organization?.portalReadiness ?? 'NotReviewed',
    portalReadinessNote: organization?.portalReadinessNote ?? '',
  }
}

export function readinessLabel(value: PortalReadinessStatus) {
  return value === 'NotReviewed' ? 'Not reviewed' : value
}

export const selectClass = 'h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
export const textareaClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
