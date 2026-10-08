import { createFileRoute } from '@tanstack/react-router'
import { ProductCatalogPage } from '#/features/lab-operations/ProductCatalogPage'

export const Route = createFileRoute('/purchasing/products/$supplierId/$productId')({ component: ProductRoute })
function ProductRoute() { const { supplierId, productId } = Route.useParams(); return <ProductCatalogPage key={productId} supplierId={supplierId} productId={productId} /> }
