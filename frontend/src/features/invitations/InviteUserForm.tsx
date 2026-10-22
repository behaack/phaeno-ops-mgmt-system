import { Field as PortalField } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
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
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { FieldError } from '#/components/ui/field'

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
      businessRoles: [],
    })
  }

  const isBusy = isSubmitting || createInvitationMutation.isPending

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <RequiredLegend />
      <div className="grid gap-4 sm:grid-cols-2">
        <PortalField >
          <Label htmlFor="first-name"><RequiredFieldName>First name</RequiredFieldName></Label>
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
            <FieldError
              id="first-name-error"


            >
              {errors.firstName.message}
            </FieldError>
          ) : null}
        </PortalField>
        <PortalField >
          <Label htmlFor="last-name"><RequiredFieldName>Last name</RequiredFieldName></Label>
          <Input
            id="last-name"
            autoComplete="family-name"
            required
            aria-describedby={errors.lastName ? 'last-name-error' : undefined}
            aria-invalid={errors.lastName ? 'true' : 'false'}
            {...register('lastName')}
          />
          {errors.lastName ? (
            <FieldError
              id="last-name-error"


            >
              {errors.lastName.message}
            </FieldError>
          ) : null}
        </PortalField>
      </div>

      <PortalField >
        <Label htmlFor="email"><RequiredFieldName>Email address</RequiredFieldName></Label>
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
          <FieldError id="email-error"  >
            {errors.email.message}
          </FieldError>
        ) : null}
      </PortalField>

      <PortalField >
        <Label htmlFor="role"><RequiredFieldName>Access role</RequiredFieldName></Label>
        <NativeSelect
          id="role"

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
        </NativeSelect>
        {errors.role ? (
          <FieldError id="role-error"  >
            {errors.role.message}
          </FieldError>
        ) : null}
      </PortalField>

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
          <AlertTitle>Invitation queued</AlertTitle>
          <AlertDescription>
            {submittedInvite.firstName} {submittedInvite.lastName} (
            {submittedInvite.email}) was invited as{' '}
            {submittedInvite.isOrganizationAdmin ? 'Organization Admin' : 'Member'}.
            Email delivery is {submittedInvite.deliveryStatus ?? 'being queued'};
            invitation access remains {submittedInvite.status} until acceptance.
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}
