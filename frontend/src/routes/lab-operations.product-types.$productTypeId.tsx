import { createFileRoute } from '@tanstack/react-router'
import { ProductTypesPage } from '#/features/lab-operations/ProductTypesPage'
export const Route = createFileRoute('/lab-operations/product-types/$productTypeId')({ component: ProductTypeRoute })
function ProductTypeRoute() { const { productTypeId } = Route.useParams(); return <ProductTypesPage key={productTypeId} productTypeId={productTypeId} /> }
