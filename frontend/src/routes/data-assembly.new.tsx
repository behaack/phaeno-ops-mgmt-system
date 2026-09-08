import { createFileRoute } from '@tanstack/react-router'

import { DataAssemblyCreatePage } from '#/features/orders/DataAssemblyCreatePage'
import { z } from 'zod'

export const Route = createFileRoute('/data-assembly/new')({
  validateSearch: (search: Record<string, unknown>) => ({ kitOrderId: z.string().uuid().optional().catch(undefined).parse(search.kitOrderId), kitCaseId: z.string().uuid().optional().catch(undefined).parse(search.kitCaseId) }),
  component: DataAssemblyCreateRoute,
})

function DataAssemblyCreateRoute() { return <DataAssemblyCreatePage {...Route.useSearch()} /> }
