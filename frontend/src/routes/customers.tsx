import {
  Link,
  Outlet,
  createFileRoute,
  useRouterState,
} from '@tanstack/react-router'
import { Building2, Plus, ShieldCheck } from 'lucide-react'

import { customerRows } from '#/features/customers/customer-data'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

export const Route = createFileRoute('/customers')({
  component: CustomersPage,
})

function CustomersPage() {
  const isCustomerDetailRoute = useRouterState({
    select: (state) => state.location.pathname !== '/customers',
  })

  if (isCustomerDetailRoute) {
    return <Outlet />
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
        <Button type="button">
          <Plus data-icon="inline-start" />
          New customer
        </Button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Customer organizations</CardTitle>
            <CardDescription>
              Representative customer records for the UI-only management flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {customerRows.map((customer) => (
              <Link
                key={customer.id}
                to="/customers/$customerId"
                params={{ customerId: customer.id }}
                className="block rounded-lg border bg-background p-3 text-inherit no-underline transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label={`Open ${customer.name} customer details`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 truncate font-medium">{customer.name}</p>
                    <p className="m-0 text-xs text-muted-foreground">
                      {customer.users} users - Partner: {customer.partner}
                    </p>
                  </div>
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
              </Link>
            ))}
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
            <Button type="button" variant="outline" className="w-full justify-start">
              <Building2 data-icon="inline-start" />
              Manage customer profile
            </Button>
            <Button type="button" variant="outline" className="w-full justify-start">
              <ShieldCheck data-icon="inline-start" />
              Review customer users
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
