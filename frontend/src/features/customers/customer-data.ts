export const customerRows = [
  {
    id: 'northline-labs',
    name: 'Northline Labs',
    status: 'Active',
    users: 86,
    partner: 'Clearpath Imaging',
    nextStep: 'Partner assignment review',
    contact: 'Priya Shah',
    securityContact: 'security@northline.example',
    lastReview: 'Jun 12, 2026',
  },
  {
    id: 'valley-diagnostics',
    name: 'Valley Diagnostics',
    status: 'Review',
    users: 42,
    partner: 'Unassigned',
    nextStep: 'Complete security contact',
    contact: 'Marcus Chen',
    securityContact: 'Not assigned',
    lastReview: 'Jun 9, 2026',
  },
  {
    id: 'summit-pathology',
    name: 'Summit Pathology',
    status: 'Active',
    users: 23,
    partner: 'Clearpath Imaging',
    nextStep: 'Quarterly access audit',
    contact: 'Elena Torres',
    securityContact: 'compliance@summit.example',
    lastReview: 'May 28, 2026',
  },
] as const

export type CustomerRow = (typeof customerRows)[number]

export function getCustomerById(customerId: string) {
  return customerRows.find((customer) => customer.id === customerId) ?? null
}
