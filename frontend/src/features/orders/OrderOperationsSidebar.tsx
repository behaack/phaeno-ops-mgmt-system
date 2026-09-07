import { useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { WorkspaceSidebar } from '#/components/WorkspaceSidebar'
import { usePhaenoSession } from '#/features/auth/session-context'
import { getOrderSections, type OrderSection } from './order-sections'

export function OrderOperationsSidebar({ section, onSectionChange, children }: {
  section: OrderSection
  onSectionChange?: (section: OrderSection) => void
  children: ReactNode
}) {
  const { session } = usePhaenoSession()
  const navigate = useNavigate()
  return <WorkspaceSidebar
    workspaceLabel="Order operations"
    items={getOrderSections(session?.capabilities)}
    value={section}
    onValueChange={value => {
      if (value === 'trials') void navigate({ to: '/trial-projects' })
      else if (onSectionChange) onSectionChange(value)
      else void navigate({ to: '/order-operations', search: previous => ({ ...previous, orderSection: value }) })
    }}
  ><div className="pt-6 lg:pt-0">{children}</div></WorkspaceSidebar>
}
