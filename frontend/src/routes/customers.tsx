import { validateCrmNavigationSearch } from '#/features/crm/CrmListNavigation'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/customers')({
  validateSearch: validateCrmNavigationSearch,
  beforeLoad: ({ location, search }) => {
    if (location.pathname.replace(/\/$/, '') === '/customers') {
      throw redirect({ to: '/crm/requests', search, hash: location.hash, replace: true })
    }
  },
  component: Outlet,
})
