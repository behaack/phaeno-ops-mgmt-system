import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { getCustomerById } from '#/features/customers/customer-data'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'

export const Route = createFileRoute('/customers/$customerId')({
  component: CustomerDetailsPage,
})

function CustomerDetailsPage() {
  const { customerId } = Route.useParams()
  const customer = getCustomerById(customerId)

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

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
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
                  <div className="space-y-3">
                    {getMockCustomerUsers(customer.name).map((user) => (
                      <div
                        key={user.email}
                        className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3"
                      >
                        <div className="min-w-0">
                          <p className="m-0 truncate font-medium">{user.name}</p>
                          <p className="m-0 truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                    ))}
                  </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Customer actions</CardTitle>
            <CardDescription>
              Mock actions for the customer-management workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" variant="outline" className="w-full justify-start">
              <Building2 data-icon="inline-start" />
              Edit customer profile
            </Button>
            <Button type="button" variant="outline" className="w-full justify-start">
              <Users data-icon="inline-start" />
              Manage customer users
            </Button>
            <Button type="button" variant="outline" className="w-full justify-start">
              <ShieldCheck data-icon="inline-start" />
              Review partner access
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
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

function getMockCustomerUsers(customerName: string) {
  return [
    {
      name: `${customerName.split(' ')[0]} Admin`,
      email: `admin@${customerName.toLocaleLowerCase().replaceAll(' ', '')}.example`,
      role: 'Admin',
    },
    {
      name: 'Jordan Lee',
      email: 'jordan.lee@example.com',
      role: 'Member',
    },
    {
      name: 'Sam Rivera',
      email: 'sam.rivera@example.com',
      role: 'Member',
    },
  ]
}

function getMockActivity(customerName: string) {
  return [
    `${customerName} profile was reviewed by Phaeno operations.`,
    'Partner access scope was refreshed for active users.',
    'Invite policy review was queued for the next access audit.',
  ]
}
