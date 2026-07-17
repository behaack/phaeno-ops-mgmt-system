import { CheckCircle2, KeyRound } from 'lucide-react'

import { useApplicationBranding } from '#/components/application-branding'
import { Badge } from '#/components/ui/badge'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'

export function DashboardHero() {
  const branding = useApplicationBranding()
  const { session, selectedOrganizationId } = usePhaenoSession()
  const selectedMembership = getSelectedMembership(
    session,
    selectedOrganizationId,
  )
  const organizationKind = selectedMembership?.organizationKind
  const dashboardTitle =
    organizationKind === 'Phaeno' ? branding.fullName : branding.name
  const eyebrow =
    organizationKind === 'Phaeno'
      ? 'Phaeno operations'
      : organizationKind
        ? `${organizationKind} workspace`
        : 'Organization workspace'

  return (
    <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <Badge variant="secondary" className="mb-3">
          {eyebrow}
        </Badge>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
          {dashboardTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {dashboardDescription(
            organizationKind,
            selectedMembership?.organizationName,
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge className="gap-1.5" variant="outline">
          <KeyRound className="size-3.5" />
          Role-based access
        </Badge>
        <Badge className="gap-1.5" variant="outline">
          <CheckCircle2 className="size-3.5" />
          Organization scoped
        </Badge>
      </div>
    </section>
  )
}

function dashboardDescription(
  organizationKind?: 'Phaeno' | 'Prospect' | 'Customer' | 'Partner',
  organizationName?: string,
) {
  if (organizationKind === 'Phaeno') {
    return 'Manage organizations, data provisioning, commercial workflows, laboratory operations, and access from one workspace.'
  }

  const organization = organizationName ?? 'your organization'
  switch (organizationKind) {
    case 'Prospect':
      return `Review approved data and manage access for ${organization}.`
    case 'Customer':
      return `Manage laboratory requests, results, data, and organization access for ${organization}.`
    case 'Partner':
      return `Manage reagent orders, data assembly, shared data, and organization access for ${organization}.`
    default:
      return 'Access the workflows and resources available to your organization.'
  }
}
