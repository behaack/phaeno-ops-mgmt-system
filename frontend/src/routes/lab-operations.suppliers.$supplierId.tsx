import { createFileRoute } from '@tanstack/react-router'
import { SupplierCatalogPage } from '#/features/lab-operations/SupplierCatalogPage'

export const Route = createFileRoute('/lab-operations/suppliers/$supplierId')({ component: SupplierRoute })
function SupplierRoute() { const { supplierId } = Route.useParams(); return <SupplierCatalogPage key={supplierId} supplierId={supplierId} /> }
