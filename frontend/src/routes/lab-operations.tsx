import { parseJobListSearch, type JobListSearch } from '#/features/lab-operations/job-deadlines'
import { Navigate, Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'

import { LabOperationsPage, type LabSection } from '#/features/lab-operations/LabOperationsPage'

import { parseLabReceiptTab, type LabReceiptTab } from '#/features/lab-operations/lab-receipt-tabs'
import { parseLabConfigurationTab, type LabConfigurationTab } from '#/features/lab-operations/lab-configuration-tabs'
import { parseSupplierCatalogTab, type SupplierCatalogTab } from '#/features/lab-operations/supplier-catalog-tabs'
import { parseLabSection } from '#/features/lab-operations/lab-sections'
import { parseStockKitListSearch, type StockKitListSearch } from '#/features/orders/stock-kits/stock-kit-utils'
import { parseKitRequestSearch, type KitRequestListSearch } from '#/features/orders/kit-requests/kit-request-navigation'

export const Route = createFileRoute('/lab-operations')({
  validateSearch: (search: Record<string, unknown>): StockKitListSearch & KitRequestListSearch & JobListSearch & { section?: LabSection; assemblyTab?: 'runs' | 'cases'; assemblySearch?: string; supplierTab?: SupplierCatalogTab; shipmentId?: string; receiptTab?: LabReceiptTab; configurationTab?: LabConfigurationTab; labStepSearch?: string; labStepRetired?: boolean; labStepPage?: number; returnKitRequestId?: string; supplierSearch?: string; supplierInactive?: boolean; productTypeSearch?: string; productTypeInactive?: boolean } => ({
    assemblyTab: search.assemblyTab === 'cases' ? 'cases' : 'runs',
    assemblySearch: typeof search.assemblySearch === 'string' ? search.assemblySearch.slice(0, 255) : undefined,
    labStepSearch: typeof search.labStepSearch === 'string' ? search.labStepSearch.slice(0, 255) : undefined,
    labStepRetired: search.labStepRetired === true || search.labStepRetired === 'true' ? true : undefined,
    labStepPage: Number.isInteger(Number(search.labStepPage)) && Number(search.labStepPage) > 0 ? Number(search.labStepPage) : undefined,
    ...parseJobListSearch(search),
    ...parseStockKitListSearch(search),
    ...parseKitRequestSearch(search),
    shipmentId: typeof search.shipmentId === 'string' && /^[0-9a-f-]{36}$/i.test(search.shipmentId) ? search.shipmentId : undefined,
    productTypeSearch: typeof search.productTypeSearch === 'string' ? search.productTypeSearch.slice(0, 255) : undefined,
    productTypeInactive: search.productTypeInactive === true || search.productTypeInactive === 'true' ? true : undefined,
    supplierSearch: typeof search.supplierSearch === 'string' ? search.supplierSearch.slice(0, 255) : undefined,
    supplierInactive: search.supplierInactive === true || search.supplierInactive === 'true' ? true : undefined,
    section: parseLabSection(search.section),
    supplierTab: parseSupplierCatalogTab(search.supplierTab) ?? (search.section === 'product-types' ? 'product-types' : undefined),
    receiptTab: parseLabReceiptTab(search.receiptTab),
    configurationTab: parseLabConfigurationTab(search.configurationTab),
    returnKitRequestId: typeof search.returnKitRequestId === 'string' && /^[0-9a-f-]{36}$/i.test(search.returnKitRequestId) ? search.returnKitRequestId : undefined,
  }),
  component: LabOperationsRoute,
})

function LabOperationsRoute() {
  const navigate = useNavigate()
  const isChild = useRouterState({ select: (state) => state.location.pathname !== '/lab-operations' })
  const legacyTab = useRouterState({ select: state => state.location.hash === 'standard-kits' ? 'standard-kits' as const : state.location.hash === 'transportation-kit-requests' ? 'kit-requests' as const : undefined })
  const { section, shipmentId, receiptTab, configurationTab, supplierTab, labStepSearch, labStepRetired, labStepPage } = Route.useSearch()
  if (!isChild && section === 'protocols') return <Navigate to="/lab-configuration" search={{ configurationTab: configurationTab ?? 'steps', labStepSearch, labStepRetired, labStepPage }} replace />
  const activeTab = receiptTab ?? legacyTab
  if (!isChild && (section === 'receipt' || !section) && (activeTab === 'standard-kits' || activeTab === 'kit-requests' || activeTab === 'return-kits'))
    return <Navigate to="/lab-operations" search={previous => ({ ...previous, section: 'transportation-kits', receiptTab: activeTab })} hash="" replace />
  return isChild
    ? <Outlet />
    : (
        <LabOperationsPage
          section={section ?? 'receipt'}
          shipmentId={shipmentId}
          receiptTab={activeTab}
          configurationTab={configurationTab ?? 'steps'}
          supplierTab={supplierTab ?? 'suppliers'}
          onSupplierTabChange={nextTab => void navigate({
            to: '/lab-operations',
            search: previous => ({ ...previous, section: 'suppliers', supplierTab: nextTab }),
            resetScroll: false,
          })}
          onConfigurationTabChange={nextTab => void navigate({
            to: '/lab-operations',
            search: { section: 'protocols', configurationTab: nextTab },
            resetScroll: false,
          })}
          onReceiptTabChange={nextTab => void navigate({
            to: '/lab-operations',
            search: previous => ({ ...previous, section: ['standard-kits', 'kit-requests', 'return-kits'].includes(nextTab) ? 'transportation-kits' : 'receipt', receiptTab: nextTab }),
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
