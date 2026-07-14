import {
  Link,
  Outlet,
  createFileRoute,
  useRouterState,
} from '@tanstack/react-router'
import { Building2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'

import {
  useMockAdminData,
  type CustomerRecord,
  type CustomerStatus,
} from '#/features/admin/mock-admin-data'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export const Route = createFileRoute('/customers')({
  component: CustomersPage,
})

type CustomerFormState = {
  name: string
  status: CustomerStatus
  users: string
  partner: string
  nextStep: string
  contact: string
  securityContact: string
  lastReview: string
}

const blankCustomerForm: CustomerFormState = {
  name: '',
  status: 'Active',
  users: '0',
  partner: '',
  nextStep: '',
  contact: '',
  securityContact: '',
  lastReview: 'Not reviewed',
}

function CustomersPage() {
  const isCustomerDetailRoute = useRouterState({
    select: (state) => state.location.pathname !== '/customers',
  })
  const {
    customers,
    addCustomer,
    updateCustomer,
    deactivateCustomer,
  } = useMockAdminData()
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [formState, setFormState] =
    useState<CustomerFormState>(blankCustomerForm)

  const sortedCustomers = useMemo(
    () =>
      [...customers].sort((firstCustomer, secondCustomer) =>
        firstCustomer.name.localeCompare(secondCustomer.name),
      ),
    [customers],
  )

  if (isCustomerDetailRoute) {
    return <Outlet />
  }

  function startCreateCustomer() {
    setFormMode('create')
    setEditingCustomerId(null)
    setFormState(blankCustomerForm)
  }

  function startEditCustomer(customer: CustomerRecord) {
    setFormMode('edit')
    setEditingCustomerId(customer.id)
    setFormState(customerToFormState(customer))
  }

  function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const customerInput = formStateToInput(formState)

    if (formMode === 'edit' && editingCustomerId) {
      updateCustomer(editingCustomerId, customerInput)
    } else {
      addCustomer(customerInput)
    }

    startCreateCustomer()
  }

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-3">
            Phaeno customer administration
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight">Customers</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Mock workspace for managing customer organizations, customer users,
            and partner assignments.
          </p>
        </div>
        <Button type="button" onClick={startCreateCustomer}>
          <Plus data-icon="inline-start" />
          New customer
        </Button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Customer organizations</CardTitle>
            <CardDescription>
              Add, edit, and deactivate customer records for the mock workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedCustomers.map((customer) => (
              <div
                key={customer.id}
                className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to="/customers/$customerId"
                    params={{ customerId: customer.id }}
                    className="min-w-0 flex-1 text-inherit no-underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-label={`Open ${customer.name} customer details`}
                  >
                    <p className="m-0 truncate font-medium">{customer.name}</p>
                    <p className="m-0 text-xs text-muted-foreground">
                      {customer.users} users - Partner: {customer.partner}
                    </p>
                  </Link>
                  <Badge
                    variant={
                      customer.status === 'Active' ? 'secondary' : 'outline'
                    }
                  >
                    {customer.status}
                  </Badge>
                </div>
                <p className="m-0 mt-3 text-sm text-muted-foreground">
                  {customer.nextStep}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startEditCustomer(customer)}
                  >
                    <Pencil data-icon="inline-start" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => deactivateCustomer(customer.id)}
                    disabled={customer.status === 'Inactive'}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {formMode === 'edit' ? 'Edit customer' : 'New customer'}
              </CardTitle>
              <CardDescription>
                Changes are stored in mock state for this session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerForm
                formState={formState}
                mode={formMode}
                onCancel={startCreateCustomer}
                onChange={setFormState}
                onSubmit={submitCustomer}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer tools</CardTitle>
              <CardDescription>
                Actions reserved for Phaeno employees authorized to manage
                customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
              >
                <Building2 data-icon="inline-start" />
                Manage customer profile
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
              >
                <ShieldCheck data-icon="inline-start" />
                Review customer users
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}

function CustomerForm({
  formState,
  mode,
  onCancel,
  onChange,
  onSubmit,
}: {
  formState: CustomerFormState
  mode: 'create' | 'edit'
  onCancel: () => void
  onChange: (state: CustomerFormState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field label="Name">
        <Input
          required
          value={formState.name}
          onChange={(event) =>
            onChange({ ...formState, name: event.target.value })
          }
        />
      </Field>
      <Field label="Status">
        <select
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          value={formState.status}
          onChange={(event) =>
            onChange({
              ...formState,
              status: event.target.value as CustomerStatus,
            })
          }
        >
          <option>Active</option>
          <option>Review</option>
          <option>Inactive</option>
        </select>
      </Field>
      <Field label="Users">
        <Input
          min={0}
          type="number"
          value={formState.users}
          onChange={(event) =>
            onChange({ ...formState, users: event.target.value })
          }
        />
      </Field>
      <Field label="Partner">
        <Input
          value={formState.partner}
          onChange={(event) =>
            onChange({ ...formState, partner: event.target.value })
          }
        />
      </Field>
      <Field label="Primary contact">
        <Input
          value={formState.contact}
          onChange={(event) =>
            onChange({ ...formState, contact: event.target.value })
          }
        />
      </Field>
      <Field label="Security contact">
        <Input
          value={formState.securityContact}
          onChange={(event) =>
            onChange({ ...formState, securityContact: event.target.value })
          }
        />
      </Field>
      <Field label="Next step">
        <Input
          value={formState.nextStep}
          onChange={(event) =>
            onChange({ ...formState, nextStep: event.target.value })
          }
        />
      </Field>
      <Field label="Last review">
        <Input
          value={formState.lastReview}
          onChange={(event) =>
            onChange({ ...formState, lastReview: event.target.value })
          }
        />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        {mode === 'edit' ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit">
          {mode === 'edit' ? 'Save customer' : 'Add customer'}
        </Button>
      </div>
    </form>
  )
}

function Field({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <label className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  )
}

function customerToFormState(customer: CustomerRecord): CustomerFormState {
  return {
    name: customer.name,
    status: customer.status,
    users: `${customer.users}`,
    partner: customer.partner,
    nextStep: customer.nextStep,
    contact: customer.contact,
    securityContact: customer.securityContact,
    lastReview: customer.lastReview,
  }
}

function formStateToInput(formState: CustomerFormState) {
  return {
    name: formState.name.trim(),
    status: formState.status,
    users: Number(formState.users) || 0,
    partner: formState.partner.trim() || 'Unassigned',
    nextStep: formState.nextStep.trim() || 'No open next step',
    contact: formState.contact.trim() || 'Not assigned',
    securityContact: formState.securityContact.trim() || 'Not assigned',
    lastReview: formState.lastReview.trim() || 'Not reviewed',
  }
}
