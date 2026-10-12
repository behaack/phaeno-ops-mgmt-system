import { CustomerText } from '#/features/customer-i18n/customer-text'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { getLabOrder, getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { usePhaenoSession } from '#/features/auth/session-context'
import { LabJobDetailsDialog } from '#/features/orders/LabJobDetailsDialog'

export const Route = createFileRoute('/lab-services/$orderId/edit')({ component: LabServiceEditRoute })

function LabServiceEditRoute() {
  const { orderId } = Route.useParams()
  const navigate = useNavigate()
  const { authProvider, session } = usePhaenoSession()
  const apiEnabled = Boolean(session?.capabilities.canViewLabServiceOrders) && authProvider !== 'mock'
  const order = useQuery({
    queryKey: ['lab-service-order', orderId],
    queryFn: () => getLabOrder(orderId),
    enabled: apiEnabled,
  })

  if (!apiEnabled) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle><CustomerText message="m_e8abf9efaf0c" /></AlertTitle><AlertDescription><CustomerText message="m_e81345ae1936" /></AlertDescription></Alert></main>
  if (order.isLoading) return <main className="page-wrap px-4 py-8"><p role="status"><CustomerText message="m_23c25897615e" /></p></main>
  if (order.error || !order.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle><CustomerText message="m_c3a22f244305" /></AlertTitle><AlertDescription>{getOrderErrorMessage(order.error, 'Return to the request and try again.')}</AlertDescription></Alert></main>

  return (
    <LabJobDetailsDialog
      open
      order={order.data}
      onOpenChange={(open) => {
        if (!open) void navigate({ to: '/lab-services/$orderId', params: { orderId }, search: previous => previous })
      }}
      onSaved={(savedOrder) => navigate({
        to: '/lab-services/$orderId',
        params: { orderId: savedOrder.id },
        search: previous => previous,
      })}
    />
  )
}
