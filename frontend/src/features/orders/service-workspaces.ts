import type { SessionCapabilities } from '#/api/session'
import { getOrderSections, type OrderSection } from './order-sections'

export type ServiceWorkspace = 'lab-services' | 'partner-services' | 'finance' | 'integrations' | 'attention'

export const serviceWorkspaces = {
  'lab-services': { title: 'Order operations', description: 'Lab service Order intake and no-charge Trial projects.', sections: ['intake', 'trials'] },
  'partner-services': { title: 'Order operations', description: 'Commercial PSeq kit orders and Data assembly cases.', sections: ['reagent', 'assembly'] },
  finance: { title: 'Finance', description: 'Invoices, receipts, allocations and reconciliation.', sections: ['finance'] },
  integrations: { title: 'Legacy integrations', description: 'Recover legacy connector messages and delivery failures.', sections: ['integrations'] },
  attention: { title: 'Needs attention', description: 'Assign and resolve blockers across service workflows.', sections: ['attention'] },
} satisfies Record<ServiceWorkspace, { title: string; description: string; sections: OrderSection[] }>

export function getServiceWorkspaceSections(workspace: ServiceWorkspace, capabilities?: SessionCapabilities) {
  const values: readonly OrderSection[] = serviceWorkspaces[workspace].sections
  return getOrderSections(capabilities).filter(item => values.includes(item.value))
}

export function serviceSectionRoute(section: OrderSection) {
  switch (section) {
    case 'trials': return '/order-operations/lab-services/trials'
    case 'reagent': case 'assembly': return '/order-operations/partner-services'
    case 'finance': return '/finance'
    case 'integrations': return '/legacy-integrations'
    case 'attention': return '/dashboard/attention'
    case 'results': return '/lab-operations/result-release'
    default: return '/order-operations/lab-services'
  }
}

export function serviceSectionSearch(section: OrderSection) {
  return { section: section === 'reagent' ? 'kits' as const : section === 'assembly' ? 'assembly' as const : undefined }
}

export function commercialRecordRoute(workflow: 'lab' | 'reagent' | 'assembly') {
  return workflow === 'lab' ? '/order-operations/lab-services/orders/$orderId' : workflow === 'reagent' ? '/order-operations/partner-services/pseq-kits/$orderId' : '/order-operations/partner-services/data-assembly/$orderId'
}
