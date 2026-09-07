import { Boxes, CircleDollarSign, ClipboardCheck, FileCheck2, FlaskConical, ListChecks, PlugZap, Workflow } from 'lucide-react'
import type { SessionCapabilities } from '#/api/session'
import type { WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'

export type OrderSection = 'intake' | 'trials' | 'reagent' | 'assembly' | 'attention' | 'results' | 'finance' | 'integrations'

const orderSections: ReadonlyArray<WorkspaceSidebarItem<OrderSection>> = [
  { value: 'intake', label: 'Order intake', description: 'Commercial intake, pricing, and quotes', icon: ClipboardCheck },
  { value: 'trials', label: 'Trial projects', description: 'No-charge PSeq evaluations', icon: FlaskConical },
  { value: 'reagent', label: 'PSeq kits', description: 'Commercial status and Lab fulfillment', icon: Boxes },
  { value: 'assembly', label: 'Assembly', description: 'Commercial status and Lab processing', icon: Workflow },
  { value: 'attention', label: 'Attention', description: 'Owned cross-workflow blockers and failures', icon: ListChecks },
  { value: 'results', label: 'Result release', description: 'Governed, sample-level PSeq delivery', icon: FileCheck2 },
  { value: 'finance', label: 'Finance', description: 'Invoices, receipts, allocations, and reconciliation', icon: CircleDollarSign },
  { value: 'integrations', label: 'Legacy integrations', description: 'Legacy connector and notification recovery', icon: PlugZap },
]

export function parseOrderSection(value: unknown): OrderSection | undefined {
  if (value === 'staging') return 'intake'
  return orderSections.find(item => item.value === value)?.value
}

export function getOrderSections(capabilities?: SessionCapabilities) {
  return orderSections.filter(item => {
    if (!capabilities) return false
    if (item.value === 'trials') return capabilities.canViewTrialProjects
    if (item.value === 'results') return capabilities.canReleasePSeqResults
    if (item.value === 'finance') return capabilities.canManagePSeqBilling || capabilities.canManagePSeqCash || capabilities.canReconcilePSeqCash
    if (item.value === 'attention') return capabilities.canOperateCommercialWork || capabilities.canReleasePSeqResults || capabilities.canManagePSeqBilling || capabilities.canManagePSeqCash || capabilities.canReconcilePSeqCash
    return capabilities.canViewAllOperationalOrders
  })
}
