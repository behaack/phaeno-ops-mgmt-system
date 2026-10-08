import { useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { WorkspaceSidebar } from '#/components/WorkspaceSidebar'
import { usePhaenoSession } from '#/features/auth/session-context'
import { getOrderSections, type OrderSection } from './order-sections'
import { serviceSectionRoute, serviceSectionSearch } from './service-workspaces'

export function OrderOperationsSidebar({ section, onSectionChange, children }: {
  section: OrderSection
  onSectionChange?: (section: OrderSection) => void
  children: ReactNode
}) {
  const { session } = usePhaenoSession()
  const navigate = useNavigate()
  return <WorkspaceSidebar
    workspaceLabel="Order operations"
    items={getOrderSections(session?.capabilities).filter(item => ['intake', 'trials', 'reagent', 'assembly'].includes(item.value))}
    value={section}
    onValueChange={value => {
      if (onSectionChange) onSectionChange(value)
      else void navigate({ to: serviceSectionRoute(value), search: serviceSectionSearch(value) })
    }}
  ><div className="pt-6 lg:pt-0">{children}</div></WorkspaceSidebar>
}
