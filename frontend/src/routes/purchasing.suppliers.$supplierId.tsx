import { createFileRoute } from '@tanstack/react-router'
import { SupplierCatalogPage } from '#/features/lab-operations/SupplierCatalogPage'

export const Route = createFileRoute('/purchasing/suppliers/$supplierId')({ component: SupplierRoute })
function SupplierRoute() { const { supplierId } = Route.useParams(); return <SupplierCatalogPage key={supplierId} supplierId={supplierId} /> }
