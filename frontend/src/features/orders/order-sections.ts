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

export function canAccessOperationalAttention(capabilities?: SessionCapabilities) {
  return Boolean(capabilities && (capabilities.canOperateCommercialWork || capabilities.canReleasePSeqResults || capabilities.canManagePSeqBilling || capabilities.canManagePSeqCash || capabilities.canReconcilePSeqCash))
}

export function getOrderSections(capabilities?: SessionCapabilities) {
  return orderSections.filter(item => {
    if (!capabilities) return false
    if (item.value === 'trials') return capabilities.canViewTrialProjects
    if (item.value === 'results') return capabilities.canReleasePSeqResults
    if (item.value === 'finance') return capabilities.canManagePSeqBilling || capabilities.canManagePSeqCash || capabilities.canReconcilePSeqCash
    if (item.value === 'attention') return canAccessOperationalAttention(capabilities) || capabilities.canManageOrderConfiguration
    // These commercial queue APIs currently require platform administrator access.
    // Broad operational reading also includes release/finance roles and is insufficient.
    return capabilities.canManageOrderConfiguration
  })
}

export function getOrderLandingSection(capabilities?: SessionCapabilities, requested?: OrderSection): OrderSection | undefined {
  const available = getOrderSections(capabilities)
  if (available.some(item => item.value === requested)) return requested
  const priorities: OrderSection[] = ['intake', 'results', 'finance', 'attention', 'trials', 'reagent', 'assembly', 'integrations']
  return priorities.find(value => available.some(item => item.value === value))
}
