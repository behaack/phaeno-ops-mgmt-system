import { Link } from '@tanstack/react-router'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock3,
  FlaskConical,
  Globe2,
  PackageCheck,
  ShoppingCart,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { AccountsDashboardContent } from './AccountsDashboardContent'
import { DashboardHero } from './DashboardHero'
import { WebOpsDashboardContent } from './WebOpsDashboardContent'
import {
  completeWebOpsDemoRequest,
  getWebOpsDemoRequests,
  getWebOpsMailingList,
  unsubscribeWebOpsMailingListContact,
  type WebOpsDemoRequest,
  type WebOpsMailingListContact,
  type WebOpsPage,
} from '#/api/web-ops'
import {
  WorkspaceSidebar,
  type WorkspaceSidebarItem,
} from '#/components/WorkspaceSidebar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { usePhaenoSession } from '#/features/auth/session-context'

const operationsPanels = {
  orders: {
    tabLabel: 'Order Operations',
    tabCount: 16,
    icon: ShoppingCart,
    title: 'Order Operations',
    description:
      'Commercial work requiring pricing, fulfillment, release, or integration attention.',
    href: '/order-operations',
    actionLabel: 'Open Order Operations',
    metrics: [
      { label: 'Awaiting review', value: '8', icon: Clock3 },
      { label: 'On hold', value: '3', icon: AlertTriangle },
      { label: 'Release blocked', value: '5', icon: PackageCheck },
    ],
    items: [
      {
        id: 'LAB-2026-0142',
        title: 'Quote review',
        context: 'Northline Labs · Lab service',
        status: 'New',
        updated: '18 min',
        attention: 'normal',
      },
      {
        id: 'KIT-2026-0087',
        title: 'Fulfillment hold',
        context: 'Genome Partner Network · Reagent order',
        status: 'Blocked',
        updated: '42 min',
        attention: 'critical',
      },
      {
        id: 'ASM-2026-0031',
        title: 'Integration retry',
        context: 'Genome Partner Network · Data assembly',
        status: 'Retry',
        updated: '1 hr',
        attention: 'critical',
      },
    ],
  },
  lab: {
    tabLabel: 'Lab Operations',
    tabCount: 12,
    icon: FlaskConical,
    title: 'Lab Operations',
    description:
      'Laboratory work requiring receipt, exception resolution, or scientific review.',
    href: '/lab-operations',
    actionLabel: 'Open Lab Operations',
    metrics: [
      { label: 'Awaiting receipt', value: '6', icon: Clock3 },
      { label: 'Exceptions', value: '2', icon: AlertTriangle },
      { label: 'Ready for review', value: '4', icon: PackageCheck },
    ],
    items: [
      {
        id: 'LWO-2026-0108',
        title: 'Awaiting accession',
        context: 'Northline Labs · PSeq Lab Service',
        status: 'Received',
        updated: '12 min',
        attention: 'normal',
      },
      {
        id: 'LWO-2026-0099',
        title: 'QC exception',
        context: 'Library preparation · Batch LIB-0047',
        status: 'Exception',
        updated: '36 min',
        attention: 'critical',
      },
      {
        id: 'LWO-2026-0094',
        title: 'Scientific review',
        context: 'Sequencing complete · Batch NGS-0028',
        status: 'Review',
        updated: '55 min',
        attention: 'normal',
      },
    ],
  },
} as const

type DashboardSection = 'orders' | 'lab' | 'accounts' | 'webOps'

const mockMailingListPage: WebOpsPage<WebOpsMailingListContact> = {
  page: 1,
  pageSize: 10,
  totalCount: 2,
  items: [
    {
      id: 'mock-contact-1',
      firstName: 'Morgan',
      lastName: 'Lee',
      organizationName: 'Northstar Research',
      email: 'morgan.lee@example.com',
      technicalBriefRequested: true,
      createdAtUtc: '2026-07-17T17:00:00Z',
    },
    {
      id: 'mock-contact-2',
      firstName: 'Priya',
      lastName: 'Shah',
      organizationName: 'Helix Discovery',
      email: 'priya.shah@example.com',
      technicalBriefRequested: false,
      createdAtUtc: '2026-07-16T19:30:00Z',
    },
  ],
}

const mockDemoRequestPage: WebOpsPage<WebOpsDemoRequest> = {
  page: 1,
  pageSize: 10,
  totalCount: 2,
  items: [
    {
      id: 'mock-request-1',
      firstName: 'Alex',
      lastName: 'Chen',
      organizationName: 'Atlas Bioanalytics',
      email: 'alex.chen@example.com',
      description: 'We would like a demonstration for our transcriptomics team.',
    },
    {
      id: 'mock-request-2',
      firstName: 'Sam',
      lastName: 'Rivera',
      organizationName: 'Summit Genomics',
      email: 'sam.rivera@example.com',
      description: 'Please schedule a technical overview for our research group.',
    },
  ],
}

export function DashboardPanelSelector() {
  const [section, setSection] = useState<DashboardSection>('orders')
  const [mailingListPage, setMailingListPage] = useState(1)
  const [demoRequestPage, setDemoRequestPage] = useState(1)
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const apiEnabled = authProvider !== 'mock'
  const canViewWebOperations = session?.isPlatformAdmin === true
  const mailingList = useQuery({
    queryKey: ['web-ops', 'mailing-list', mailingListPage],
    queryFn: () => getWebOpsMailingList(mailingListPage),
    enabled: apiEnabled && canViewWebOperations,
  })
  const demoRequests = useQuery({
    queryKey: ['web-ops', 'demo-requests', demoRequestPage],
    queryFn: () => getWebOpsDemoRequests(demoRequestPage),
    enabled: apiEnabled && canViewWebOperations,
  })
  const unsubscribeContact = useMutation({
    mutationFn: (contactId: string) =>
      unsubscribeWebOpsMailingListContact(contactId),
    onSuccess: async () => {
      if (mailingListPage > 1 && mailingList.data?.items.length === 1) {
        setMailingListPage((page) => Math.max(1, page - 1))
      }
      await queryClient.invalidateQueries({ queryKey: ['web-ops'] })
    },
  })
  const completeDemoRequest = useMutation({
    mutationFn: (requestId: string) =>
      completeWebOpsDemoRequest(requestId),
    onSuccess: async () => {
      if (demoRequestPage > 1 && demoRequests.data?.items.length === 1) {
        setDemoRequestPage((page) => Math.max(1, page - 1))
      }
      await queryClient.invalidateQueries({ queryKey: ['web-ops'] })
    },
  })
  const mailingListData = apiEnabled ? mailingList.data : mockMailingListPage
  const demoRequestData = apiEnabled
    ? demoRequests.data
    : mockDemoRequestPage
  const webOperationsCount = mailingListData && demoRequestData
    ? mailingListData.totalCount + demoRequestData.totalCount
    : undefined
  const sections = useMemo<
    ReadonlyArray<WorkspaceSidebarItem<DashboardSection>>
  >(
    () => [
      {
        value: 'orders',
        label: operationsPanels.orders.tabLabel,
        description: 'Pricing, fulfillment, release, and integration work.',
        count: operationsPanels.orders.tabCount,
        countDescription: `${operationsPanels.orders.tabCount} items needing attention`,
        icon: operationsPanels.orders.icon,
      },
      {
        value: 'lab',
        label: operationsPanels.lab.tabLabel,
        description: 'Receipt, exceptions, and scientific review.',
        count: operationsPanels.lab.tabCount,
        countDescription: `${operationsPanels.lab.tabCount} items needing attention`,
        icon: operationsPanels.lab.icon,
      },
      {
        value: 'accounts',
        label: 'Accounts',
        description: 'Customer, Partner, and Prospect administration.',
        count: 21,
        countDescription: '21 items needing attention',
        icon: Building2,
      },
      ...(canViewWebOperations
        ? [{
            value: 'webOps' as const,
            label: 'Web Operations',
            description: 'Mailing List and Demo Requests.',
            count: webOperationsCount,
            countDescription: webOperationsCount !== undefined
              ? `${webOperationsCount} Website submissions`
              : undefined,
            icon: Globe2,
          }]
        : []),
    ],
    [canViewWebOperations, webOperationsCount],
  )

  return (
    <WorkspaceSidebar
      workspaceLabel="POMS dashboard"
      items={sections}
      value={section}
      onValueChange={setSection}
    >
      <main className="page-wrap px-4 py-8">
        <div className="soft-enter">
          <DashboardHero />
        </div>
        <div className="soft-enter soft-enter-delay-1">
          {section === 'orders' ? (
            <OperationsPanel panel={operationsPanels.orders} />
          ) : null}
          {section === 'lab' ? (
            <OperationsPanel panel={operationsPanels.lab} />
          ) : null}
          {section === 'accounts' ? (
            <AccountsDashboardContent showHeading />
          ) : null}
          {section === 'webOps' ? (
            <WebOpsDashboardContent
              mailingList={{
                data: mailingListData,
                error: apiEnabled ? mailingList.error : null,
                isLoading: apiEnabled && mailingList.isFetching,
                onPageChange: setMailingListPage,
                onRetry: () => void mailingList.refetch(),
                action: apiEnabled
                  ? {
                      error: unsubscribeContact.error,
                      isPending: unsubscribeContact.isPending,
                      onExecute: (contact) =>
                        unsubscribeContact.mutateAsync(contact.id),
                      onReset: unsubscribeContact.reset,
                    }
                  : undefined,
              }}
              demoRequests={{
                data: demoRequestData,
                error: apiEnabled ? demoRequests.error : null,
                isLoading: apiEnabled && demoRequests.isFetching,
                onPageChange: setDemoRequestPage,
                onRetry: () => void demoRequests.refetch(),
                action: apiEnabled
                  ? {
                      error: completeDemoRequest.error,
                      isPending: completeDemoRequest.isPending,
                      onExecute: (request) =>
                        completeDemoRequest.mutateAsync(request.id),
                      onReset: completeDemoRequest.reset,
                    }
                  : undefined,
              }}
              isMockData={!apiEnabled}
            />
          ) : null}
        </div>
      </main>
    </WorkspaceSidebar>
  )
}

function OperationsPanel({
  panel,
}: {
  panel: (typeof operationsPanels)[keyof typeof operationsPanels]
}) {
  return (
    <Card className="surface-motion">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>
              <h2>{panel.title}</h2>
            </CardTitle>
            <CardDescription>{panel.description}</CardDescription>
          </div>
          <Badge variant="outline">Mock data</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.72fr)_minmax(28rem,1.28fr)]">
          <dl className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {panel.metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <div
                  key={metric.label}
                  className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-foreground/10">
                    <Icon aria-hidden="true" className="size-4" />
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {metric.label}
                    </dt>
                    <dd className="text-xl font-semibold tabular-nums">
                      {metric.value}
                    </dd>
                  </div>
                </div>
              )
            })}
          </dl>

          <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
              <div>
                <h3 className="font-medium">Needs attention</h3>
                <p className="text-xs text-muted-foreground">
                  Representative items for layout review
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={panel.href}>
                  {panel.actionLabel}
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </Link>
              </Button>
            </div>
            <ul className="divide-y">
              {panel.items.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.id}
                      </span>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.context}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <Badge
                      variant={
                        item.attention === 'critical'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {item.status}
                    </Badge>
                    <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                      {item.updated}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
