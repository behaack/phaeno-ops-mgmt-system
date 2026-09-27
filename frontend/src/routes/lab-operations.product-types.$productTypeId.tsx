import { Navigate, createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/lab-operations/product-types/$productTypeId')({ component: ProductTypeRoute })
function ProductTypeRoute() { const { productTypeId } = Route.useParams(); return <Navigate to="/purchasing/product-types/$productTypeId" params={{ productTypeId }} replace /> }
