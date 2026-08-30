import { createFileRoute } from '@tanstack/react-router'

import { OrderToCashPage } from '#/features/orders/OrderToCashPage'

export const Route = createFileRoute('/order-to-cash')({
  component: OrderToCashPage,
})
