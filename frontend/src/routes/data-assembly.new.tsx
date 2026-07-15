import { createFileRoute } from '@tanstack/react-router'

import { DataAssemblyCreatePage } from '#/features/orders/DataAssemblyCreatePage'

export const Route = createFileRoute('/data-assembly/new')({ component: DataAssemblyCreatePage })
