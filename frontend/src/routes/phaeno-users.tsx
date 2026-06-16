import { createFileRoute } from '@tanstack/react-router'
import { ShieldCheck, UserCog, UserPlus } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

export const Route = createFileRoute('/phaeno-users')({
  component: PhaenoUsersPage,
})

const phaenoUsers = [
  {
    name: 'Bill Haack',
    email: 'bill.haack@phaeno.com',
    role: 'Platform admin',
    status: 'Active',
  },
  {
    name: 'Morgan Ellis',
    email: 'morgan.ellis@phaeno.com',
    role: 'Operations admin',
    status: 'Invited',
  },
  {
    name: 'Priya Shah',
    email: 'priya.shah@phaeno.com',
    role: 'Customer manager',
    status: 'Active',
  },
] as const

function PhaenoUsersPage() {
  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-3">
            Internal Phaeno administration
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight">
            User management
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Mock workspace for Phaeno employee accounts, internal roles, and
            platform-level access.
          </p>
        </div>
        <Button type="button">
          <UserPlus data-icon="inline-start" />
          Invite Phaeno user
        </Button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Phaeno users</CardTitle>
            <CardDescription>
              Internal users who belong to the Phaeno parent organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {phaenoUsers.map((user) => (
              <div
                key={user.email}
                className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3"
              >
                <div className="min-w-0">
                  <p className="m-0 truncate font-medium">{user.name}</p>
                  <p className="m-0 truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                  <p className="m-0 mt-2 text-sm text-muted-foreground">
                    {user.role}
                  </p>
                </div>
                <Badge variant={user.status === 'Active' ? 'secondary' : 'outline'}>
                  {user.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Internal access tools</CardTitle>
            <CardDescription>
              Separate from customer and customer-user management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" variant="outline" className="w-full justify-start">
              <UserCog data-icon="inline-start" />
              Adjust internal roles
            </Button>
            <Button type="button" variant="outline" className="w-full justify-start">
              <ShieldCheck data-icon="inline-start" />
              Review platform access
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
