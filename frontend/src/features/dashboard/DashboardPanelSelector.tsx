import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock3,
  FlaskConical,
  PackageCheck,
  ShoppingCart,
} from 'lucide-react'

import { AccountsDashboardContent } from './AccountsDashboardContent'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '#/components/ui/tabs'

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

const dashboardTabs = [
  {
    value: 'orders',
    label: operationsPanels.orders.tabLabel,
    shortLabel: 'Order Ops',
    count: operationsPanels.orders.tabCount,
    icon: operationsPanels.orders.icon,
  },
  {
    value: 'lab',
    label: operationsPanels.lab.tabLabel,
    shortLabel: 'Lab Ops',
    count: operationsPanels.lab.tabCount,
    icon: operationsPanels.lab.icon,
  },
  {
    value: 'accounts',
    label: 'Accounts',
    shortLabel: 'Accounts',
    count: 21,
    icon: Building2,
  },
] as const

export function DashboardPanelSelector() {
  return (
    <section
      aria-labelledby="dashboard-panels-heading"
      className="soft-enter soft-enter-delay-1"
    >
      <Tabs defaultValue="orders">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="dashboard-panels-heading" className="text-lg font-semibold">
              POMS dashboard
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select the operational or account-management view that needs your
              attention.
            </p>
          </div>
          <TabsList
            aria-label="Dashboard panel selector"
            className="grid w-full grid-cols-3 lg:w-[42rem]"
          >
            {dashboardTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-2 px-3"
                >
                  <Icon aria-hidden="true" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span
                    aria-hidden="true"
                    className="ml-1 hidden rounded-full bg-background/80 px-1.5 py-0.5 text-[0.6875rem] tabular-nums sm:inline-flex"
                  >
                    {tab.count}
                  </span>
                  <span className="sr-only">
                    {tab.count} items needing attention
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {Object.entries(operationsPanels).map(([value, panel]) => (
          <TabsContent key={value} value={value}>
            <OperationsPanel panel={panel} />
          </TabsContent>
        ))}
        <TabsContent value="accounts">
          <AccountsDashboardContent showHeading />
        </TabsContent>
      </Tabs>
    </section>
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
