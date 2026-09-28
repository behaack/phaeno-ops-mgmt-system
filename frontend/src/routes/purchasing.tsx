import { Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { PurchasingWorkspace, parsePurchasingSection, type PurchasingSection } from '#/features/lab-operations/PurchasingWorkspace'

export const Route = createFileRoute('/purchasing')({
  validateSearch: (search: Record<string, unknown>): { section?: PurchasingSection; productTab?: 'products' | 'product-types'; supplierSearch?: string; supplierInactive?: boolean; productSearch?: string; productInactive?: boolean; productTypeFilter?: string; productTypeSearch?: string; productTypeInactive?: boolean } => ({
    section: parsePurchasingSection(search.section),
    productTab: search.productTab === 'product-types' ? 'product-types' : undefined,
    supplierSearch: typeof search.supplierSearch === 'string' ? search.supplierSearch.slice(0, 255) : undefined,
    supplierInactive: search.supplierInactive === true || search.supplierInactive === 'true' ? true : undefined,
    productSearch: typeof search.productSearch === 'string' ? search.productSearch.slice(0, 255) : undefined,
    productInactive: search.productInactive === true || search.productInactive === 'true' ? true : undefined,
    productTypeFilter: typeof search.productTypeFilter === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search.productTypeFilter) ? search.productTypeFilter.toLowerCase() : undefined,
    productTypeSearch: typeof search.productTypeSearch === 'string' ? search.productTypeSearch.slice(0, 255) : undefined,
    productTypeInactive: search.productTypeInactive === true || search.productTypeInactive === 'true' ? true : undefined,
  }),
  component: PurchasingRoute,
})

function PurchasingRoute() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: state => state.location.pathname })
  const { section, productTab } = Route.useSearch()
  const isChild = pathname !== '/purchasing'
  const activeSection = isChild
    ? pathname.startsWith('/purchasing/materials/') ? 'materials'
      : pathname.startsWith('/purchasing/suppliers/') ? 'suppliers' : 'products'
    : section ?? 'suppliers'
  return <PurchasingWorkspace section={activeSection} onSectionChange={next => void navigate({ to: '/purchasing', search: { section: next }, resetScroll: false })} productTab={productTab} onProductTabChange={next => void navigate({ to: '/purchasing', search: previous => ({ ...previous, section: 'products', productTab: next === 'product-types' ? next : undefined }), resetScroll: false })}>
    {isChild ? <Outlet /> : undefined}
  </PurchasingWorkspace>
}
