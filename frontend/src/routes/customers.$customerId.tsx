import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  ShieldCheck,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { UserManagementPanel } from '#/features/admin/UserManagementPanel'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'

export const Route = createFileRoute('/customers/$customerId')({
  component: CustomerDetailsPage,
})

type CustomerProfileFormState = {
  name: string
  status: CustomerStatus
  users: string
  partner: string
  contact: string
  securityContact: string
  nextStep: string
  lastReview: string
}

const customerRoleOptions = ['Organization admin', 'Member'] as const

function CustomerDetailsPage() {
  const { customerId } = Route.useParams()
  const {
    addCustomerUser,
    customerUsers,
    customers,
    deactivateCustomer,
    deactivateCustomerUser,
    updateCustomer,
    updateCustomerUser,
  } = useMockAdminData()
  const customer = customers.find((item) => item.id === customerId) ?? null
  const [profileForm, setProfileForm] = useState<CustomerProfileFormState>(() =>
    customer ? customerToProfileForm(customer) : blankProfileForm(),
  )

  if (!customer) {
    return (
      <main className="page-wrap px-4 py-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Customer not found</CardTitle>
            <CardDescription>
              The selected customer could not be found in the mock data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/customers">
                <ArrowLeft data-icon="inline-start" />
                Back to customers
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const currentCustomer = customer
  const scopedUsers = customerUsers.filter(
    (user) => user.customerId === currentCustomer.id,
  )

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateCustomer(currentCustomer.id, profileFormToInput(profileForm))
  }

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-3">
            Customer details
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight">
            {customer.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Mock customer profile for reviewing organization details, user
            access, and partner assignment workflows.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/customers">
            <ArrowLeft data-icon="inline-start" />
            Back to customers
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Active users"
              value={`${customer.users}`}
              icon={Users}
            />
            <SummaryCard
              label="Partner"
              value={customer.partner}
              icon={Building2}
            />
            <SummaryCard
              label="Last review"
              value={customer.lastReview}
              icon={CalendarClock}
            />
          </section>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>Customer profile</CardTitle>
                  <CardDescription>
                    Organization-level information and current review status.
                  </CardDescription>
                </div>
                <Badge
                  variant={customer.status === 'Active' ? 'secondary' : 'outline'}
                >
                  {customer.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Primary contact" value={customer.contact} />
                <DetailItem
                  label="Security contact"
                  value={customer.securityContact}
                />
                <DetailItem label="Partner" value={customer.partner} />
                <DetailItem label="Last review" value={customer.lastReview} />
                <DetailItem label="Active users" value={`${customer.users}`} />
                <DetailItem label="Next step" value={customer.nextStep} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer workspace</CardTitle>
              <CardDescription>
                Mock operational views for customer users, partner access, and
                recent changes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="users">
                <TabsList>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="access">Access</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="mt-4">
                  <UserManagementPanel
                    addLabel="Add customer user"
                    description={`Users who belong to ${customer.name}.`}
                    onAddUser={(user) => addCustomerUser(customer.id, user)}
                    onDeactivateUser={deactivateCustomerUser}
                    onUpdateUser={updateCustomerUser}
                    roleOptions={customerRoleOptions}
                    title="Customer users"
                    users={scopedUsers}
                  />
                </TabsContent>
                <TabsContent value="access" className="mt-4">
                  <div className="space-y-3">
                    {[
                      ['Partner assignment', customer.partner],
                      ['Security contact', customer.securityContact],
                      ['Review queue', customer.nextStep],
                    ].map(([label, value]) => (
                      <DetailItem key={label} label={label} value={value} />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="activity" className="mt-4">
                  <div className="space-y-3">
                    {getMockActivity(customer.name).map((event) => (
                      <div
                        key={event}
                        className="rounded-lg border bg-background p-3 text-sm"
                      >
                        {event}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Edit customer</CardTitle>
              <CardDescription>
                Update the customer profile in mock state.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerProfileForm
                customer={customer}
                formState={profileForm}
                onChange={setProfileForm}
                onSubmit={submitProfile}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer actions</CardTitle>
              <CardDescription>
                Mock actions for the customer-management workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                variant="destructive"
                className="w-full justify-start"
                onClick={() => deactivateCustomer(customer.id)}
                disabled={customer.status === 'Inactive'}
              >
                <Trash2 data-icon="inline-start" />
                Delete customer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
              >
                <ShieldCheck data-icon="inline-start" />
                Review partner access
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}

function CustomerProfileForm({
  customer,
  formState,
  onChange,
  onSubmit,
}: {
  customer: CustomerRecord
  formState: CustomerProfileFormState
  onChange: (state: CustomerProfileFormState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field label="Name">
        <Input
          required
          value={formState.name}
          onChange={(event) => onChange({ ...formState, name: event.target.value })}
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
          onChange={(event) => onChange({ ...formState, users: event.target.value })}
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
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(customerToProfileForm(customer))}
        >
          Reset
        </Button>
        <Button type="submit">Save customer</Button>
      </div>
    </form>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="m-0 mt-1 text-sm font-medium">{value}</dd>
    </div>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: LucideIcon
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
          <p className="m-0 truncate text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function blankProfileForm(): CustomerProfileFormState {
  return {
    name: '',
    status: 'Active',
    users: '0',
    partner: '',
    contact: '',
    securityContact: '',
    nextStep: '',
    lastReview: '',
  }
}

function customerToProfileForm(customer: CustomerRecord): CustomerProfileFormState {
  return {
    name: customer.name,
    status: customer.status,
    users: `${customer.users}`,
    partner: customer.partner,
    contact: customer.contact,
    securityContact: customer.securityContact,
    nextStep: customer.nextStep,
    lastReview: customer.lastReview,
  }
}

function profileFormToInput(formState: CustomerProfileFormState) {
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

function getMockActivity(customerName: string) {
  return [
    `${customerName} profile was reviewed by Phaeno operations.`,
    'Partner access scope was refreshed for active users.',
    'Invite policy review was queued for the next access audit.',
  ]
}
