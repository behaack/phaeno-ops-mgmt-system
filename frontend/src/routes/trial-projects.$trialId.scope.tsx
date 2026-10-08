import { createFileRoute, redirect } from '@tanstack/react-router'
export const Route = createFileRoute('/trial-projects/$trialId/scope')({ beforeLoad: ({ params, search }) => { throw redirect({ to: '/order-operations/lab-services/trials/$trialId/scope', params, search, replace: true }) } })
