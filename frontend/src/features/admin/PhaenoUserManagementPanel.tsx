import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ellipsis,
  Mail,
  Pencil,
  RotateCcw,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  apiErrorMessage,
  createInvitation,
  listInvitations,
  listPhaenoUsers,
  resendInvitation,
  revokeInvitation,
  setUserActive,
  updatePhaenoUser,
  type Invitation,
  type LabRole,
  type PhaenoUser,
} from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const labRoleOptions = [
  { value: 'Operator', label: 'Lab operator' },
  { value: 'Supervisor', label: 'Lab supervisor' },
  { value: 'ProtocolAdministrator', label: 'Protocol administrator' },
  { value: 'ScientificReviewer', label: 'Scientific reviewer' },
  {
    value: 'OperationsAdministrator',
    label: 'Lab operations administrator',
  },
] as const satisfies ReadonlyArray<{ value: LabRole; label: string }>

const platformRoleValue = 'PlatformAdministrator'
type RoleValue = typeof platformRoleValue | LabRole

const editSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Enter a first name.')
    .max(100, 'First name cannot exceed 100 characters.'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Enter a last name.')
    .max(100, 'Last name cannot exceed 100 characters.'),
  roles: z.array(z.string()),
})
type EditValues = z.infer<typeof editSchema>

const inviteSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Enter a first name.')
    .max(100, 'First name cannot exceed 100 characters.'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Enter a last name.')
    .max(100, 'Last name cannot exceed 100 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  roles: z.array(z.string()).min(1, 'Select at least one role.'),
})
type InviteValues = z.infer<typeof inviteSchema>

export function PhaenoUserManagementPanel({
  canManageAccounts,
  canManageLabRoles,
  organizationId,
}: {
  canManageAccounts: boolean
  canManageLabRoles: boolean
  organizationId: string
}) {
  const queryClient = useQueryClient()
  const [editingUser, setEditingUser] = useState<PhaenoUser | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<PhaenoUser | null>(
    null,
  )
  const usersQuery = useQuery({
    queryKey: ['phaeno-users'],
    queryFn: listPhaenoUsers,
  })
  const invitationsQuery = useQuery({
    queryKey: ['organization-invitations', organizationId],
    queryFn: () => listInvitations(organizationId),
    enabled: canManageAccounts,
  })
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['phaeno-users'] }),
      queryClient.invalidateQueries({
        queryKey: ['organization-invitations', organizationId],
      }),
      queryClient.invalidateQueries({ queryKey: ['session'] }),
    ])
  }
  const editMutation = useMutation({
    mutationFn: ({
      user,
      values,
    }: {
      user: PhaenoUser
      values: EditValues
    }) =>
      updatePhaenoUser(user.id, {
        firstName: values.firstName,
        lastName: values.lastName,
        isPlatformAdministrator: values.roles.includes(platformRoleValue),
        userVersion: user.userVersion,
        membershipVersion: user.membershipVersion,
        labRoles: user.labRoles.map((role) => ({
          ...role,
          isActive: values.roles.includes(role.role),
        })),
      }),
    onSuccess: async () => {
      setEditingUser(null)
      await refresh()
    },
  })
  const inviteMutation = useMutation({
    mutationFn: (values: InviteValues) =>
      createInvitation({
        organizationId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        isOrganizationAdmin: values.roles.includes(platformRoleValue),
        labRoles: values.roles.filter(isLabRole),
      }),
    onSuccess: async () => {
      setInviteOpen(false)
      await refresh()
    },
  })
  const lifecycleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setUserActive(id, active),
    onSuccess: async () => {
      setDeactivateTarget(null)
      await refresh()
    },
  })
  const invitationMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string
      action: 'resend' | 'revoke'
    }) => (action === 'resend' ? resendInvitation(id) : revokeInvitation(id)),
    onSuccess: refresh,
  })
  const pageError =
    usersQuery.error ??
    invitationsQuery.error ??
    lifecycleMutation.error ??
    invitationMutation.error
  const pendingInvitations = (invitationsQuery.data ?? []).filter(
    (invitation) => invitation.status === 'Pending',
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Phaeno users</CardTitle>
              <CardDescription>
                Internal Phaeno accounts and their platform and laboratory
                roles.
              </CardDescription>
            </div>
            {canManageAccounts ? (
              <Button type="button" onClick={() => setInviteOpen(true)}>
                <UserPlus data-icon="inline-start" />
                Add Phaeno user
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {pageError ? (
            <Alert variant="destructive">
              <AlertTitle>User management could not be loaded</AlertTitle>
              <AlertDescription>{apiErrorMessage(pageError)}</AlertDescription>
            </Alert>
          ) : null}
          {usersQuery.isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading Phaeno users…
            </p>
          ) : null}
          {(usersQuery.data ?? []).map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="m-0 truncate font-medium">
                  {formatUserName(user)}
                </p>
                <p className="m-0 truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
                <p className="m-0 mt-2 text-sm text-muted-foreground">
                  {formatUserRoles(user)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge
                  variant={user.status === 'Active' ? 'secondary' : 'outline'}
                >
                  {user.status}
                </Badge>
                {(user.status === 'Active' &&
                  (canManageAccounts || canManageLabRoles)) ||
                (canManageAccounts && user.status === 'Disabled') ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Actions for ${formatUserName(user)}`}
                      >
                        <Ellipsis aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {user.status === 'Active' &&
                      (canManageAccounts || canManageLabRoles) ? (
                        <DropdownMenuItem
                          onSelect={() => setEditingUser(user)}
                        >
                          <Pencil aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                      ) : null}
                      {canManageAccounts && user.status === 'Active' ? (
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeactivateTarget(user)}
                        >
                          <Trash2 aria-hidden="true" />
                          Deactivate
                        </DropdownMenuItem>
                      ) : null}
                      {canManageAccounts && user.status === 'Disabled' ? (
                        <DropdownMenuItem
                          disabled={lifecycleMutation.isPending}
                          onSelect={() =>
                            lifecycleMutation.mutate({
                              id: user.id,
                              active: true,
                            })
                          }
                        >
                          <RotateCcw aria-hidden="true" />
                          Reactivate
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>
          ))}
          {canManageAccounts
            ? pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate font-medium">
                      {invitation.firstName} {invitation.lastName}
                    </p>
                    <p className="m-0 truncate text-xs text-muted-foreground">
                      {invitation.email}
                    </p>
                    <p className="m-0 mt-2 text-sm text-muted-foreground">
                      {formatInvitationRoles(invitation)}
                      {invitation.isExpired ? ' · Invitation expired' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge variant="outline">Pending invitation</Badge>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Actions for ${invitation.email}`}
                        >
                          <Ellipsis aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={invitationMutation.isPending}
                          onSelect={() =>
                            invitationMutation.mutate({
                              id: invitation.id,
                              action: 'resend',
                            })
                          }
                        >
                          <Mail aria-hidden="true" />
                          Resend invitation
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={invitationMutation.isPending}
                          onSelect={() =>
                            invitationMutation.mutate({
                              id: invitation.id,
                              action: 'revoke',
                            })
                          }
                        >
                          <Trash2 aria-hidden="true" />
                          Revoke invitation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            : null}
          {!usersQuery.isLoading &&
          !invitationsQuery.isLoading &&
          !(usersQuery.data ?? []).length &&
          pendingInvitations.length === 0 ? (
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              No Phaeno users found.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <PhaenoUserEditDialog
        canManageAccounts={canManageAccounts}
        error={
          editMutation.error ? apiErrorMessage(editMutation.error) : undefined
        }
        isPending={editMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null)
        }}
        onSubmit={(values) => {
          if (editingUser) editMutation.mutate({ user: editingUser, values })
        }}
        user={editingUser}
      />
      <PhaenoUserInviteDialog
        error={
          inviteMutation.error
            ? apiErrorMessage(inviteMutation.error)
            : undefined
        }
        isPending={inviteMutation.isPending}
        onOpenChange={setInviteOpen}
        onSubmit={(values) => inviteMutation.mutate(values)}
        open={inviteOpen}
      />
      <Dialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Phaeno user?</DialogTitle>
            <DialogDescription>
              {deactivateTarget
                ? `${formatUserName(deactivateTarget)} will immediately lose Portal access. Their memberships and role history will be retained.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {lifecycleMutation.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {apiErrorMessage(lifecycleMutation.error)}
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeactivateTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={lifecycleMutation.isPending}
              onClick={() => {
                if (deactivateTarget) {
                  lifecycleMutation.mutate({
                    id: deactivateTarget.id,
                    active: false,
                  })
                }
              }}
            >
              {lifecycleMutation.isPending ? 'Deactivating…' : 'Deactivate user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PhaenoUserEditDialog({
  canManageAccounts,
  error,
  isPending,
  onOpenChange,
  onSubmit,
  user,
}: {
  canManageAccounts: boolean
  error?: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: EditValues) => void
  user: PhaenoUser | null
}) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { firstName: '', lastName: '', roles: [] },
    mode: 'onBlur',
  })
  useEffect(() => {
    form.reset(
      user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            roles: roleValuesFor(user),
          }
        : { firstName: '', lastName: '', roles: [] },
    )
  }, [form, user])
  const selectedRoles = form.watch('roles')

  function toggleRole(role: RoleValue, checked: boolean) {
    form.setValue(
      'roles',
      checked
        ? Array.from(new Set([...selectedRoles, role]))
        : selectedRoles.filter((value) => value !== role),
      { shouldDirty: true, shouldValidate: true },
    )
  }

  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update the Phaeno user and all enforced roles in one place.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>User was not updated</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form
          id="edit-phaeno-user"
          className="grid gap-4"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              error={form.formState.errors.firstName?.message}
              id="phaeno-user-first-name"
              label="First name"
            >
              <Input
                id="phaeno-user-first-name"
                disabled={!canManageAccounts}
                required
                aria-invalid={Boolean(form.formState.errors.firstName)}
                {...form.register('firstName')}
              />
            </FormField>
            <FormField
              error={form.formState.errors.lastName?.message}
              id="phaeno-user-last-name"
              label="Last name"
            >
              <Input
                id="phaeno-user-last-name"
                disabled={!canManageAccounts}
                required
                aria-invalid={Boolean(form.formState.errors.lastName)}
                {...form.register('lastName')}
              />
            </FormField>
          </div>
          <FormField id="phaeno-user-email" label="Email">
            <Input id="phaeno-user-email" value={user?.email ?? ''} disabled />
          </FormField>
          <fieldset className="grid gap-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Roles</legend>
            <RoleCheckbox
              checked={selectedRoles.includes(platformRoleValue)}
              disabled={!canManageAccounts}
              id="role-platform-administrator"
              label="Platform administrator"
              onCheckedChange={(checked) =>
                toggleRole(platformRoleValue, checked)
              }
            />
            {labRoleOptions.map((role) => (
              <RoleCheckbox
                key={role.value}
                checked={selectedRoles.includes(role.value)}
                id={`role-${role.value}`}
                label={role.label}
                onCheckedChange={(checked) => toggleRole(role.value, checked)}
              />
            ))}
            <p className="text-xs text-muted-foreground">
              Platform administrators retain bootstrap access to every
              laboratory capability even without explicit laboratory roles.
            </p>
          </fieldset>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-phaeno-user"
            disabled={isPending || !form.formState.isDirty}
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PhaenoUserInviteDialog({
  error,
  isPending,
  onOpenChange,
  onSubmit,
  open,
}: {
  error?: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: InviteValues) => void
  open: boolean
}) {
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { firstName: '', lastName: '', email: '', roles: [] },
    mode: 'onBlur',
  })
  const selectedRoles = form.watch('roles')

  function toggleRole(role: RoleValue, checked: boolean) {
    form.setValue(
      'roles',
      checked
        ? Array.from(new Set([...selectedRoles, role]))
        : selectedRoles.filter((value) => value !== role),
      { shouldDirty: true, shouldValidate: true },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value)
        if (!value) form.reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Phaeno user</DialogTitle>
          <DialogDescription>
            Record the person and the roles they will receive when they accept
            the invitation.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Invitation was not sent</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form
          id="invite-phaeno-user"
          className="grid gap-4"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              error={form.formState.errors.firstName?.message}
              id="invite-phaeno-first-name"
              label="First name"
            >
              <Input
                id="invite-phaeno-first-name"
                autoComplete="given-name"
                required
                aria-invalid={Boolean(form.formState.errors.firstName)}
                {...form.register('firstName')}
              />
            </FormField>
            <FormField
              error={form.formState.errors.lastName?.message}
              id="invite-phaeno-last-name"
              label="Last name"
            >
              <Input
                id="invite-phaeno-last-name"
                autoComplete="family-name"
                required
                aria-invalid={Boolean(form.formState.errors.lastName)}
                {...form.register('lastName')}
              />
            </FormField>
          </div>
          <FormField
            error={form.formState.errors.email?.message}
            id="invite-phaeno-email"
            label="Email"
          >
            <Input
              id="invite-phaeno-email"
              type="email"
              required
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register('email')}
            />
          </FormField>
          <fieldset
            className="grid gap-3 rounded-lg border p-3"
            aria-describedby={
              form.formState.errors.roles ? 'invite-roles-error' : undefined
            }
          >
            <legend className="px-1 text-sm font-medium">Roles</legend>
            <RoleCheckbox
              checked={selectedRoles.includes(platformRoleValue)}
              id="invite-platform-administrator"
              label="Platform administrator"
              onCheckedChange={(checked) =>
                toggleRole(platformRoleValue, checked)
              }
            />
            {labRoleOptions.map((role) => (
              <RoleCheckbox
                key={role.value}
                checked={selectedRoles.includes(role.value)}
                id={`invite-role-${role.value}`}
                label={role.label}
                onCheckedChange={(checked) => toggleRole(role.value, checked)}
              />
            ))}
            <p className="text-xs text-muted-foreground">
              These roles become active only after the invitation is accepted.
            </p>
            {form.formState.errors.roles ? (
              <p
                id="invite-roles-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {form.formState.errors.roles.message}
              </p>
            ) : null}
          </fieldset>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="invite-phaeno-user"
            disabled={isPending}
          >
            {isPending ? 'Sending…' : 'Send invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RoleCheckbox({
  checked,
  disabled,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean
  disabled?: boolean
  id: string
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Label htmlFor={id} className={disabled ? 'text-muted-foreground' : ''}>
        {label}
      </Label>
    </div>
  )
}

function FormField({
  children,
  error,
  id,
  label,
}: {
  children: React.ReactNode
  error?: string
  id: string
  label: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}{' '}
        {label !== 'Email' || id === 'invite-phaeno-email' ? (
          <span
            className="text-[var(--ruby-red,#b4233c)]"
            aria-hidden="true"
          >
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function formatUserName(user: PhaenoUser) {
  return `${user.firstName} ${user.lastName}`.trim()
}

function roleValuesFor(user: PhaenoUser): RoleValue[] {
  const roles: RoleValue[] = []
  if (user.isPlatformAdministrator) {
    roles.push(platformRoleValue)
  }
  roles.push(
    ...user.labRoles
      .filter((role) => role.isActive)
      .map((role) => role.role),
  )
  return roles
}

function formatUserRoles(user: PhaenoUser) {
  const roles = [
    ...(user.isPlatformAdministrator ? ['Platform administrator'] : []),
    ...user.labRoles
      .filter((role) => role.isActive)
      .map(
        (role) =>
          labRoleOptions.find((option) => option.value === role.role)?.label ??
          role.role,
      ),
  ]
  return roles.length > 0 ? roles.join(', ') : 'No assigned roles'
}

function isLabRole(value: string): value is LabRole {
  return labRoleOptions.some((option) => option.value === value)
}

function formatInvitationRoles(invitation: Invitation) {
  const roles = [
    ...(invitation.isOrganizationAdmin ? ['Platform administrator'] : []),
    ...invitation.labRoles.map(
      (role) =>
        labRoleOptions.find((option) => option.value === role)?.label ?? role,
    ),
  ]
  return roles.length > 0 ? roles.join(', ') : 'No assigned roles'
}
