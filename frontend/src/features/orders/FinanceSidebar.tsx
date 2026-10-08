import { useNavigate, useSearch } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { WorkspaceSidebar } from '#/components/WorkspaceSidebar'
import { usePhaenoSession } from '#/features/auth/session-context'
import { getFinanceSections, type FinanceSection } from './finance-sections'

export function FinanceSidebar({ recordSection, children }: { recordSection?: FinanceSection; children: ReactNode }) {
  const { session } = usePhaenoSession()
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  const items = getFinanceSections({
    canBill: Boolean(session?.capabilities.canManagePSeqBilling),
    canManageCash: Boolean(session?.capabilities.canManagePSeqCash),
    canReconcile: Boolean(session?.capabilities.canReconcilePSeqCash),
  })
  const section = items.find(item => item.value === (recordSection ?? search.financeSection))?.value ?? items[0]?.value
  if (!section) return children
  return <WorkspaceSidebar workspaceLabel="Finance" items={items} value={section} onValueChange={value => {
    void navigate({ to: '/finance', search: previous => ({ ...previous, financeSection: value }) })
  }}><div className="pt-6 lg:pt-0">{children}</div></WorkspaceSidebar>
}
