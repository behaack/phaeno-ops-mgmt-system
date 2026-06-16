import {
  Building2,
  Clock3,
  FileCheck2,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from 'lucide-react'

export const metrics = [
  {
    label: 'Organizations',
    value: '42',
    trend: '+6 this month',
    icon: Building2,
  },
  {
    label: 'Active users',
    value: '1,284',
    trend: '97% 2FA ready',
    icon: Users,
  },
  {
    label: 'Pending invites',
    value: '18',
    trend: '4 expire soon',
    icon: Clock3,
  },
  {
    label: 'Partner links',
    value: '12',
    trend: '3 awaiting review',
    icon: ShieldCheck,
  },
] as const

export const organizationHealth = [
  {
    name: 'Northline Labs',
    type: 'Customer',
    users: 86,
    owner: 'Priya Shah',
    status: 'Ready',
    review: 'Partner assignment due Jun 20',
  },
  {
    name: 'Valley Diagnostics',
    type: 'Customer',
    users: 42,
    owner: 'Marcus Chen',
    status: 'Review',
    review: 'Security contact incomplete',
  },
  {
    name: 'Clearpath Imaging',
    type: 'Partner',
    users: 17,
    owner: 'Elena Torres',
    status: 'Ready',
    review: 'Scoped to 4 customer tenants',
  },
] as const

export const accessQueues = {
  onboarding: [
    'Review new customer organization request from Northline Labs',
    'Approve Phaeno admin invite for Morgan Ellis',
    'Confirm partner access for Valley Diagnostics',
  ],
  security: [
    'Validate email-based 2FA fallback policy',
    'Rotate expired invite token batch',
    'Audit partner users assigned to customer organizations',
  ],
} as const

export const tenantTypes = [
  {
    label: 'Phaeno',
    description: 'Admin users manage organizations and partner assignments.',
  },
  {
    label: 'Customers',
    description: 'Organization users operate within their own tenant boundary.',
  },
  {
    label: 'Partners',
    description: 'External users get scoped access to assigned customers.',
  },
] as const

export const activityFeed = [
  {
    actor: 'Morgan Ellis',
    action: 'accepted an admin invitation',
    target: 'Phaeno',
    time: '12 min ago',
    icon: UserRoundCheck,
  },
  {
    actor: 'System',
    action: 'flagged an expiring partner link',
    target: 'Valley Diagnostics',
    time: '38 min ago',
    icon: ShieldCheck,
  },
  {
    actor: 'Avery Patel',
    action: 'uploaded compliance documents',
    target: 'Northline Labs',
    time: '1 hr ago',
    icon: FileCheck2,
  },
] as const

export const mockInvites = [
  {
    email: 'jordan.lee@northline.example',
    role: 'Organization Admin',
    organization: 'Northline Labs',
    state: 'Draft',
  },
  {
    email: 'sam.rivera@clearpath.example',
    role: 'Member',
    organization: 'Clearpath Imaging',
    state: 'Ready to send',
  },
] as const
