import { createFileRoute } from '@tanstack/react-router'
import { SupplierCatalogPage, type SupplierDetailTab } from '#/features/lab-operations/SupplierCatalogPage'

export const Route = createFileRoute('/purchasing/suppliers/$supplierId')({
  validateSearch: (search: Record<string, unknown>): { supplierTab?: SupplierDetailTab } => ({
    supplierTab: search.supplierTab === 'addresses' ? 'addresses' : undefined,
  }),
  component: SupplierRoute,
})

function SupplierRoute() {
  const { supplierId } = Route.useParams()
  const { supplierTab } = Route.useSearch()
  const navigate = Route.useNavigate()
  return <SupplierCatalogPage key={supplierId} supplierId={supplierId} tab={supplierTab ?? 'products'} onTabChange={next => void navigate({
    search: previous => ({ ...previous, supplierTab: next === 'addresses' ? next : undefined }),
    replace: true,
    resetScroll: false,
  })} />
}
