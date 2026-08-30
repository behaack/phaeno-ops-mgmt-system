import { useQuery } from '@tanstack/react-query'
import { Navigate } from '@tanstack/react-router'

import { getLabOperationsError, getLabWorkOrderByCommercialOrder } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'

export function OrderIntakePage({ orderId }: { orderId: string }) {
  const intake = useQuery({
    queryKey: ['lab-work-by-commercial-order', orderId],
    queryFn: () => getLabWorkOrderByCommercialOrder(orderId),
  })

  if (intake.isLoading) {
    return <main className="page-wrap px-4 py-8"><p role="status">Opening Lab work…</p></main>
  }
  if (intake.error || !intake.data) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Lab work could not be opened</AlertTitle>
          <AlertDescription>
            {getLabOperationsError(intake.error, 'Return to Lab operations and try again.')}
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  return <Navigate to="/lab-operations/$workOrderId" params={{ workOrderId: intake.data.id }} search={{ section: undefined }} replace />
}
