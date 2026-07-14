import { Check, ChevronDown, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { type ManagedUser } from './mock-admin-data'
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

type UserFormState = {
  firstName: string
  lastName: string
  email: string
  roles: string[]
}

const blankUserForm: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  roles: [],
}

export function UserManagementPanel({
  addLabel = 'Add user',
  description,
  emptyState = 'No users found.',
  onAddUser,
  onDeactivateUser,
  onUpdateUser,
  roleOptions,
  title,
  users,
}: {
  addLabel?: string
  description: string
  emptyState?: string
  onAddUser: (user: UserFormState) => void
  onDeactivateUser: (userId: string) => void
  onUpdateUser: (userId: string, user: UserFormState) => void
  roleOptions: readonly string[]
  title: string
  users: readonly ManagedUser[]
}) {
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [formOpen, setFormOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [formState, setFormState] = useState<UserFormState>(() =>
    getBlankFormState(roleOptions),
  )

  function startCreateUser() {
    setFormMode('create')
    setEditingUserId(null)
    setFormState(getBlankFormState(roleOptions))
    setFormOpen(true)
  }

  function startEditUser(user: ManagedUser) {
    setFormMode('edit')
    setEditingUserId(user.id)
    setFormState({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles: user.roles,
    })
    setFormOpen(true)
  }

  function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const userInput = normalizeUserForm(formState, roleOptions)

    if (formMode === 'edit' && editingUserId) {
      onUpdateUser(editingUserId, userInput)
    } else {
      onAddUser(userInput)
    }

    setFormOpen(false)
    setEditingUserId(null)
    setFormState(getBlankFormState(roleOptions))
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Button type="button" onClick={startCreateUser}>
              <UserPlus data-icon="inline-start" />
              {addLabel}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.length > 0 ? (
            users.map((user) => (
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
                    {formatRoles(user.roles)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge
                    variant={user.status === 'Active' ? 'secondary' : 'outline'}
                  >
                    {user.status}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startEditUser(user)}
                  >
                    <Pencil data-icon="inline-start" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeactivateUser(user.id)}
                    disabled={user.status === 'Inactive'}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              {emptyState}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formMode === 'edit' ? 'Edit user' : addLabel}
            </DialogTitle>
            <DialogDescription>
              Changes are stored in mock state for this session.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitUser}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <Input
                  required
                  value={formState.firstName}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      firstName: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Last name">
                <Input
                  required
                  value={formState.lastName}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      lastName: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Email">
              <Input
                required
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState({ ...formState, email: event.target.value })
                }
              />
            </Field>
            <Field label="Roles">
              <RoleMultiSelect
                options={roleOptions}
                selectedRoles={formState.roles}
                onChange={(roles) => setFormState({ ...formState, roles })}
              />
            </Field>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">
                {formMode === 'edit' ? 'Save user' : addLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function formatRoles(roles: readonly string[]) {
  return roles.length > 0 ? roles.join(', ') : 'No roles assigned'
}

function RoleMultiSelect({
  onChange,
  options,
  selectedRoles,
}: {
  onChange: (roles: string[]) => void
  options: readonly string[]
  selectedRoles: readonly string[]
}) {
  const [open, setOpen] = useState(false)

  function toggleRole(role: string) {
    if (selectedRoles.includes(role)) {
      onChange(selectedRoles.filter((selectedRole) => selectedRole !== role))
      return
    }

    onChange([...selectedRoles, role])
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="flex min-h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-2.5 py-1 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <span className="min-w-0 flex-1 truncate text-foreground">
          {formatRoles(selectedRoles)}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute bottom-full z-50 mb-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {options.map((role) => {
            const selected = selectedRoles.includes(role)

            return (
              <button
                key={role}
                type="button"
                role="option"
                aria-selected={selected}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                onClick={() => toggleRole(role)}
              >
                <Check
                  aria-hidden="true"
                  className={
                    selected ? 'size-4 opacity-100' : 'size-4 opacity-0'
                  }
                />
                <span className="min-w-0 flex-1 truncate">{role}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function formatUserName(user: ManagedUser) {
  return `${user.firstName} ${user.lastName}`.trim()
}

function getBlankFormState(roleOptions: readonly string[]): UserFormState {
  return {
    ...blankUserForm,
    roles: roleOptions.length > 0 ? [roleOptions[0]] : [],
  }
}

function normalizeUserForm(
  formState: UserFormState,
  roleOptions: readonly string[],
) {
  return {
    firstName: formState.firstName.trim(),
    lastName: formState.lastName.trim(),
    email: formState.email.trim(),
    roles: formState.roles.length > 0 ? formState.roles : roleOptions.slice(0, 1),
  }
}
