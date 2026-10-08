import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/trial-projects/configuration')({
  beforeLoad: () => { throw redirect({ to: '/order-configuration', search: { configurationSection: 'trials' }, replace: true }) },
})
