import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { parseOrderSection, type OrderSection } from '#/features/orders/order-sections'
import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'

export const Route = createFileRoute('/order-operations')({ validateSearch: (search: Record<string, unknown>): { orderSection?: OrderSection; intakeView?: 'active' | 'holds' | 'all'; intakeSearch?: string; intakePage?: number; financeSection?: string; financeCustomer?: string; resultState?: string; queueSearch?: string; queueOrganization?: string; queueStatus?: string; queueView?: 'all' | 'mine' | 'unassigned' | 'overdue' | 'holds'; queueFrom?: string; queueTo?: string; queuePage?: number } => ({
  orderSection: parseOrderSection(search.orderSection),
  intakeView: search.intakeView === 'all' || search.intakeView === 'holds' ? search.intakeView : undefined,
  intakeSearch: typeof search.intakeSearch === 'string' ? search.intakeSearch : undefined,
  intakePage: Number.isSafeInteger(Number(search.intakePage)) && Number(search.intakePage) > 0 ? Number(search.intakePage) : 1,
  financeSection: typeof search.financeSection === 'string' ? search.financeSection : undefined,
  financeCustomer: typeof search.financeCustomer === 'string' ? search.financeCustomer : undefined,
  queueSearch: typeof search.queueSearch === 'string' ? search.queueSearch : undefined,
  queueOrganization: typeof search.queueOrganization === 'string' ? search.queueOrganization : undefined,
  queueStatus: typeof search.queueStatus === 'string' ? search.queueStatus : undefined,
  queueView: ['all', 'mine', 'unassigned', 'overdue', 'holds'].includes(String(search.queueView)) ? search.queueView as 'all' | 'mine' | 'unassigned' | 'overdue' | 'holds' : undefined,
  queueFrom: parseQueueDate(search.queueFrom),
  queueTo: parseQueueDate(search.queueTo, true),
  queuePage: Number.isSafeInteger(Number(search.queuePage)) && Number(search.queuePage) > 0 ? Number(search.queuePage) : 1,
  resultState: typeof search.resultState === 'string' ? search.resultState : undefined,
}), component: OrderOperationsRoute })

function OrderOperationsRoute() {
  const isChildRoute = useRouterState({ select: (state) => state.location.pathname !== '/order-operations' })
  const { orderSection } = Route.useSearch()
  return isChildRoute ? <Outlet /> : <OrderOperationsPage initialSection={orderSection} />
}

function parseQueueDate(value: unknown, needsFollowingDay = false) {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined
  // The through-date is sent as an exclusive boundary within the API's date range.
  if (needsFollowingDay && value === '9999-12-31') return undefined
  return value
}
