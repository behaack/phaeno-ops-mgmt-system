import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  FlaskConical,
  Library,
  Package,
  PackageCheck,
  UsersRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import { listTenantDatasets } from '#/api/data-provisioning'
import {
  listAssemblyRequests,
  listLabOrders,
  listReagentOrders,
  type OrderListItem,
  type PagedResult,
} from '#/api/order-management'
import { getSampleShipments } from '#/api/sample-shipping'
import type { SessionMembership } from '#/api/session'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { usePhaenoSession } from '#/features/auth/session-context'

type ExternalDashboardContentProps = {
  membership: SessionMembership | null | undefined
}

type WorkflowCardProps = {
  actionLabel: string
  description: string
  error: boolean
  href:
    | '/data-assembly'
    | '/data-library'
    | '/lab-services'
    | '/phaeno-users'
    | '/reagent-orders'
    | '/sample-shipping'
  icon: LucideIcon
  isLoading: boolean
  mock: boolean
  summary: string
  title: string
  total?: number
  totalLabel?: string
}

export function ExternalDashboardContent({
  membership,
}: ExternalDashboardContentProps) {
  const { authProvider, session, selectedOrganizationId } = usePhaenoSession()
  const capabilities = session?.capabilities
  const kind = membership?.organizationKind
  const apiEnabled = authProvider !== 'mock'
  const isCustomer = kind === 'Customer'
  const isPartner = kind === 'Partner'
  const canViewData = Boolean(capabilities?.canViewOrganizationDatasets)
  const canViewLab = isCustomer && Boolean(capabilities?.canViewLabServiceOrders)
  const canViewShipping =
    (kind === 'Prospect' || isCustomer) &&
    Boolean(capabilities?.canViewSampleShipping)
  const canViewReagents =
    isPartner && Boolean(capabilities?.canViewReagentOrders)
  const canViewAssembly =
    isPartner && Boolean(capabilities?.canViewDataAssemblyRequests)
  const canManageUsers =
    Boolean(membership?.isOrganizationAdmin) &&
    Boolean(capabilities?.canManageMembers)

  const labOrders = useQuery({
    queryKey: ['dashboard', 'lab-service-orders', selectedOrganizationId],
    queryFn: () => listLabOrders({ page: 1, pageSize: 1 }),
    enabled: apiEnabled && canViewLab,
  })
  const reagentOrders = useQuery({
    queryKey: ['dashboard', 'reagent-orders', selectedOrganizationId],
    queryFn: () => listReagentOrders({ page: 1, pageSize: 1 }),
    enabled: apiEnabled && canViewReagents,
  })
  const assemblyRequests = useQuery({
    queryKey: ['dashboard', 'data-assembly-requests', selectedOrganizationId],
    queryFn: () => listAssemblyRequests({ page: 1, pageSize: 1 }),
    enabled: apiEnabled && canViewAssembly,
  })
  const shipments = useQuery({
    queryKey: ['sample-shipments'],
    queryFn: getSampleShipments,
    enabled: apiEnabled && kind === 'Prospect' && canViewShipping,
  })
  const datasets = useQuery({
    queryKey: ['curated-data', selectedOrganizationId],
    queryFn: listTenantDatasets,
    enabled: apiEnabled && canViewData,
  })

  if (!membership || !kind || kind === 'Phaeno') {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Organization workspace unavailable</CardTitle>
          <CardDescription>
            Select an active Prospect, Customer, or Partner organization.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const cards: ReactNode[] = []

  if (canViewLab) {
    cards.push(
      <WorkflowCard
        key="lab-services"
        title="Lab services"
        description="Request laboratory work, prepare and ship samples, and follow released results."
        icon={FlaskConical}
        href="/lab-services"
        actionLabel="Open lab services"
        total={labOrders.data?.totalCount}
        totalLabel="requests"
        summary={orderSummary(labOrders.data, 'No laboratory requests yet.')}
        isLoading={labOrders.isLoading}
        error={Boolean(labOrders.error)}
        mock={!apiEnabled}
      />,
    )
  }

  if (kind === 'Prospect' && canViewShipping) {
    cards.push(
      <WorkflowCard
        key="sample-shipping"
        title="Samples & shipping"
        description="Match Phaeno-supplied tubes and prepare authorized return shipments."
        icon={PackageCheck}
        href="/sample-shipping"
        actionLabel="Open sample shipping"
        total={shipments.data?.length}
        totalLabel="shipments"
        summary={shippingSummary(shipments.data)}
        isLoading={shipments.isLoading}
        error={Boolean(shipments.error)}
        mock={!apiEnabled}
      />,
    )
  }

  if (canViewReagents) {
    cards.push(
      <WorkflowCard
        key="reagent-orders"
        title="Reagent orders"
        description="Place Partner-eligible orders and track fulfillment."
        icon={Package}
        href="/reagent-orders"
        actionLabel="Open reagent orders"
        total={reagentOrders.data?.totalCount}
        totalLabel="orders"
        summary={orderSummary(reagentOrders.data, 'No reagent orders yet.')}
        isLoading={reagentOrders.isLoading}
        error={Boolean(reagentOrders.error)}
        mock={!apiEnabled}
      />,
    )
  }

  if (canViewAssembly) {
    cards.push(
      <WorkflowCard
        key="data-assembly"
        title="Data assembly"
        description="Submit scientific inputs and retrieve released output packages."
        icon={Workflow}
        href="/data-assembly"
        actionLabel="Open data assembly"
        total={assemblyRequests.data?.totalCount}
        totalLabel="requests"
        summary={orderSummary(assemblyRequests.data, 'No assembly requests yet.')}
        isLoading={assemblyRequests.isLoading}
        error={Boolean(assemblyRequests.error)}
        mock={!apiEnabled}
      />,
    )
  }

  if (canViewData) {
    cards.push(
      <WorkflowCard
        key="data-library"
        title="Data Library"
        description="Open Phaeno-curated data assigned to this organization."
        icon={Library}
        href="/data-library"
        actionLabel="Open Data Library"
        total={datasets.data?.length}
        totalLabel="datasets"
        summary={datasetSummary(datasets.data)}
        isLoading={datasets.isLoading}
        error={Boolean(datasets.error)}
        mock={!apiEnabled}
      />,
    )
  }

  if (canManageUsers) {
    cards.push(
      <WorkflowCard
        key="user-management"
        title="User management"
        description={`Manage members and pending invitations for ${membership.organizationName}.`}
        icon={UsersRound}
        href="/phaeno-users"
        actionLabel="Manage users"
        summary="Administrator access"
        isLoading={false}
        error={false}
        mock={false}
      />,
    )
  }

  return (
    <section aria-labelledby="your-work-heading" className="space-y-4">
      <div>
        <h2 id="your-work-heading" className="text-lg font-semibold">
          Your work
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live activity and starting points for {membership.organizationName}.
        </p>
      </div>

      {!apiEnabled ? (
        <Alert>
          <AlertTitle>Connected summaries are paused in mock-session mode</AlertTitle>
          <AlertDescription>
            Use a real organization sign-in to load records from the secured API.
          </AlertDescription>
        </Alert>
      ) : null}

      {cards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards}</div>
      ) : (
        <Card className="max-w-2xl border-dashed">
          <CardHeader>
            <CardTitle>No workspace actions available</CardTitle>
            <CardDescription>
              This membership does not currently have access to an organization
              workflow. Contact an organization administrator if access is expected.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </section>
  )
}

function WorkflowCard({
  actionLabel,
  description,
  error,
  href,
  icon: Icon,
  isLoading,
  mock,
  summary,
  title,
  total,
  totalLabel,
}: WorkflowCardProps) {
  const value = loadingValue(isLoading, error, mock, total)

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {totalLabel ? (
          <CardAction>
            <Badge variant="outline">
              {value} {value === '1' ? singular(totalLabel) : totalLabel}
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="mt-auto">
        <p
          className={error ? 'm-0 text-sm text-destructive' : 'm-0 text-sm text-muted-foreground'}
          role={error ? 'alert' : undefined}
        >
          {error
            ? 'This summary could not be loaded.'
            : mock
              ? 'Live records are unavailable in mock-session mode.'
              : isLoading
                ? 'Loading current activity…'
                : summary}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="ghost" className="-ml-3">
          <Link to={href}>
            {actionLabel}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function loadingValue(
  isLoading: boolean,
  error: boolean,
  mock: boolean,
  total?: number,
) {
  if (isLoading) return '…'
  if (error || mock || total === undefined) return '—'
  return String(total)
}

function orderSummary(
  data: PagedResult<OrderListItem> | undefined,
  emptyMessage: string,
) {
  const latest = data?.items[0]
  if (!latest) return emptyMessage

  return `${latest.number} was updated ${formatDate(latest.updatedAt)} and is ${humanize(latest.status).toLowerCase()}.`
}

function shippingSummary(
  shipments: Awaited<ReturnType<typeof getSampleShipments>> | undefined,
) {
  if (!shipments?.length) return 'No authorized sample shipments yet.'

  const unmatchedTubes = shipments.reduce(
    (total, shipment) =>
      total +
      shipment.crosswalk.filter((item) => !item.supplierTubeBarcode).length,
    0,
  )

  if (unmatchedTubes === 0) return 'All current tube matches are complete.'
  return `${unmatchedTubes} tube ${unmatchedTubes === 1 ? 'match remains' : 'matches remain'} across authorized shipments.`
}

function datasetSummary(
  datasets: Awaited<ReturnType<typeof listTenantDatasets>> | undefined,
) {
  if (!datasets?.length) return 'No curated data has been assigned yet.'

  const latest = [...datasets].sort(
    (left, right) =>
      new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
  )[0]
  return `Latest assignment: ${latest.name}, version ${latest.versionNumber}.`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
    new Date(value),
  )
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function singular(value: string) {
  return value.endsWith('s') ? value.slice(0, -1) : value
}
