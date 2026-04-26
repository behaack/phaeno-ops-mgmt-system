import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  inviteDefaults,
  inviteSchema,
  type InviteFormValues,
} from './invite-schema'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const roles = ['Member', 'Organization Admin', 'Partner Liaison'] as const

export function InviteUserForm() {
  const [submittedInvite, setSubmittedInvite] = useState<InviteFormValues>()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: inviteDefaults,
  })

  const requiresTwoFactor = watch('requiresTwoFactor')

  function onSubmit(values: InviteFormValues) {
    setSubmittedInvite(values)
    reset({ ...inviteDefaults, organization: values.organization })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="email">Email address *</Label>
        <Input
          id="email"
          autoComplete="email"
          placeholder="name@organization.com"
          required
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={errors.email ? 'true' : 'false'}
          {...register('email')}
        />
        {errors.email ? (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="organization">Organization *</Label>
        <Input
          id="organization"
          placeholder="Acme Health"
          required
          aria-describedby={
            errors.organization ? 'organization-error' : undefined
          }
          aria-invalid={errors.organization ? 'true' : 'false'}
          {...register('organization')}
        />
        {errors.organization ? (
          <p
            id="organization-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.organization.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="role">Access role *</Label>
        <select
          id="role"
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          required
          aria-describedby={errors.role ? 'role-error' : undefined}
          aria-invalid={errors.role ? 'true' : 'false'}
          {...register('role')}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        {errors.role ? (
          <p id="role-error" className="text-sm text-destructive" role="alert">
            {errors.role.message}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <Checkbox
          id="requiresTwoFactor"
          checked={requiresTwoFactor}
          aria-describedby="requiresTwoFactor-description"
          onCheckedChange={(checked) =>
            setValue('requiresTwoFactor', checked === true, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <Label htmlFor="requiresTwoFactor" className="leading-5">
          <span>Require two-factor setup before first portal access</span>
          <span id="requiresTwoFactor-description" className="sr-only">
            This requirement applies before the invited user can access the
            portal.
          </span>
        </Label>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        <Send data-icon="inline-start" />
        Send invite
      </Button>

      {submittedInvite ? (
        <Alert role="status" aria-live="polite">
          <AlertTitle>Invite staged</AlertTitle>
          <AlertDescription>
            {submittedInvite.email} will be invited to{' '}
            {submittedInvite.organization} as {submittedInvite.role}.
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}
