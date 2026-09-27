import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/lab-operations/suppliers/$supplierId')({ component: SupplierRoute })
function SupplierRoute() { const { supplierId } = Route.useParams(); return <Navigate to="/purchasing/suppliers/$supplierId" params={{ supplierId }} replace /> }
