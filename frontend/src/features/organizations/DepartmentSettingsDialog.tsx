import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { apiErrorMessage, type Department, type DepartmentInput } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'

const optionalEmail = z.string().trim().max(255).refine(
  (value) => !value || z.email().safeParse(value).success, 'Enter a valid email address.',
)
const schema = z.object({
  name: z.string().trim().min(1, 'Enter a department name.').max(150),
  code: z.string().trim().min(1, 'Enter a department code.').max(50),
  description: z.string().trim().max(1000),
  purchaseOrderRequired: z.enum(['inherit', 'required', 'optional']),
  billingContactEmail: optionalEmail,
  notificationEmail: optionalEmail,
  shippingInstructions: z.string().trim().max(2000),
  resultDeliveryInstructions: z.string().trim().max(2000),
})
type Values = z.infer<typeof schema>

export function DepartmentSettingsDialog({ target, pending, error, onClose, onSubmit }: {
  target: Department | 'new'
  pending: boolean
  error: unknown
  onClose: () => void
  onSubmit: (input: DepartmentInput) => void
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const department = target === 'new' ? null : target
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: {
    name: department?.name ?? '', code: department?.code ?? '', description: department?.description ?? '',
    purchaseOrderRequired: department?.purchaseOrderRequired == null ? 'inherit' : department.purchaseOrderRequired ? 'required' : 'optional',
    billingContactEmail: department?.billingContactEmail ?? '', notificationEmail: department?.notificationEmail ?? '',
    shippingInstructions: department?.shippingInstructions ?? '', resultDeliveryInstructions: department?.resultDeliveryInstructions ?? '',
  } })
  // Subscribe even for a new record, where the submit button does not read it.
  const { isDirty } = form.formState
  const close = () => {
    if (pending) return
    if (isDirty) setConfirmDiscard(true)
    else onClose()
  }
  const fields = [
    ['name', 'Name', 150], ['code', 'Code', 50], ['description', 'Description', 1000],
    ['billingContactEmail', 'Billing contact email', 255], ['notificationEmail', 'Notification email', 255],
    ['shippingInstructions', 'Shipping instructions', 2000], ['resultDeliveryInstructions', 'Result delivery instructions', 2000],
  ] as const
  return (
    <Dialog open onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="max-w-2xl" onCloseAutoFocus={(event) => {
        event.preventDefault()
        document.getElementById(department ? `department-actions-${department.id}` : 'add-department')?.focus()
      }}>
        <form noValidate onSubmit={form.handleSubmit((values) => onSubmit({
          ...values,
          description: values.description || null,
          purchaseOrderRequired: values.purchaseOrderRequired === 'inherit' ? null : values.purchaseOrderRequired === 'required',
          billingContactEmail: values.billingContactEmail || null, notificationEmail: values.notificationEmail || null,
          shippingInstructions: values.shippingInstructions || null, resultDeliveryInstructions: values.resultDeliveryInstructions || null,
        }))}>
          <DialogHeader>
            <DialogTitle>{target === 'new' ? 'Add department' : `Edit ${department?.name}`}</DialogTitle>
            <DialogDescription>Set the department's identity and optional instructions. Blank overrides use the applicable organization or system default.</DialogDescription>
          </DialogHeader>
          {error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}
          {confirmDiscard ? (
            <div className="space-y-3" role="alert">
              <p>Discard your unsaved department changes?</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setConfirmDiscard(false)}>Keep editing</Button>
                <Button type="button" variant="destructive" onClick={onClose}>Discard changes</Button>
              </div>
            </div>
          ) : null}
          <fieldset disabled={pending} className="grid gap-4">
            {fields.map(([name, label, maxLength]) => {
              const required = name === 'name' || name === 'code'
              const multiline = name === 'description' || name.endsWith('Instructions')
              const fieldError = form.formState.errors[name]?.message
              const props = {
                id: `department-${name}`, maxLength, required,
                'aria-invalid': Boolean(fieldError),
                'aria-describedby': fieldError ? `department-${name}-error` : undefined,
                ...form.register(name),
              }
              return <div className="grid gap-1.5" key={name}>
                <Label htmlFor={props.id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>
                {multiline ? <Textarea {...props} rows={2} /> : <Input {...props} type={name.endsWith('Email') ? 'email' : 'text'} />}
                {fieldError ? <p id={`department-${name}-error`} role="alert" className="text-xs text-destructive">{fieldError}</p> : null}
              </div>
            })}
            <div className="grid gap-1.5">
              <Label htmlFor="department-po">Purchase order rule</Label>
              <select id="department-po" className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" {...form.register('purchaseOrderRequired')}>
                <option value="inherit">Use default (not required)</option>
                <option value="required">Required</option><option value="optional">Not required</option>
              </select>
            </div>
          </fieldset>
          <RequiredDialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={close}>Cancel</Button>
            <Button type="submit" disabled={pending || (target !== 'new' && !isDirty)}>{pending ? 'Saving…' : target === 'new' ? 'Add department' : 'Save changes'}</Button>
          </RequiredDialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
