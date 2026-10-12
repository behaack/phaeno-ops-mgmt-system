import { parseWorkSearch } from '#/features/work-attention/work-search'
import { createFileRoute } from '@tanstack/react-router'
import { WorkDashboard } from '#/features/work-attention/WorkDashboard'
export const Route = createFileRoute('/dashboard/attention')({ validateSearch: parseWorkSearch, component: () => <WorkDashboard full /> })
