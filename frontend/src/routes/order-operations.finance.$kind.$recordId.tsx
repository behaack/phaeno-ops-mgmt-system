import { createFileRoute } from '@tanstack/react-router'
import { FinanceRecordPage, type FinanceRecord } from '#/features/orders/FinanceOperationsPanel'
export const Route = createFileRoute('/order-operations/finance/$kind/$recordId')({ component: FinanceRecordRoute })
function FinanceRecordRoute() {
  const { kind, recordId } = Route.useParams()
  if (!['invoice', 'receipt', 'customer', 'reconciliation'].includes(kind)) return <main className="page-wrap p-8">Finance record unavailable.</main>
  return <FinanceRecordPage record={{ kind: kind as FinanceRecord['kind'], id: recordId }} />
}
