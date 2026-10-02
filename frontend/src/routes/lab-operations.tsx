import { parseJobListSearch, type JobListSearch } from '#/features/lab-operations/job-deadlines'
import { Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'

import { LabOperationsPage, type LabSection } from '#/features/lab-operations/LabOperationsPage'

import { parseLabReceiptTab, type LabReceiptTab } from '#/features/lab-operations/lab-receipt-tabs'
import { parseLabSection } from '#/features/lab-operations/lab-sections'
import { parseStockKitListSearch, type StockKitListSearch } from '#/features/orders/stock-kits/stock-kit-utils'
import { parseKitRequestSearch, type KitRequestListSearch } from '#/features/orders/kit-requests/kit-request-navigation'
import { parseShipmentHistorySearch, type ShipmentHistorySearch } from '#/features/lab-operations/lab-shipment-history-search'
import { parseAccessionSearch, type AccessionSearch } from '#/features/lab-operations/lab-accession-search'

export const Route = createFileRoute('/lab-operations')({
  validateSearch: (search: Record<string, unknown>): StockKitListSearch & KitRequestListSearch & JobListSearch & ShipmentHistorySearch & AccessionSearch & { section?: LabSection; assemblyTab?: 'runs' | 'cases'; assemblySearch?: string; shipmentId?: string; receiptTab?: LabReceiptTab; labStepSearch?: string; labStepRetired?: boolean; labStepPage?: number; returnKitRequestId?: string } => ({
    assemblyTab: search.assemblyTab === 'cases' ? 'cases' : 'runs',
    assemblySearch: typeof search.assemblySearch === 'string' ? search.assemblySearch.slice(0, 255) : undefined,
    labStepSearch: typeof search.labStepSearch === 'string' ? search.labStepSearch.slice(0, 255) : undefined,
    labStepRetired: search.labStepRetired === true || search.labStepRetired === 'true' ? true : undefined,
    labStepPage: Number.isInteger(Number(search.labStepPage)) && Number(search.labStepPage) > 0 ? Number(search.labStepPage) : undefined,
    ...parseJobListSearch(search),
    ...parseStockKitListSearch(search),
    ...parseKitRequestSearch(search),
    ...parseShipmentHistorySearch(search),
    ...parseAccessionSearch(search),
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
  const { section, shipmentId, receiptTab } = Route.useSearch()
  const activeSection = receiptTab === 'standard-kits' && (!section || section === 'receipt')
    ? 'transportation-kits'
    : (receiptTab === 'kit-requests' || receiptTab === 'return-kits') && section === 'transportation-kits'
      ? 'receipt'
      : section ?? 'receipt'
  return isChild
    ? <Outlet />
    : (
        <LabOperationsPage
          section={activeSection}
          shipmentId={shipmentId}
          receiptTab={receiptTab}
          onReceiptTabChange={nextTab => void navigate({
            to: '/lab-operations',
            search: previous => ({ ...previous, section: nextTab === 'standard-kits' ? 'transportation-kits' : 'receipt', receiptTab: nextTab }),
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
