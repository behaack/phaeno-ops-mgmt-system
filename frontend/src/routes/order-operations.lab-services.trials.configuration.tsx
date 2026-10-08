import { createFileRoute, redirect } from '@tanstack/react-router'
export const Route = createFileRoute('/order-operations/lab-services/trials/configuration')({ beforeLoad: () => { throw redirect({ to: '/order-configuration', search: { configurationSection: 'trials' }, replace: true }) } })
