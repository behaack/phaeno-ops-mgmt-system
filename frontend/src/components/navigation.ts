import { Activity, LayoutDashboard, type LucideIcon } from 'lucide-react'

type MainMenuItem = {
  label: string
  to: string
  icon: LucideIcon
}

export const mainMenuItems: readonly MainMenuItem[] = [
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Project',
    to: '/about',
    icon: LayoutDashboard,
  },
  {
    label: 'Query demo',
    to: '/demo/tanstack-query',
    icon: Activity,
  },
] as const
