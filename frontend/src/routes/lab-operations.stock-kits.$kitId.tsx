import { createFileRoute } from '@tanstack/react-router'
import { StandardKitDetailPage } from '#/features/orders/stock-kits/StandardKitDetailPage'

export const Route = createFileRoute('/lab-operations/stock-kits/$kitId')({ component: StockKitRoute })
function StockKitRoute() { const { kitId } = Route.useParams(); return <StandardKitDetailPage kitId={kitId} /> }
