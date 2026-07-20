import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, Mail, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  apiErrorMessage,
  createInvitation,
  deactivateMembership,
  listInvitations,
  listOrganizationUsers,
  resendInvitation,
  revokeInvitation,
  updateMembershipRole,
  type OrganizationMembership,
  type OrganizationUser,
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

const roleSchema = z.object({
  role: z.enum(['Member', 'Administrator']),
})
type RoleValues = z.infer<typeof roleSchema>

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
  role: z.enum(['Member', 'Administrator']),
})
type InviteValues = z.infer<typeof inviteSchema>

type EditTarget = {
  user: OrganizationUser
  membership: OrganizationMembership
}

export function OrganizationUserManagementPanel({
  organizationId,
  organizationName,
}: {
  organizationId: string
  organizationName: string
}) {
  const queryClient = useQueryClient()
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] =
    useState<EditTarget | null>(null)
  const usersQuery = useQuery({
    queryKey: ['organization-users', organizationId],
    queryFn: () => listOrganizationUsers(organizationId),
  })
  const invitationsQuery = useQuery({
    queryKey: ['organization-invitations', organizationId],
    queryFn: () => listInvitations(organizationId),
  })
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['organization-users', organizationId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['organization-invitations', organizationId],
      }),
      queryClient.invalidateQueries({ queryKey: ['session'] }),
    ])
  }
  const roleMutation = useMutation({
    mutationFn: ({
      membershipId,
      role,
    }: {
      membershipId: string
      role: RoleValues['role']
    }) => updateMembershipRole(membershipId, role === 'Administrator'),
    onSuccess: async () => {
      setEditTarget(null)
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
        isOrganizationAdmin: values.role === 'Administrator',
        labRoles: [],
      }),
    onSuccess: async () => {
      setInviteOpen(false)
      await refresh()
    },
  })
  const deactivateMutation = useMutation({
    mutationFn: deactivateMembership,
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
  const error =
    usersQuery.error ??
    invitationsQuery.error ??
    deactivateMutation.error ??
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
              <CardTitle>{organizationName} users</CardTitle>
              <CardDescription>
                Active members and pending invitations for this organization.
              </CardDescription>
            </div>
            <Button type="button" onClick={() => setInviteOpen(true)}>
              <UserPlus data-icon="inline-start" />
              Add user
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>User management could not be loaded</AlertTitle>
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          {usersQuery.isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading users…
            </p>
          ) : null}
          {(usersQuery.data ?? []).map((user) => {
            const membership = user.memberships.find(
              (value) => value.organizationId === organizationId,
            )
            if (!membership) return null
            const target = { user, membership }

            return (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="m-0 truncate font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="m-0 truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                  <p className="m-0 mt-2 text-sm text-muted-foreground">
                    {membership.isOrganizationAdmin
                      ? 'Organization administrator'
                      : 'Member'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      membership.isActive && user.status === 'Active'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {membership.isActive ? user.status : 'Membership inactive'}
                  </Badge>
                  {membership.isActive ? (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Actions for ${user.firstName} ${user.lastName}`}
                        >
                          <Ellipsis aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => setEditTarget(target)}
                        >
                          <Pencil aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeactivateTarget(target)}
                        >
                          <Trash2 aria-hidden="true" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            )
          })}
          {pendingInvitations.map((invitation) => (
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
                  {invitation.isOrganizationAdmin
                    ? 'Organization administrator'
                    : 'Member'}
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
          ))}
          {!usersQuery.isLoading &&
          !invitationsQuery.isLoading &&
          !(usersQuery.data ?? []).length &&
          pendingInvitations.length === 0 ? (
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              No organization users found.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <MembershipRoleDialog
        error={
          roleMutation.error ? apiErrorMessage(roleMutation.error) : undefined
        }
        isPending={roleMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
        onSubmit={(values) => {
          if (editTarget) {
            roleMutation.mutate({
              membershipId: editTarget.membership.id,
              role: values.role,
            })
          }
        }}
        target={editTarget}
      />
      <OrganizationInviteDialog
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
            <DialogTitle>Deactivate organization membership?</DialogTitle>
            <DialogDescription>
              {deactivateTarget
                ? `${deactivateTarget.user.email} will lose access to ${organizationName}. A new invitation is required to restore this membership.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {deactivateMutation.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {apiErrorMessage(deactivateMutation.error)}
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
              disabled={deactivateMutation.isPending}
              onClick={() => {
                if (deactivateTarget) {
                  deactivateMutation.mutate(
                    deactivateTarget.membership.id,
                  )
                }
              }}
            >
              {deactivateMutation.isPending
                ? 'Deactivating…'
                : 'Deactivate membership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MembershipRoleDialog({
  error,
  isPending,
  onOpenChange,
  onSubmit,
  target,
}: {
  error?: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: RoleValues) => void
  target: EditTarget | null
}) {
  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { role: 'Member' },
  })
  useEffect(() => {
    form.reset({
      role: target?.membership.isOrganizationAdmin
        ? 'Administrator'
        : 'Member',
    })
  }, [form, target])

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update this user’s role in {target?.membership.organizationName}.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>User was not updated</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form
          id="edit-organization-user"
          className="grid gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="organization-user-name">Name</Label>
            <Input
              id="organization-user-name"
              value={
                target
                  ? `${target.user.firstName} ${target.user.lastName}`.trim()
                  : ''
              }
              disabled
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="organization-user-email">Email</Label>
            <Input
              id="organization-user-email"
              value={target?.user.email ?? ''}
              disabled
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="organization-user-role">Role</Label>
            <select
              id="organization-user-role"
              className="h-9 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm"
              {...form.register('role')}
            >
              <option value="Member">Member</option>
              <option value="Administrator">
                Organization administrator
              </option>
            </select>
          </div>
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
            form="edit-organization-user"
            disabled={isPending || !form.formState.isDirty}
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OrganizationInviteDialog({
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
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'Member',
    },
    mode: 'onBlur',
  })

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
          <DialogTitle>Add organization user</DialogTitle>
          <DialogDescription>
            Portal access begins only after the recipient accepts the
            invitation.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Invitation was not sent</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form
          id="invite-organization-user"
          className="grid gap-4"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="organization-invite-first-name">
                First name{' '}
                <span
                  className="text-[var(--ruby-red,#b4233c)]"
                  aria-hidden="true"
                >
                  *
                </span>
              </Label>
              <Input
                id="organization-invite-first-name"
                autoComplete="given-name"
                required
                aria-invalid={Boolean(form.formState.errors.firstName)}
                {...form.register('firstName')}
              />
              {form.formState.errors.firstName ? (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.firstName.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="organization-invite-last-name">
                Last name{' '}
                <span
                  className="text-[var(--ruby-red,#b4233c)]"
                  aria-hidden="true"
                >
                  *
                </span>
              </Label>
              <Input
                id="organization-invite-last-name"
                autoComplete="family-name"
                required
                aria-invalid={Boolean(form.formState.errors.lastName)}
                {...form.register('lastName')}
              />
              {form.formState.errors.lastName ? (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.lastName.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="organization-invite-email">
              Email{' '}
              <span
                className="text-[var(--ruby-red,#b4233c)]"
                aria-hidden="true"
              >
                *
              </span>
            </Label>
            <Input
              id="organization-invite-email"
              type="email"
              required
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="organization-invite-role">Role</Label>
            <select
              id="organization-invite-role"
              className="h-9 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm"
              {...form.register('role')}
            >
              <option value="Member">Member</option>
              <option value="Administrator">
                Organization administrator
              </option>
            </select>
          </div>
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
            form="invite-organization-user"
            disabled={isPending}
          >
            {isPending ? 'Sending…' : 'Send invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
