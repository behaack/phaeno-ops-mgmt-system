import { CheckCircle2, KeyRound } from 'lucide-react'

import { Badge } from '#/components/ui/badge'

export function DashboardHero() {
  return (
    <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <Badge variant="secondary" className="mb-3">
          Multi-tenant portal starter
        </Badge>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
          Phaeno Portal
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          A TanStack Start foundation for invite-only customer, partner, and
          internal Phaeno workflows.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge className="gap-1.5" variant="outline">
          <KeyRound className="size-3.5" />
          2FA planned
        </Badge>
        <Badge className="gap-1.5" variant="outline">
          <CheckCircle2 className="size-3.5" />
          Shadcn ready
        </Badge>
      </div>
    </section>
  )
}
