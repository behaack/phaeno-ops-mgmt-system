import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, type ReactNode, type RefObject } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { type CustomerRecord } from './mock-admin-data'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter a customer name.'),
  status: z.enum(['Active', 'Review', 'Inactive']),
  users: z
    .number({ error: 'Enter the number of users.' })
    .int('Users must be a whole number.')
    .min(0, 'Users cannot be negative.'),
  partner: z.string().trim(),
  contact: z.string().trim(),
  securityContact: z.string().trim(),
  nextStep: z.string().trim(),
  lastReview: z.string().trim(),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

export function CustomerFormDialog({
  customer,
  onOpenChange,
  onSubmit,
  open,
  returnFocusRef,
}: {
  customer: CustomerRecord | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CustomerFormValues) => void
  open: boolean
  returnFocusRef?: RefObject<HTMLButtonElement | null>
}) {
  const form = useForm<CustomerFormValues>({
    defaultValues: customerToFormValues(customer),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver: zodResolver(customerFormSchema),
  })
  const isEditing = customer !== null
  const formId = isEditing
    ? `edit-customer-${customer.id}`
    : 'create-customer'

  useEffect(() => {
    if (open) {
      form.reset(customerToFormValues(customer))
    }
  }, [customer, form, open])

  function changeOpen(nextOpen: boolean) {
    if (
      !nextOpen &&
      form.formState.isDirty &&
      !window.confirm('Discard your unsaved customer changes?')
    ) {
      return
    }

    if (!nextOpen) {
      form.reset(customerToFormValues(customer))
    }
    onOpenChange(nextOpen)
  }

  function submit(values: CustomerFormValues) {
    const normalizedValues = normalizeCustomerValues(values)
    onSubmit(normalizedValues)
    form.reset(normalizedValues)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          if (returnFocusRef?.current) {
            event.preventDefault()
            returnFocusRef.current.focus()
          }
        }}
      >
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>
            {isEditing ? `Edit ${customer.name}` : 'New customer'}
          </DialogTitle>
          <DialogDescription>
            Changes are stored in mock state for this session.
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          className="max-h-[min(62dvh,38rem)] space-y-5 overflow-y-auto px-6 py-5"
          noValidate
          onSubmit={form.handleSubmit(submit)}
        >
          <p className="text-sm text-muted-foreground">
            <Required /> Required field
          </p>
          <Field
            error={form.formState.errors.name?.message}
            id={`${formId}-name`}
            label="Name"
            required
          >
            <Input
              id={`${formId}-name`}
              aria-describedby={
                form.formState.errors.name ? `${formId}-name-error` : undefined
              }
              aria-invalid={Boolean(form.formState.errors.name)}
              required
              {...form.register('name')}
            />
          </Field>
          <Field id={`${formId}-status`} label="Status">
            <select
              id={`${formId}-status`}
              className="h-8 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...form.register('status')}
            >
              <option value="Active">Active</option>
              <option value="Review">Review</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Field>
          <Field
            error={form.formState.errors.users?.message}
            id={`${formId}-users`}
            label="Users"
          >
            <Input
              id={`${formId}-users`}
              aria-describedby={
                form.formState.errors.users
                  ? `${formId}-users-error`
                  : undefined
              }
              aria-invalid={Boolean(form.formState.errors.users)}
              min={0}
              type="number"
              {...form.register('users', { valueAsNumber: true })}
            />
          </Field>
          <Field id={`${formId}-partner`} label="Partner">
            <Input id={`${formId}-partner`} {...form.register('partner')} />
          </Field>
          <Field id={`${formId}-contact`} label="Primary contact">
            <Input id={`${formId}-contact`} {...form.register('contact')} />
          </Field>
          <Field id={`${formId}-security-contact`} label="Security contact">
            <Input
              id={`${formId}-security-contact`}
              {...form.register('securityContact')}
            />
          </Field>
          <Field id={`${formId}-next-step`} label="Next step">
            <Input id={`${formId}-next-step`} {...form.register('nextStep')} />
          </Field>
          <Field id={`${formId}-last-review`} label="Last review">
            <Input
              id={`${formId}-last-review`}
              {...form.register('lastReview')}
            />
          </Field>
        </form>

        <DialogFooter className="border-t bg-muted/20 px-6 py-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={isEditing && !form.formState.isDirty}
          >
            {isEditing ? 'Save changes' : 'Create customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  children,
  error,
  id,
  label,
  required = false,
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
        {label}
        {required ? <Required /> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function Required() {
  return (
    <span
      className="ml-1 text-[var(--ruby-red,#b4233c)]"
      aria-hidden="true"
    >
      *
    </span>
  )
}

function customerToFormValues(
  customer: CustomerRecord | null,
): CustomerFormValues {
  return customer
    ? {
        name: customer.name,
        status: customer.status,
        users: customer.users,
        partner: customer.partner,
        contact: customer.contact,
        securityContact: customer.securityContact,
        nextStep: customer.nextStep,
        lastReview: customer.lastReview,
      }
    : {
        name: '',
        status: 'Active',
        users: 0,
        partner: '',
        contact: '',
        securityContact: '',
        nextStep: '',
        lastReview: 'Not reviewed',
      }
}

function normalizeCustomerValues(
  values: CustomerFormValues,
): CustomerFormValues {
  return {
    ...values,
    partner: values.partner || 'Unassigned',
    contact: values.contact || 'Not assigned',
    securityContact: values.securityContact || 'Not assigned',
    nextStep: values.nextStep || 'No open next step',
    lastReview: values.lastReview || 'Not reviewed',
  }
}
