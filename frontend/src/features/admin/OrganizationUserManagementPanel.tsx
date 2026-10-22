import { Field as PortalField } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, Mail, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { OrganizationInvitationDialog, type OrganizationInviteValues } from '#/features/invitations/OrganizationInvitationDialog'

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
  ActionMenu as DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'

const roleSchema = z.object({
  role: z.enum(['Member', 'Administrator']),
})
type RoleValues = z.infer<typeof roleSchema>

type EditTarget = {
  user: OrganizationUser
  membership: OrganizationMembership
}

export function OrganizationUserManagementPanel({
  currentUserId,
  organizationId,
  organizationName,
}: {
  currentUserId: string
  organizationId: string
  organizationName: string
}) {
  const __customerText = useCustomerText()

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
    mutationFn: (values: OrganizationInviteValues) =>
      createInvitation({
        organizationId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        isOrganizationAdmin: values.role === 'Administrator',
        labRoles: [],
        departments: values.departments,
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
              <CardTitle><CustomerText message="m_6b0cc904d081" /></CardTitle>
              <CardDescription>
                <CustomerText message="m_749bad0816a3" /></CardDescription>
            </div>
            <Button id="add-organization-user" type="button" onClick={() => { inviteMutation.reset(); setInviteOpen(true) }}>
              <UserPlus data-icon="inline-start" />
              <CustomerText message="m_eec5c73a1d6c" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle><CustomerText message="m_ed37dff114e4" /></AlertTitle>
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          {usersQuery.isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              <CustomerText message="m_a53ec7ac2a7b" /></p>
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
                      ? "Organization administrator"
                      : __customerText('m_7c968fb71f50')}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      membership.isActive && user.status === 'Active'
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {membership.isActive ? user.status : __customerText('m_e695f3075af2')}
                  </Badge>
                  {membership.isActive ? (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={__customerText('m_d54cf5b8374c', { p0: String(user.firstName), p1: String(user.lastName) })}
                        >
                          <Ellipsis aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => setEditTarget(target)}
                        >
                          <Pencil aria-hidden="true" />
                          <CustomerText message="m_464c4ffd019e" /></DropdownMenuItem>
                        {user.id !== currentUserId ? (
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeactivateTarget(target)}
                          >
                            <Trash2 aria-hidden="true" />
                            <CustomerText message="m_fb1e6fa55327" /></DropdownMenuItem>
                        ) : null}
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
                    ? "Organization administrator"
                    : __customerText('m_7c968fb71f50')}
                </p>
                <p className="m-0 mt-1 text-xs text-muted-foreground">
                  <CustomerText message="m_f06539e5b1d0" />{invitation.isExpired ? "Expired" : invitation.status}
                  {' · '}<CustomerText message="m_620b685b667f" />{invitation.deliveryStatus ?? 'Not queued'}
                  {' · '}<CustomerText message="m_58dae2b09750" />{invitation.sendCount}
                  {' · '}<CustomerText message="m_d970e4fd1080" />{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(invitation.expiresAt))}
                </p>
                {invitation.lastSendError ? <p className="m-0 mt-1 text-sm text-destructive" role="status">{invitation.lastSendError}</p> : null}
                {invitation.hasHardBounce ? <p className="m-0 mt-1 text-sm text-destructive"><CustomerText message="m_014c9b8659a2" /></p> : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant="outline"><CustomerText message="m_5cd314166bad" /></Badge>
                <Badge variant={invitation.deliveryStatus === 'Delivered' || invitation.deliveryStatus === 'Accepted' ? "secondary" : "outline"}>
                  <CustomerText message="m_969ccbd3cf63" />{invitation.deliveryStatus ?? 'Not queued'}
                </Badge>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={__customerText('m_e78d9a50658a', { p0: String(invitation.email) })}
                    >
                      <Ellipsis aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-max min-w-48 max-w-[calc(100vw-2rem)]">
                    <DropdownMenuItem
                      disabled={invitationMutation.isPending || invitation.hasHardBounce}
                      onSelect={() =>
                        invitationMutation.mutate({
                          id: invitation.id,
                          action: 'resend',
                        })
                      }
                    >
                      <Mail aria-hidden="true" />
                      <CustomerText message="m_6402d96e5fc7" /></DropdownMenuItem>
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
                      <CustomerText message="m_eb39fc8cf692" /></DropdownMenuItem>
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
              <CustomerText message="m_87fcb0d943ab" /></div>
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
      {inviteOpen ? <OrganizationInvitationDialog
        organizationId={organizationId}
        organizationName={organizationName}
        error={inviteMutation.error}
        isPending={inviteMutation.isPending}
        onOpenChange={setInviteOpen}
        onSubmit={(values) => inviteMutation.mutateAsync(values)}
      /> : null}
      <Dialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle><CustomerText message="m_64c4c3716446" /></DialogTitle>
            <DialogDescription>
              {deactivateTarget
                ? __customerText('m_74143fe2c92e', { p0: String(deactivateTarget.user.email), p1: String(organizationName) })
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
              <CustomerText message="m_19766ed6ccb2" /></Button>
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
                ? "Deactivating…"
                : __customerText('m_3ce7a8f6793e')}
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
  const __customerText = useCustomerText()

  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { role: 'Member' },
  })
  const { isDirty: __formDraftDirty } = form.formState
  const __modalGuard = useModalDraftGuard(__formDraftDirty, form.formState.isSubmitting)


  useEffect(() => {
    form.reset({
      role: target?.membership.isOrganizationAdmin
        ? 'Administrator'
        : 'Member',
    })
  }, [form, target])

  return (
    <Dialog open={Boolean(target)} onOpenChange={open => { if (open) (onOpenChange)(open); else void __modalGuard.close(() => (onOpenChange)(false)) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><CustomerText message="m_05b88d18fc0d" /></DialogTitle>
          <DialogDescription>
            <CustomerText message="m_002b7d65e616" />{target?.membership.organizationName}.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle><CustomerText message="m_2a1a48708802" /></AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form
          id="edit-organization-user"
          className="grid gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <PortalField >
            <Label htmlFor="organization-user-name"><CustomerText message="m_dcd1d5223f73" /></Label>
            <Input
              id="organization-user-name"
              value={
                target
                  ? `${target.user.firstName} ${target.user.lastName}`.trim()
                  : ''
              }
              disabled
            />
          </PortalField>
          <PortalField >
            <Label htmlFor="organization-user-email"><CustomerText message="m_969ccbd3cf63" /></Label>
            <Input
              id="organization-user-email"
              value={target?.user.email ?? ''}
              disabled
            />
          </PortalField>
          <PortalField >
            <Label htmlFor="organization-user-role">
              <RequiredFieldName><CustomerText message="m_14736a2eb9f4" /></RequiredFieldName>
            </Label>
            <NativeSelect
              id="organization-user-role"

              {...form.register('role')}
            >
              <option value="Member"><CustomerText message="m_7c968fb71f50" /></option>
              <option value="Administrator">
                <CustomerText message="m_211d58cbb46a" /></option>
            </NativeSelect>
          </PortalField>
        </form>
        <RequiredDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => { void __modalGuard.close(() => (() => onOpenChange(false))()) }}
          >
            <CustomerText message="m_19766ed6ccb2" /></Button>
          <Button
            type="submit"
            form="edit-organization-user"
            disabled={isPending || !__formDraftDirty}
          >
            {isPending ? "Saving…" : __customerText('m_dd0ae7a5cbcf')}
          </Button>
        </RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}
