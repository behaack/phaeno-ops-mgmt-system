import { useQuery } from '@tanstack/react-query'

import { getOrderErrorMessage, getPlatformLabIntake } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { LabWorkOrderPage } from '#/features/lab-operations/LabWorkOrderPage'

export function OrderIntakePage({ orderId }: { orderId: string }) {
  const intake = useQuery({
    queryKey: ['platform-lab-intake', orderId],
    queryFn: () => getPlatformLabIntake(orderId),
  })

  if (intake.isLoading) {
    return <main className="page-wrap px-4 py-8"><p role="status">Loading order intake…</p></main>
  }
  if (intake.error || !intake.data) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Order intake could not be loaded</AlertTitle>
          <AlertDescription>
            {getOrderErrorMessage(intake.error, 'Return to Order operations and try again.')}
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  return <LabWorkOrderPage workOrderId={intake.data.workOrderId} mode="order-intake" />
}
