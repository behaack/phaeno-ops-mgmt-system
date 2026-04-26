import { Building2, Clock3, ShieldCheck, Users } from 'lucide-react'

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
