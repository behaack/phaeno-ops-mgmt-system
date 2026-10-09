import { parseSpecimenSearch, type SpecimenSearch } from '#/features/lab-operations/specimen-navigation'
import { parseJobListSearch, type JobListSearch } from '#/features/lab-operations/job-deadlines'
import { Navigate, Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { usePhaenoSession } from '#/features/auth/session-context'

import { LabOperationsPage, type LabSection } from '#/features/lab-operations/LabOperationsPage'

import { parseLabReceiptTab, type LabReceiptTab } from '#/features/lab-operations/lab-receipt-tabs'
import { parseLabSection, resolveLabWorkspaceSection } from '#/features/lab-operations/lab-sections'
import { parseStockKitListSearch, type StockKitListSearch } from '#/features/orders/stock-kits/stock-kit-utils'
import { parseKitRequestSearch, type KitRequestListSearch } from '#/features/orders/kit-requests/kit-request-navigation'
import { parseShipmentHistorySearch, type ShipmentHistorySearch } from '#/features/lab-operations/lab-shipment-history-search'
import { parseAccessionSearch, type AccessionSearch } from '#/features/lab-operations/lab-accession-search'

export const Route = createFileRoute('/lab-operations')({
  validateSearch: (search: Record<string, unknown>): SpecimenSearch & StockKitListSearch & KitRequestListSearch & JobListSearch & ShipmentHistorySearch & AccessionSearch & { section?: LabSection; resultState?: string; assemblyTab?: 'inputs' | 'jobs'; assemblySearch?: string; shipmentId?: string; receiptTab?: LabReceiptTab; labStepSearch?: string; labStepRetired?: boolean; labStepPage?: number; returnKitRequestId?: string } => ({
    resultState: typeof search.resultState === 'string' ? search.resultState : undefined,
    assemblyTab: search.assemblyTab === 'jobs' ? 'jobs' : 'inputs',
    assemblySearch: typeof search.assemblySearch === 'string' ? search.assemblySearch.slice(0, 255) : undefined,
    labStepSearch: typeof search.labStepSearch === 'string' ? search.labStepSearch.slice(0, 255) : undefined,
    labStepRetired: search.labStepRetired === true || search.labStepRetired === 'true' ? true : undefined,
    labStepPage: Number.isInteger(Number(search.labStepPage)) && Number(search.labStepPage) > 0 ? Number(search.labStepPage) : undefined,
    ...parseJobListSearch(search),
    ...parseSpecimenSearch(search),
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
  const { session } = usePhaenoSession()
  const activeSection = resolveLabWorkspaceSection(section, receiptTab)
  if (!isChild && (section === 'release' || (!session?.capabilities.canManageLabOperations && session?.capabilities.canReleasePSeqResults))) return <Navigate to="/lab-operations/result-release" replace />
  if (!isChild && (section || receiptTab) && activeSection !== section) return <Navigate to="/lab-operations" search={previous => ({ ...previous, section: activeSection, receiptTab: activeSection === 'kit-requests' ? undefined : receiptTab })} replace />
  return isChild
    ? <Outlet />
    : (
        <LabOperationsPage
          section={activeSection}
          shipmentId={shipmentId}
          receiptTab={receiptTab}
          onReceiptTabChange={nextTab => void navigate({
            to: '/lab-operations',
            search: previous => ({ ...previous, section: 'receipt', receiptTab: nextTab }),
            resetScroll: false,
            hash: '',
          })}
          onSectionChange={(nextSection) => nextSection === 'release' ? void navigate({ to: '/lab-operations/result-release' }) : void navigate({
            to: '/lab-operations',
            search: { section: nextSection },
            replace: true,
          })}
        />
      )
}
