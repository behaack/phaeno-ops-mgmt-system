import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  inviteDefaults,
  inviteSchema,
  type InviteFormValues,
} from './invite-schema'
import { createInvitation, type Invitation } from '#/api/invitations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const roles = ['Member', 'Organization Admin'] as const

export function InviteUserForm({ organizationId }: { organizationId: string }) {
  const [submittedInvite, setSubmittedInvite] = useState<Invitation>()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: inviteDefaults,
  })

  const createInvitationMutation = useMutation({
    mutationFn: createInvitation,
    onSuccess: (invitation) => {
      setSubmittedInvite(invitation)
      reset(inviteDefaults)
    },
  })

  async function onSubmit(values: InviteFormValues) {
    await createInvitationMutation.mutateAsync({
      organizationId,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      isOrganizationAdmin: values.role === 'Organization Admin',
      labRoles: [],
    })
  }

  const isBusy = isSubmitting || createInvitationMutation.isPending

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="first-name">First name *</Label>
          <Input
            id="first-name"
            autoComplete="given-name"
            required
            aria-describedby={
              errors.firstName ? 'first-name-error' : undefined
            }
            aria-invalid={errors.firstName ? 'true' : 'false'}
            {...register('firstName')}
          />
          {errors.firstName ? (
            <p
              id="first-name-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.firstName.message}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="last-name">Last name *</Label>
          <Input
            id="last-name"
            autoComplete="family-name"
            required
            aria-describedby={errors.lastName ? 'last-name-error' : undefined}
            aria-invalid={errors.lastName ? 'true' : 'false'}
            {...register('lastName')}
          />
          {errors.lastName ? (
            <p
              id="last-name-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.lastName.message}
            </p>
          ) : null}
        </div>
      </div>

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

      <Button type="submit" disabled={isBusy} className="w-full">
        <Send data-icon="inline-start" />
        {isBusy ? 'Sending invite' : 'Send invite'}
      </Button>

      {createInvitationMutation.isError ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Invite failed</AlertTitle>
          <AlertDescription>
            The invitation could not be sent. Check the email and try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {submittedInvite ? (
        <Alert role="status" aria-live="polite">
          <AlertTitle>Invite sent</AlertTitle>
          <AlertDescription>
            {submittedInvite.firstName} {submittedInvite.lastName} (
            {submittedInvite.email}) was invited as{' '}
            {submittedInvite.isOrganizationAdmin ? 'Organization Admin' : 'Member'}.
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}
