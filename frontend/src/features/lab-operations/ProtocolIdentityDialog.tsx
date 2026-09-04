import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { LabProtocol } from '#/api/lab-operations'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'

const protocolIdentitySchema = z.object({
  name: z.string().trim().min(1, 'Enter a protocol name.').max(255),
  description: z.string().trim().max(2000),
})

export type ProtocolIdentityFormValues = z.infer<typeof protocolIdentitySchema>

export function ProtocolIdentityDialog({
  error,
  isPending,
  onOpenChange,
  onSubmit,
  protocol,
}: {
  error?: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ProtocolIdentityFormValues) => void
  protocol: LabProtocol | null
}) {
  const form = useForm<ProtocolIdentityFormValues>({
    resolver: zodResolver(protocolIdentitySchema),
    defaultValues: valuesFor(protocol),
    mode: 'onBlur',
  })

  useEffect(() => {
    if (protocol) form.reset(valuesFor(protocol))
  }, [form, protocol])

  return (
    <Dialog open={protocol !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit protocol name and description</DialogTitle>
          <DialogDescription>
            These details can be changed only before the protocol is approved.
            Use Edit protocol from the Actions menu to change its controlled procedure.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form
          id="edit-protocol-identity"
          className="grid gap-4"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Protocol key</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{protocol?.key}</p>
          </div>
          <Field
            id="edit-protocol-name"
            label="Name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              id="edit-protocol-name"
              maxLength={255}
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
          </Field>
          <Field
            id="edit-protocol-description"
            label="Description"
            error={form.formState.errors.description?.message}
          >
            <textarea
              id="edit-protocol-description"
              maxLength={2000}
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register('description')}
            />
          </Field>
        </form>
        <RequiredDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-protocol-identity" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  children,
  error,
  id,
  label,
  required,
}: {
  children: ReactNode
  error?: string
  id: string
  label: string
  required?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {required ? <RequiredFieldName>{label}</RequiredFieldName> : label}
      </Label>
      {children}
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  )
}

function valuesFor(protocol: LabProtocol | null): ProtocolIdentityFormValues {
  return {
    name: protocol?.name ?? '',
    description: protocol?.description ?? '',
  }
}
