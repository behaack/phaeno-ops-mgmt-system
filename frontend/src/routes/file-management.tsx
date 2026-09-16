import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/file-management')({
  beforeLoad: () => {
    throw redirect({ to: '/order-configuration', search: { configurationSection: 'retention' }, replace: true })
  },
})
