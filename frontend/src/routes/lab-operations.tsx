import { Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'

import { LabOperationsPage, type LabSection } from '#/features/lab-operations/LabOperationsPage'

import { parseLabReceiptTab, type LabReceiptTab } from '#/features/lab-operations/lab-receipt-tabs'
import { parseLabSection } from '#/features/lab-operations/lab-sections'
import { parseStockKitListSearch, type StockKitListSearch } from '#/features/orders/stock-kits/stock-kit-utils'
import { parseKitRequestSearch, type KitRequestListSearch } from '#/features/orders/kit-requests/kit-request-navigation'

export const Route = createFileRoute('/lab-operations')({
  validateSearch: (search: Record<string, unknown>): StockKitListSearch & KitRequestListSearch & { section?: LabSection; shipmentId?: string; receiptTab?: LabReceiptTab; returnKitRequestId?: string } => ({
    ...parseStockKitListSearch(search),
    ...parseKitRequestSearch(search),
    shipmentId: typeof search.shipmentId === 'string' && /^[0-9a-f-]{36}$/i.test(search.shipmentId) ? search.shipmentId : undefined,
    section: parseLabSection(search.section),
    receiptTab: parseLabReceiptTab(search.receiptTab),
    returnKitRequestId: typeof search.returnKitRequestId === 'string' && /^[0-9a-f-]{36}$/i.test(search.returnKitRequestId) ? search.returnKitRequestId : undefined,
  }),
  component: LabOperationsRoute,
})

function LabOperationsRoute() {
  const navigate = useNavigate()
  const isChild = useRouterState({ select: (state) => state.location.pathname !== '/lab-operations' })
  const legacyTab = useRouterState({ select: state => state.location.hash === 'standard-kits' ? 'standard-kits' as const : state.location.hash === 'transportation-kit-requests' ? 'kit-requests' as const : undefined })
  const { section, shipmentId, receiptTab } = Route.useSearch()
  return isChild
    ? <Outlet />
    : (
        <LabOperationsPage
          section={section ?? 'receipt'}
          shipmentId={shipmentId}
          receiptTab={receiptTab ?? legacyTab}
          onReceiptTabChange={nextTab => void navigate({
            to: '/lab-operations',
            search: previous => ({ ...previous, section: 'receipt', receiptTab: nextTab }),
            resetScroll: false,
            hash: '',
          })}
          onSectionChange={(nextSection) => void navigate({
            to: '/lab-operations',
            search: { section: nextSection },
            replace: true,
          })}
        />
      )
}
