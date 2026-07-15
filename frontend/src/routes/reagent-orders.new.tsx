import { createFileRoute } from '@tanstack/react-router'

import { ReagentOrderCreatePage } from '#/features/orders/ReagentOrderCreatePage'

export const Route = createFileRoute('/reagent-orders/new')({ component: ReagentOrderCreatePage })
